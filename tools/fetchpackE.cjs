/* Fetch low-poly underwater GLBs from Poly Pizza (poly.pizza) for the ocean theme's reef life.
   Poly Pizza model pages embed the direct CDN url (static.poly.pizza/<uuid>.glb) plus the title,
   author and license in og/meta tags. No API key is needed for the public model pages or the CDN.
   Most models are CC-BY (attribution REQUIRED) or CC0 — we record name/author/license per model.

   Two modes:
     node tools/fetchpackE.cjs discover   -> search each query, resolve+download candidates to
                                             /tmp/pp/<query>/<id>.glb, write /tmp/pp/manifest.json
     node tools/fetchpackE.cjs curate     -> copy the chosen ids (CURATED below) into
                                             assets/models/ocean-life/<key>.glb + CREDITS.txt
   Run discover first, thumbnail /tmp/pp via tools/thumbsE.cjs, fill in CURATED, then run curate. */
const https=require('https'), fs=require('fs'), path=require('path');

// broad discovery queries -> how many top hits to pull per query
const QUERIES={
  coral:8, 'brain coral':5, 'coral reef':5, 'sea anemone':6, kelp:6, seaweed:6,
  'tropical fish':8, fish:6, 'sea turtle':5, shark:5, stingray:5, 'manta ray':4,
  starfish:5, 'giant clam':4, seashell:4, 'sea sponge':4,
};

// filled in after eyeballing thumbnails from `discover`. key -> poly.pizza model id.
const CURATED={
  // corals — colony columns + reef gardens (mixed species/colours)
  coralFan:'0CrDBiCnI5e',     // pink sea fan (CC0)
  coralTube:'7Cs3rTEcpcD',    // purple tube cluster (CC-BY)
  coralStag:'4KUXdtDdgHR',    // red staghorn on stump (CC-BY)
  coralFinger:'3HEc6LvqCJd',  // yellow finger coral (CC-BY)
  coralPlate:'8UNN578byC0',   // purple plate/brain coral — cap crown (CC-BY)
  anemone:'1FMGb52XdD-',      // pink anemone (CC-BY)
  // kelp / plants
  kelpGreen:'4cFllH6Iazk',    // leafy green kelp (CC-BY)
  kelpRibbon:'461xlaa6SZW',   // teal seaweed ribbon (CC-BY)
  // fish (all CC0 — Quaternius/Kenney)
  fishClown:'BEcU9rjiAq', fishTang:'TQaMo8GTJl', fishButterfly:'s2MkBeSzGy',
  fishMandarin:'h6M5zlF5Yx', fishSmall:'HkUAXudvBt',
  // hero creatures
  turtle:'4kQR07PFTq',        // green sea turtle (CC-BY)
  shark:'AyHTK3zUSG',         // shark (CC0, Quaternius)
  manta:'yzD8b7ZHZm',         // manta ray (CC0, Quaternius)
  // seabed detail
  urchin:'f4iwEhEP3-d', seahorse:'3H4CqcG6JGP', crab:'1O5Q4pE8X6e',
};
const DST='assets/models/ocean-life';

function getHTML(url,redirs=0){ return new Promise((res,rej)=>{ https.get(url,{headers:{'User-Agent':'Mozilla/5.0'}},r=>{
  if([301,302,303,307,308].includes(r.statusCode)&&r.headers.location&&redirs<5){ r.resume(); return res(getHTML(new URL(r.headers.location,url).href,redirs+1)); }
  let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(d)); }).on('error',rej); }); }
function get(url,dest,redirs=0){ return new Promise((res,rej)=>{ https.get(url,{headers:{'User-Agent':'Mozilla/5.0'}},r=>{
  if([301,302,303,307,308].includes(r.statusCode)&&r.headers.location&&redirs<5){ r.resume(); return res(get(new URL(r.headers.location,url).href,dest,redirs+1)); }
  if(r.statusCode!==200) return rej(new Error('HTTP '+r.statusCode));
  const f=fs.createWriteStream(dest); r.pipe(f); f.on('finish',()=>f.close(()=>res(dest))); f.on('error',rej); }).on('error',rej); }); }

function meta(html,prop){ const m=html.match(new RegExp('<meta[^>]+(?:property|name)="'+prop+'"[^>]+content="([^"]*)"'))||html.match(new RegExp('content="([^"]*)"[^>]+(?:property|name)="'+prop+'"')); return m?m[1]:''; }
async function resolve(id){
  const html=await getHTML('https://poly.pizza/m/'+id);
  const glb=(html.match(/https:\/\/static\.poly\.pizza\/[a-f0-9-]+\.glb/)||[])[0];
  const title=(meta(html,'og:title')||'').replace(/\s*-\s*Free Model.*$/i,'').trim();
  let author=''; const am=meta(html,'og:title').match(/By\s+(.+?)\s*$/i); if(am) author=am[1].trim();
  // license: look for CC0 / CC-BY hints in the page body
  let lic='CC-BY'; if(/CC0|Creative Commons Zero|Public Domain/i.test(html)) lic='CC0';
  return { id, glb, title, author, license:lic };
}

(async()=>{
  const mode=process.argv[2]||'discover';
  if(mode==='discover'){
    const manifest=[]; fs.mkdirSync('/tmp/pp',{recursive:true});
    for(const [q,n] of Object.entries(QUERIES)){
      let ids=[];
      try{ const s=await getHTML('https://poly.pizza/search/'+encodeURIComponent(q));
        ids=[...new Set([...s.matchAll(/\/m\/([A-Za-z0-9_-]+)/g)].map(m=>m[1]))].slice(0,n); }
      catch(e){ console.error('search fail',q,e.message); continue; }
      const dir='/tmp/pp/'+q.replace(/\s+/g,'_'); fs.mkdirSync(dir,{recursive:true});
      for(const id of ids){
        try{ const r=await resolve(id); if(!r.glb){ console.log('  no glb',id); continue; }
          const dest=dir+'/'+id+'.glb'; await get(r.glb,dest);
          const bytes=fs.statSync(dest).size; manifest.push({...r,query:q,file:dest,bytes});
          console.log(`  ${q}: ${id} ${(bytes/1024|0)}KB  "${r.title}" by ${r.author||'?'} [${r.license}]`);
        }catch(e){ console.log('  fail',id,e.message); }
      }
    }
    fs.writeFileSync('/tmp/pp/manifest.json',JSON.stringify(manifest,null,2));
    console.log('\ndiscovered',manifest.length,'models -> /tmp/pp/manifest.json (run tools/thumbsE.cjs to inspect)');
  } else if(mode==='curate'){
    const man=JSON.parse(fs.readFileSync('/tmp/pp/manifest.json','utf8'));
    const byId=Object.fromEntries(man.map(m=>[m.id,m]));
    fs.mkdirSync(DST,{recursive:true});
    const creds=['Ocean reef life models from Poly Pizza (https://poly.pizza).','Low-poly CC0/CC-BY models; attribution per model below (CC-BY requires it).',''];
    for(const [key,id] of Object.entries(CURATED)){
      const m=byId[id]; if(!m){ console.error('  not in manifest:',key,id); continue; }
      fs.copyFileSync(m.file, DST+'/'+key+'.glb');
      creds.push(`${key}.glb  "${m.title}" by ${m.author||'Unknown'} (${m.license}) — https://poly.pizza/m/${id}`);
      console.log('  +',key+'.glb  <-',id);
    }
    fs.writeFileSync(DST+'/CREDITS.txt',creds.join('\n')+'\n');
    console.log('wrote',DST+'/CREDITS.txt');
  } else { console.error('usage: fetchpackE.cjs discover|curate'); process.exit(1); }
})().catch(e=>{ console.error('FAIL',e.message); process.exit(1); });
