import test from 'node:test';import assert from 'node:assert/strict';import {normalizeUrl,makePerson,profileFit,scheduleCycle,rankingsFor,rulesTurn,canonicalTopic,activityUtility}from'../server/domain';import {identityMatches,parseInstagram,parseLinkedin,linkedinEvidence}from'../server/sources';import type {Person,DateSession,Evidence}from'../src/types';
const ev=(id:string,text:string,platform:'linkedin'|'instagram'='linkedin'):Evidence=>({id,text,platform,url:platform==='linkedin'?'https://www.linkedin.com/in/alex-sample/':'https://www.instagram.com/alexsample/',kind:'bio',retrievedAt:'2026-09-29T00:00:00Z'});
function person(id:string,labels=['Writing']):Person{const p=makePerson({id,name:id,linkedinUrl:'https://www.linkedin.com/in/alex-sample/',instagramUrl:'https://www.instagram.com/alexsample/',evidence:[ev(id+'-li','I am a writer'),ev(id+'-ig','I write stories','instagram')],publicVerified:true,identityVerified:true,identityNote:'Test fixture'});p.traits=labels.map(label=>({label,category:'interest',status:'observed',confidence:'high',evidenceIds:[id+'-'+label.toLowerCase()]}));return p;}
test('only exact public profile hosts and paths are accepted',()=>{assert.equal(normalizeUrl('https://in.linkedin.com/in/alex-sample/?trk=foo','linkedin'),'https://www.linkedin.com/in/alex-sample/');for(const value of ['http://instagram.com/alex','https://instagram.com.evil.test/alex','https://user:pass@instagram.com/alex','https://instagram.com:88/alex','https://instagram.com/p/123','https://127.0.0.1/a'])assert.throws(()=>normalizeUrl(value,'instagram'));assert.throws(()=>normalizeUrl('https://www.linkedin.com/company/example','linkedin'))});
test('incidental keywords remain tentative content interests',()=>{const p=makePerson({id:'example',name:'Example',linkedinUrl:'https://www.linkedin.com/in/example/',instagramUrl:'https://www.instagram.com/example/',evidence:[ev('x','I interviewed a chef about cooking. I do not cook.')],publicVerified:false,identityVerified:false,identityNote:''});assert.equal(p.status,'incomplete');assert.equal(p.traits[0].category,'interest');assert.equal(p.traits[0].status,'tentative')});
test('scoring resists duplicate traits and keeps directionality',()=>{const a=person('a',['Art']),b=person('b',['Art','Art','Art','Art']);assert.ok(profileFit(a,b).score<=100);assert.equal(profileFit(a,b).shared.length,1);const c=person('c',['Art','Writing','Food']);assert.notEqual(profileFit(a,c).score,profileFit(c,a).score)});
test('cycle covers all 25 people twice without self or duplicate pairs',()=>{const ps=Array.from({length:25},(_,i)=>person('p'+i));const pairs=scheduleCycle(ps);assert.equal(pairs.length,25);assert.equal(new Set(pairs.map(x=>[...x].sort().join(':'))).size,25);for(const p of ps)assert.equal(pairs.filter(x=>x.includes(p.id)).length,2);for(const[a,b]of pairs)assert.notEqual(a,b)});
test('rankings include all other people, mark undated comparisons, and exclude self',()=>{const people=Array.from({length:25},(_,i)=>person('p'+i));const ranks=rankingsFor(people[0],people,[]);assert.equal(ranks.length,24);assert.equal(new Set(ranks.map(r=>r.personId)).size,24);assert.ok(ranks.every(r=>r.personId!=='p0'&&r.dateCount===0&&!r.dateId));assert.deepEqual(ranks.map(r=>r.rank),Array.from({length:24},(_,i)=>i+1))});
test('a matching pathname on an unrelated domain cannot verify identity',()=>{const a={name:'Alice Example',url:'https://www.linkedin.com/in/alice-example/',rawText:'https://my.design/design',evidence:[],publicVerified:true};const b={name:'Bob Other',url:'https://www.instagram.com/design/',rawText:'Artist',evidence:[],publicVerified:true};assert.equal(identityMatches(a,b),false);a.rawText='My Instagram is https://www.instagram.com/design/';assert.equal(identityMatches(a,b),true)});
test('public Instagram requires matching owner and explicit privacy evidence',()=>{const context={context:{full_name:'Alex Sample',graphql_media:[{shortcode_media:{shortcode:'test1',owner:{username:'alexsample',is_private:false},edge_media_to_caption:{edges:[{node:{text:'I enjoy photography.'}}]}}}]}};const embed='"contextJSON":'+JSON.stringify(JSON.stringify(context));assert.equal(parseInstagram('',embed,'https://www.instagram.com/alexsample/').publicVerified,true);assert.equal(parseInstagram('<meta name="description" content="A readable biography for Alex">','','https://www.instagram.com/alexsample/').publicVerified,false);context.context.graphql_media[0].shortcode_media.owner.is_private=true;assert.throws(()=>parseInstagram('','"contextJSON":'+JSON.stringify(JSON.stringify(context)),'https://www.instagram.com/alexsample/'),/private/)});
test('a negotiated music proposal cites music evidence',()=>{const a=person('a',['Music']),b=person('b',['Writing','Music']);const d:DateSession={id:'x',aId:a.id,bId:b.id,scenario:'First coffee',status:'running',messages:[{id:'m1',personId:a.id,text:'An acoustic set?',stage:'Opening',evidenceIds:[],createdAt:'',proposal:'music'}],assessments:[],stage:1,engine:'grounded-rules',createdAt:'',updatedAt:'',demo:false,version:1};const turn=rulesTurn(d,a,b);assert.equal(turn.proposal,'music');assert.ok(turn.evidenceIds.includes('b-music'))});
test('LinkedIn extraction preserves short headlines and the person’s own experience',()=>{
 const url='https://www.linkedin.com/in/alex-sample/';
 const evidence=linkedinEvidence({headline:'Free Human',about:'',experience:[{position:'Photographer',companyName:'Independent studio',description:'Travel portraits and visual storytelling.'}],email:'not-a-profile-source@example.test',recommendedProfiles:[{description:'Not this person’s interests'}]},url);
 assert.equal(evidence[0].text,'Free Human');
 assert.equal(evidence[1].text,'Photographer. Independent studio. Travel portraits and visual storytelling.');
 assert.equal(evidence[1].kind,'experience');
 assert.ok(evidence.every(e=>e.platform==='linkedin'&&e.url===url&&e.access==='apify'));
 assert.ok(!JSON.stringify(evidence).includes('not-a-profile-source'));
 assert.ok(!JSON.stringify(evidence).includes('Not this person'));
});
test('LinkedIn short structured profiles remain readable without a fabricated description',()=>{
 const html='<script type="application/ld+json">'+JSON.stringify({'@type':['Person'],name:'Alex Sample',description:'Free Human',jobTitle:'Photographer',worksFor:{name:'Independent studio'}})+'</script>';
 const result=parseLinkedin(html,'https://www.linkedin.com/in/alex-sample/');
 assert.equal(result.name,'Alex Sample');assert.equal(result.evidence.length,2);
 assert.ok(result.evidence.every(e=>e.access==='direct'));
 assert.throws(()=>parseLinkedin('<title>LinkedIn</title><meta name="description" content="Sign in">','https://www.linkedin.com/in/alex-sample/'),/readable public profile/);
});
test('equivalent model topic labels compare without changing display labels or evidence',()=>{
 for(const[label,expected]of [['Content Creation','Storytelling'],['Digital Content Creation','Storytelling'],['Visual Storytelling','Photography'],['UX Design','Design'],['Design (Graphic & UI/UX)','Design'],['Long‑term Investing','Finance']])assert.equal(canonicalTopic(label),expected);
 const a=person('a',['Content Creation','Visual Storytelling','UX Design']);const b=person('b',['Storytelling','Photography','Design']);const snapshot=JSON.stringify(a.traits);
 assert.deepEqual(profileFit(a,b).shared,['Storytelling','Photography','Design']);
 assert.equal(profileFit(a,b).score,90);assert.equal(JSON.stringify(a.traits),snapshot);
 assert.equal(activityUtility(a,'gallery'),6);
});
test('topic synonyms and capitalization cannot multiply the score or activity utility',()=>{
 const a=person('a',['Photography']);const b=person('b',['Photography','photography','Visual Storytelling','Travel Photography']);const one=person('one',['Photography']);
 assert.deepEqual(profileFit(a,b),profileFit(a,one));
 assert.equal(activityUtility(b,'gallery'),activityUtility(one,'gallery'));
 assert.equal(activityUtility(b,'unknown-activity'),0);
 assert.equal(canonicalTopic('Food Photography'),'Photography');
});
test('specific shared interests outrank broad career overlap for a mixed profile',()=>{
 const a=person('a',['Technology','Photography','Travel']);const workOnly=person('work',['Technology']);const interests=person('interests',['Visual Storytelling','Travel/Local Exploration']);
 assert.ok(profileFit(a,interests).score>profileFit(a,workOnly).score);
 assert.ok(profileFit(person('tech-a',['Technology']),person('tech-b',['AI'])).score<=68);
});
test('a canonical activity match keeps the original trait citation',()=>{
 const a=person('a',['Art']),b=person('b',['UX Design']);
 const d:DateSession={id:'canonical-date',aId:a.id,bId:b.id,scenario:'First coffee',status:'running',messages:[{id:'m1',personId:a.id,text:'A gallery?',stage:'Opening',evidenceIds:[],createdAt:'',proposal:'gallery'}],assessments:[],stage:1,engine:'grounded-rules',createdAt:'',updatedAt:'',demo:false,version:1};
 const turn=rulesTurn(d,a,b);assert.equal(turn.proposal,'gallery');assert.ok(turn.text.includes('ux design'));assert.ok(turn.evidenceIds.includes('b-ux design'));
});
test('saved conversations retain their delta when the profile scoring rubric changes',()=>{
 const a=person('a',['Photography']),b=person('b',['Visual Storytelling']);
 const date:DateSession={id:'saved',aId:a.id,bId:b.id,scenario:'First coffee',status:'complete',messages:[],assessments:[{personId:a.id,score:41,delta:7,decision:'explore',reasons:['A responsive exchange.'],unknowns:[],evidenceIds:[]}],stage:6,engine:'groq',createdAt:'',updatedAt:'2026-09-29',demo:true,version:6};
 const ranking=rankingsFor(a,[a,b],[date])[0];
 assert.equal(ranking.baseScore,90);assert.equal(ranking.score,97);assert.equal(ranking.dateDelta,7);assert.equal(ranking.dateId,'saved');
});
