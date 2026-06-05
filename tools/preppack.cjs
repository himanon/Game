/* Curate + optimize a subset of the Quaternius "Stylized Nature MegaKit" (CC0) glTF models
   for the game. Copies chosen {model}.gltf + its .bin, auto-collects referenced textures,
   and downscales the (very large) atlases via a headless-canvas resize so the shipped
   payload stays small. Source pack lives in /tmp/pack/x/glTF (downloaded by fetchpack).
   Run: node tools/preppack.cjs   ->  assets/models/nature/ */
const fs=require('fs'), path=require('path');
const { chromium }=require('/opt/node22/lib/node_modules/playwright');
const SRC='/tmp/pack/x/glTF';
const DEST=path.join(__dirname,'..','assets','models','nature');
fs.mkdirSync(DEST,{recursive:true});

const CHOSEN=[
  'CommonTree_1','CommonTree_3','Pine_2',
  'Bush_Common_Flowers','Fern_1','Plant_1','Plant_1_Big','Mushroom_Common',
  'Rock_Medium_1','Rock_Medium_2','Pebble_Round_1','Pebble_Round_3'
];
// max texture dimension per kind (normal maps + huge bark can be small; they're distant)
const sizeFor=name=> /_Normal\.png$/i.test(name) ? 256 : 512;   // distant scenery: 512 atlases, 256 normals

(async()=>{
  const texSet=new Set();
  // copy gltf + bin, collect textures
  for(const m of CHOSEN){
    const gp=path.join(SRC,m+'.gltf');
    if(!fs.existsSync(gp)){ console.log('MISSING',m); continue; }
    const j=JSON.parse(fs.readFileSync(gp));
    fs.copyFileSync(gp, path.join(DEST,m+'.gltf'));
    for(const b of (j.buffers||[])) if(b.uri && !b.uri.startsWith('data:')) fs.copyFileSync(path.join(SRC,b.uri), path.join(DEST,b.uri));
    for(const im of (j.images||[])) if(im.uri) texSet.add(im.uri);
  }
  console.log('models:',CHOSEN.length,'| unique textures:',texSet.size);

  // downscale textures via headless canvas
  const br=await chromium.launch(); const pg=await br.newPage();
  await pg.setContent('<canvas id=c></canvas>');
  for(const tex of texSet){
    const sp=path.join(SRC,tex); if(!fs.existsSync(sp)){ console.log('  tex missing',tex); continue; }
    const max=sizeFor(tex);
    const b64='data:image/png;base64,'+fs.readFileSync(sp).toString('base64');
    const out=await pg.evaluate(async({b64,max})=>{
      const img=await new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.src=b64;});
      const scale=Math.min(1, max/Math.max(img.width,img.height));
      const w=Math.max(1,Math.round(img.width*scale)), h=Math.max(1,Math.round(img.height*scale));
      const c=document.getElementById('c'); c.width=w; c.height=h;
      const x=c.getContext('2d'); x.imageSmoothingQuality='high'; x.drawImage(img,0,0,w,h);
      return { url:c.toDataURL('image/png'), w, h };
    },{b64,max});
    const buf=Buffer.from(out.url.split(',')[1],'base64');
    fs.writeFileSync(path.join(DEST,tex), buf);
    console.log('  tex',tex,'->',out.w+'x'+out.h, Math.round(buf.length/1024)+'kb');
  }
  await br.close();

  // license/attribution
  fs.writeFileSync(path.join(DEST,'CREDITS.txt'),
`Stylized Nature MegaKit (FREE/Standard) by Quaternius
License: CC0 1.0 Universal (Public Domain) - https://creativecommons.org/publicdomain/zero/1.0/
Source: https://quaternius.com  |  Support: https://www.patreon.com/quaternius
Curated subset; textures downscaled for web. Only the glTF variants are used.
`);
  const total=fs.readdirSync(DEST).reduce((s,f)=>s+fs.statSync(path.join(DEST,f)).size,0);
  console.log('DEST total', Math.round(total/1024)+'kb  ('+fs.readdirSync(DEST).length+' files)');
})().catch(e=>{console.error('FAIL',e);process.exit(1);});
