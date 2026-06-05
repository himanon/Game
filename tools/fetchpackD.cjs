/* Fetch CC0 Kenney kits for ocean + ruins pillar caps and curate the chosen GLBs into the repo.
   Kenney asset pages embed a direct .zip link (no session gate), so we scrape the page HTML for it,
   GET the zip, unzip, and copy the curated model subset.
   Run: node tools/fetchpackD.cjs */
const https=require('https'), fs=require('fs'), { execSync }=require('child_process');
const PACKS={
  ocean: { slug:'pirate-kit',    dst:'assets/models/ocean', pick:['chest','barrel','bottle-large','rocks-c','ship-wreck','ship-pirate-large','rocks-a','rocks-b','rocks-sand-a','rocks-sand-b','crate','crate-bottles','cannon','cannon-ball','mast'] },
  ruins: { slug:'graveyard-kit', dst:'assets/models/ruins', pick:[
    'pillar-obelisk','urn-round','pillar-square','gravestone-decorative',
    'column-large','pillar-large','stone-wall','stone-wall-damaged','brick-wall-curve',
    'gravestone-cross','crypt-large','debris','iron-fence','pine-crooked','rocks'
  ] },
};
function getHTML(url,redirs=0){ return new Promise((res,rej)=>{ https.get(url,{headers:{'User-Agent':'Mozilla/5.0'}},r=>{
  if([301,302,303,307,308].includes(r.statusCode)&&r.headers.location&&redirs<5){ r.resume(); return res(getHTML(r.headers.location,redirs+1)); }
  let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(d)); }).on('error',rej); }); }
function get(url,dest,redirs=0){ return new Promise((res,rej)=>{ https.get(url,{headers:{'User-Agent':'Mozilla/5.0'}},r=>{
  if([301,302,303,307,308].includes(r.statusCode)&&r.headers.location&&redirs<5){ r.resume(); return res(get(r.headers.location,dest,redirs+1)); }
  if(r.statusCode!==200) return rej(new Error('HTTP '+r.statusCode));
  const f=fs.createWriteStream(dest); r.pipe(f); f.on('finish',()=>f.close(()=>res(dest))); f.on('error',rej); }).on('error',rej); }); }
(async()=>{ for(const [theme,cfg] of Object.entries(PACKS)){
  const html=await getHTML('https://kenney.nl/assets/'+cfg.slug);
  const zip=[...html.matchAll(/https:\/\/kenney\.nl\/media\/pages\/assets\/[^"'\\]+\.zip/g)].map(m=>m[0])[0];
  if(!zip){ console.error('FAIL: no zip link for',cfg.slug); process.exit(1); }
  const tmp='/tmp/kp/'+theme; fs.mkdirSync(tmp,{recursive:true});
  console.log(theme,'<-',zip); await get(zip, tmp+'.zip');
  execSync(`rm -rf ${tmp}/x && unzip -o -q ${tmp}.zip -d ${tmp}/x`);
  fs.mkdirSync(cfg.dst+'/Textures',{recursive:true});
  // these Kenney GLBs reference a shared external atlas ("uri":"Textures/colormap.png"); ship it alongside
  const atlas=execSync(`find ${tmp}/x -ipath '*GLB format*' -iname colormap.png | head -1`).toString().trim();
  if(atlas) fs.copyFileSync(atlas, cfg.dst+'/Textures/colormap.png');
  for(const name of cfg.pick){ const src=execSync(`find ${tmp}/x -ipath '*GLB format*' -iname "${name}.glb" | head -1`).toString().trim();
    if(!src){ console.error('  missing',name); continue; } fs.copyFileSync(src, cfg.dst+'/'+name+'.glb'); console.log('  +',name+'.glb'); }
} console.log('done'); })().catch(e=>{ console.error('FAIL',e.message); process.exit(1); });
