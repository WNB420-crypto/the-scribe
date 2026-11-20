// The Scribe — static host + Stripe unlock verification (no dependencies)
const http=require("http"),fs=require("fs"),path=require("path"),crypto=require("crypto"),https=require("https");
const PORT=process.env.PORT||8080,ROOT=path.join(__dirname,"public");
const SECRET=process.env.UNLOCK_SECRET||"change-me",SK=process.env.STRIPE_SECRET_KEY||"";
const CODES=(process.env.UNLOCK_CODES||"").split(",").map(s=>s.trim().toUpperCase()).filter(Boolean);
const TYPES={".html":"text/html; charset=utf-8",".js":"application/javascript",".css":"text/css",".json":"application/json",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".mp3":"audio/mpeg",".mp4":"video/mp4",".svg":"image/svg+xml",".ico":"image/x-icon",".webmanifest":"application/manifest+json"};
const sign=id=>id+"."+crypto.createHmac("sha256",SECRET).update(id).digest("hex").slice(0,32);
const valid=t=>{if(typeof t!=="string"||t.indexOf(".")<0)return false;const id=t.slice(0,t.lastIndexOf("."));const a=Buffer.from(sign(id)),b=Buffer.from(t);return a.length===b.length&&crypto.timingSafeEqual(a,b)};
function json(res,code,obj){res.writeHead(code,{"Content-Type":"application/json","Cache-Control":"no-store"});res.end(JSON.stringify(obj))}
function body(req){return new Promise(r=>{let d="";req.on("data",c=>{d+=c;if(d.length>4096)req.destroy()});req.on("end",()=>{try{r(JSON.parse(d||"{}"))}catch(e){r({})}})})}
function stripeSession(id){return new Promise(r=>{if(!SK||!/^cs_[A-Za-z0-9_]+$/.test(id))return r(null);
  https.get({host:"api.stripe.com",path:"/v1/checkout/sessions/"+encodeURIComponent(id),headers:{Authorization:"Bearer "+SK}},res=>{let d="";res.on("data",c=>d+=c);res.on("end",()=>{try{r(JSON.parse(d))}catch(e){r(null)}})}).on("error",()=>r(null))})}
http.createServer(async(req,res)=>{
  const u=new URL(req.url,"http://x");
  if(u.pathname==="/api/health"){if(!SK)return json(res,200,{server:"ok",stripeKey:"missing"});
    return https.get({host:"api.stripe.com",path:"/v1/checkout/sessions?limit=1",headers:{Authorization:"Bearer "+SK}},r=>{r.resume();json(res,200,{server:"ok",stripeKey:r.statusCode===200?"working":"rejected ("+r.statusCode+")",paymentLink:!!process.env.PAYMENT_LINK})}).on("error",()=>json(res,200,{server:"ok",stripeKey:"unreachable"}))}
  if(u.pathname==="/api/config")return json(res,200,{paywall:true,freeChapters:+(process.env.FREE_CHAPTERS||3),paymentLink:process.env.PAYMENT_LINK||"",price:process.env.PRICE_LABEL||"$4.99"});
  if(req.method==="POST"&&u.pathname==="/api/verify"){const b=await body(req);
    if(b.code){const c=String(b.code).trim().toUpperCase();return CODES.includes(c)?json(res,200,{ok:true,token:sign("code_"+c)}):json(res,200,{ok:false,error:"That code isn't valid."})}
    const s=await stripeSession(String(b.session_id||""));
    if(s&&s.payment_status==="paid")return json(res,200,{ok:true,token:sign(s.id)});
    return json(res,200,{ok:false,error:"We couldn't confirm that payment yet."})}
  if(req.method==="POST"&&u.pathname==="/api/check"){const b=await body(req);return json(res,200,{ok:valid(b.token)})}
  let p=decodeURIComponent(u.pathname);if(p==="/")p="/index.html";
  const f=path.normalize(path.join(ROOT,p));if(!f.startsWith(ROOT))return json(res,403,{error:"forbidden"});
  fs.stat(f,(e,st)=>{if(e||!st.isFile()){res.writeHead(404);return res.end("Not found")}
    const ext=path.extname(f).toLowerCase();res.writeHead(200,{"Content-Type":TYPES[ext]||"application/octet-stream","Content-Length":st.size,"Cache-Control":ext===".html"?"no-cache":"public, max-age=604800"});
    fs.createReadStream(f).pipe(res)})
}).listen(PORT,()=>console.log("The Scribe on :"+PORT));
