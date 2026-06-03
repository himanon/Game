/* Download a CC0 reddish ground PBR set from ambientCG for the space (Mars) terrain.
   ambientCG serves 1K-JPG zips via a 302 to a CDN; a plain HTTPS GET (following redirects) works.
   Usage: node tools/fetchmars.cjs [AssetId]      (default Ground037)
   Extracts *_Color.jpg + *_NormalGL.jpg into assets/textures/space/ as mars_color/mars_normal.jpg.
   CC0 1.0 (public domain) — ambientcg.com. */
const fs=require('fs'), https=require('https'), { execSync }=require('child_process');
const ID=process.argv[2]||'Ground025';
const URL=`https://ambientcg.com/get?file=${ID}_1K-JPG.zip`;
const TMP='/tmp/marspack', ZIP=TMP+'/pack.zip', DST='/home/user/Game/assets/textures/space';
fs.mkdirSync(TMP,{recursive:true});
function get(url,dest,redirs=0){ return new Promise((res,rej)=>{
  https.get(url,{headers:{'User-Agent':'Mozilla/5.0'}},r=>{
    if([301,302,303,307,308].includes(r.statusCode)&&r.headers.location&&redirs<5){ r.resume(); return res(get(r.headers.location,dest,redirs+1)); }
    if(r.statusCode!==200) return rej(new Error('HTTP '+r.statusCode));
    const f=fs.createWriteStream(dest); r.pipe(f); f.on('finish',()=>f.close(()=>res(dest))); f.on('error',rej);
  }).on('error',rej);
}); }
(async()=>{
  console.log('downloading ambientCG',ID,'(CC0)...');
  await get(URL,ZIP); console.log('saved',Math.round(fs.statSync(ZIP).size/1024)+'kb');
  execSync(`rm -rf ${TMP}/x && unzip -o -q ${ZIP} -d ${TMP}/x`);
  const files=fs.readdirSync(TMP+'/x');
  const color=files.find(f=>/_Color\.jpg$/i.test(f)), nrm=files.find(f=>/_NormalGL\.jpg$/i.test(f));
  if(!color||!nrm){ console.error('FAIL: missing maps in',files); process.exit(1); }
  fs.copyFileSync(TMP+'/x/'+color, DST+'/mars_color.jpg');
  fs.copyFileSync(TMP+'/x/'+nrm,   DST+'/mars_normal.jpg');
  console.log('installed mars_color.jpg <-',color,'|',Math.round(fs.statSync(DST+'/mars_color.jpg').size/1024)+'kb');
  console.log('installed mars_normal.jpg <-',nrm,'|',Math.round(fs.statSync(DST+'/mars_normal.jpg').size/1024)+'kb');
})().catch(e=>{console.error('FAIL',e.message);process.exit(1);});
