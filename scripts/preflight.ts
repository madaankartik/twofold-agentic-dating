import 'dotenv/config';
import dotenv from 'dotenv';dotenv.config({path:'.env.local',quiet:true});
const env=process.env;
const checks=await Promise.allSettled([
 fetch('https://api.apify.com/v2/users/me',{headers:{Authorization:`Bearer ${env.APIFY_TOKEN}`}}).then(async r=>({service:'Apify',status:r.status,ok:r.ok})),
 fetch('https://api.groq.com/openai/v1/models',{headers:{Authorization:`Bearer ${env.GROQ_API_KEY}`}}).then(async r=>({service:'Groq',status:r.status,models:((await r.json()) as any).data?.map((x:any)=>x.id).filter((x:string)=>/gpt-oss|llama-3.3/.test(x))}))
]);console.log(JSON.stringify(checks));
