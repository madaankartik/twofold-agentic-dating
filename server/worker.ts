import {app,type Env} from './app';
// Generated only during the build; never includes runtime secrets.
// @ts-ignore
import assets from '../data/assets.generated.json';
export default {async fetch(request:Request,env:Env,ctx:any){const url=new URL(request.url);if(url.pathname.startsWith('/api/'))return app.fetch(request,env,ctx);if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});const asset=(assets as Record<string,{mime:string;body:string}>)[url.pathname==='/'?'/index.html':url.pathname];if(!asset)return new Response('Not found',{status:404});const binary=atob(asset.body);const data=Uint8Array.from(binary,c=>c.charCodeAt(0));return new Response(request.method==='HEAD'?null:data,{headers:{'Content-Type':asset.mime,'Cache-Control':url.pathname.startsWith('/assets/')?'public,max-age=31536000,immutable':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}})}};
