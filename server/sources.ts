import { normalizeUrl } from './domain';
import type { Evidence } from '../src/types';
export type SourceResult={name:string;url:string;evidence:Evidence[];publicVerified:boolean;imageUrl?:string;rawText:string};
const headers={'User-Agent':'Mozilla/5.0','Accept':'text/html,application/xhtml+xml','Accept-Language':'en-US,en;q=0.9'};
const clean=(s:string)=>s.replace(/<[^>]*>/g,' ').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n))).replace(/\s+/g,' ').trim();
function meta(html:string,key:string){const tags=html.match(/<meta\b[^>]*>/gi)||[];const tag=tags.find(t=>new RegExp(`(?:name|property)=["']${key}["']`,'i').test(t));return clean(tag?.match(/content=["']([\s\S]*?)["'](?:\s|\/?>)/i)?.[1]||'')}
const now=()=>new Date().toISOString();
function ev(platform:Evidence['platform'],url:string,text:string,kind:Evidence['kind']):Evidence{return{id:crypto.randomUUID(),platform,url,text:clean(text).slice(0,850),kind,retrievedAt:now(),access:'direct'}}
const sourceText=(value:unknown)=>typeof value==='string'?clean(value):'';
// Keep short but genuine headlines, then read the person's own experience.
// All observations retain the submitted LinkedIn profile as their source.
export function linkedinEvidence(record:Record<string,any>,url:string,access:Evidence['access']='apify'):Evidence[]{
 const evidence:Evidence[]=[];const seen=new Set<string>();
 const add=(value:unknown,kind:Evidence['kind'])=>{const text=sourceText(value);const key=text.toLowerCase();if(!text||seen.has(key))return;seen.add(key);evidence.push({...ev('linkedin',url,text,kind),access});};
 add(record.headline,'bio');
 for(const value of [record.about,record.summary,record.description])add(value,'about');
 const experiences=Array.isArray(record.experience)?record.experience:Array.isArray(record.experiences)?record.experiences:[];
 for(const experience of experiences.slice(0,4)){
  if(!experience||typeof experience!=='object')continue;
  const company=sourceText(experience.companyName)||sourceText(experience.company?.name)||sourceText(experience.company);
  const position=sourceText(experience.position)||sourceText(experience.title)||sourceText(experience.jobTitle);
  add([position,company,sourceText(experience.description)].filter(Boolean).join('. '),'experience');
 }
 const organization=Array.isArray(record.worksFor)?record.worksFor[0]:record.worksFor;
 add([sourceText(record.jobTitle),sourceText(organization?.name)].filter(Boolean).join('. '),'experience');
 return evidence;
}
async function htmlAt(url:string){const r=await fetch(url,{headers,redirect:'error',signal:AbortSignal.timeout(25000)});if(!r.ok)throw new Error(`Source returned ${r.status}. Try again or use the Apify connection.`);const body=await r.text();if(body.length>8_000_000)throw new Error('Source response exceeds the supported size.');return body;}
export function parseInstagram(html:string,embed:string,url:string):SourceResult{
 const handle=new URL(url).pathname.split('/')[1]; const bio=meta(html,'description')||meta(html,'og:description');
 let context:any;try{const m=embed.match(/"contextJSON":("(?:\\.|[^"\\])*")/);if(m)context=JSON.parse(JSON.parse(m[1])).context;}catch{/* A changed source schema is an incomplete extraction. */}
 const media=(context?.graphql_media||[]).map((x:any)=>x.shortcode_media).filter(Boolean);
 const own=media.filter((m:any)=>String(m.owner?.username).toLowerCase()===handle.toLowerCase());
 if(own.some((m:any)=>m.owner?.is_private===true))throw new Error('This Instagram account is private. Only public profiles are supported.');
 const publicVerified=own.some((m:any)=>m.owner?.is_private===false);
 const evidence:Evidence[]=[]; if(bio&&!/log in to instagram|sign up to see photos/i.test(bio))evidence.push(ev('instagram',url,bio,'bio'));
 own.slice(0,4).forEach((m:any)=>{const text=(m.edge_media_to_caption?.edges||[]).map((x:any)=>x.node?.text||'').join(' ');if(text)evidence.push(ev('instagram',`https://www.instagram.com/p/${m.shortcode}/`,text,'post'))});
 if(!evidence.length)throw new Error('Instagram did not return readable profile content. The account may be unavailable or access-limited.');
 const name=context?.full_name||meta(html,'og:title').replace(/\s*\(@.*$/,'').replace(/\s*•.*$/,'')||handle;
 return{name,url,evidence,publicVerified,imageUrl:context?.profile_pic_url,rawText:bio};
}
export function parseLinkedin(html:string,url:string):SourceResult{
 const graphs:any[]=[];for(const match of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{const v=JSON.parse(match[1]);graphs.push(...(Array.isArray(v)?v:v['@graph']||[v]));}catch{}}
 const person=graphs.find(x=>x&&([].concat(x['@type']||[]) as string[]).includes('Person'))||{};const title=meta(html,'og:title')||html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]||'';
 const description=person.description||meta(html,'description')||meta(html,'og:description');
 const name=clean(person.name||title.split(/\s[-|–]\s/)[0]);
 const evidence=linkedinEvidence({...person,description},url,'direct');
 if(!name||/sign in|sign up|join linkedin/i.test(name)||!evidence.length||(!person.name&&sourceText(description).length<35))throw new Error('LinkedIn did not return a readable public profile. Connect Apify or try again later.');
 return {name,url,evidence,publicVerified:true,rawText:evidence.map(e=>e.text).join('\n')};
}
export async function directInstagram(url:string){const normalized=normalizeUrl(url,'instagram');const [html,embed]=await Promise.all([htmlAt(normalized),htmlAt(normalized+'embed/')]);return parseInstagram(html,embed,normalized)}
export async function directLinkedin(url:string){const normalized=normalizeUrl(url,'linkedin');return parseLinkedin(await htmlAt(normalized),normalized)}
export function identityMatches(a:SourceResult,b:SourceResult){
 const tokens=(s:string)=>clean(s).normalize('NFKD').replace(/[^a-zA-Z ]/g,' ').toLowerCase().split(/\s+/).filter(t=>t.length>2&&!['the','official','instagram','linkedin'].includes(t));
 const at=tokens(a.name),bt=tokens(b.name);const common=at.filter(t=>bt.includes(t));
 const crossLink=(text:string,target:string,platform:'linkedin'|'instagram')=>(text.match(/(?:https?:\/\/)?(?:www\.|[a-z]{2}\.)?(?:linkedin\.com|instagram\.com)\/[^\s<>"']+/gi)||[]).some(link=>{try{return normalizeUrl((link.startsWith('http')?'':'https://')+link.replace(/[),.;]+$/,''),platform)===normalizeUrl(target,platform)}catch{return false}});
 if(crossLink(a.rawText,b.url,'instagram')||crossLink(b.rawText,a.url,'linkedin'))return true;
 const handle=new URL(b.url).pathname.replace(/[^a-z]/g,'');const handleMatches=at.length>=2&&at.slice(0,2).every(t=>handle.includes(t));
 const roles=['photograph','design','author','writer','creator','entrepreneur','founder','chef','artist','engineer','speaker','educat','podcast'];
 const sharedRole=roles.some(t=>a.rawText.toLowerCase().includes(t)&&b.rawText.toLowerCase().includes(t));
 return common.length>=2&&(handleMatches||sharedRole);
}
export async function apifyStart(platform:'linkedin'|'instagram',url:string,token:string){const actor=platform==='linkedin'?'harvestapi~linkedin-profile-scraper':'apify~instagram-profile-scraper';const input=platform==='linkedin'?{profileScraperMode:'Profile details no email ($4 per 1k)',urls:[url]}:{usernames:[new URL(url).pathname.split('/')[1]],includeAboutSection:false};const r=await fetch(`https://api.apify.com/v2/acts/${actor}/runs?maxItems=1`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(input),signal:AbortSignal.timeout(20000)});const j:any=await r.json();if(!r.ok)throw new Error(`Apify could not start ${platform}: ${j.error?.message||r.status}`);return j.data.id as string;}
export async function apifyResult(platform:'linkedin'|'instagram',runId:string,url:string,token:string):Promise<SourceResult|null>{const h={Authorization:`Bearer ${token}`};const runResponse=await fetch(`https://api.apify.com/v2/actor-runs/${runId}`,{headers:h,signal:AbortSignal.timeout(20000)});if(!runResponse.ok)throw new Error(`Apify status check failed (${runResponse.status}). Retry later.`);const run:any=await runResponse.json();if(['FAILED','TIMED-OUT','ABORTED'].includes(run.data?.status))throw new Error(`${platform} extraction failed. Please retry.`);if(run.data?.status!=='SUCCEEDED')return null;const datasetResponse=await fetch(`https://api.apify.com/v2/datasets/${run.data.defaultDatasetId}/items?clean=true&limit=1`,{headers:h,signal:AbortSignal.timeout(20000)});if(!datasetResponse.ok)throw new Error(`Apify dataset read failed (${datasetResponse.status}). Retry later.`);const records:any=await datasetResponse.json();const record=records[0];if(!record||record.error)throw new Error(`${platform} returned no readable profile.`);
 if(platform==='instagram'){if(record.private!==false)throw new Error('Instagram must be confirmed public before analysis.');const evidence=[ev(platform,url,record.biography||'','bio'),...(record.latestPosts||[]).filter((p:any)=>!p.ownerUsername||p.ownerUsername.toLowerCase()===record.username.toLowerCase()).slice(0,4).map((p:any)=>ev(platform,p.url||url,p.caption||'','post'))].filter(e=>e.text);return {name:record.fullName||record.username,url,evidence:evidence.map(e=>({...e,access:'apify'})),publicVerified:true,rawText:record.biography||'',imageUrl:record.profilePicUrl};}
 const evidence=linkedinEvidence(record,url);if(!evidence.length)throw new Error('LinkedIn returned no profile text.');const name=sourceText(record.fullName)||[record.firstName,record.lastName].map(sourceText).filter(Boolean).join(' ')||sourceText(record.name);if(!name)throw new Error('LinkedIn returned no profile identity.');return{name,url,evidence,publicVerified:true,rawText:evidence.map(e=>e.text).join('\n')};
}
