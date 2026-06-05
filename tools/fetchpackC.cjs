/* Download a CC0 space asset pack for the space theme. Kenney's "Space Kit" is CC0 and
   served as a single direct zip (no session gate), so a plain HTTPS GET works (unlike the
   file.kiwi packs which needed Playwright). Saves to /tmp/packC/pack.zip.
   Run: node tools/fetchpackC.cjs
   Then: unzip -o /tmp/packC/pack.zip -d /tmp/packC/x   (inspect Models/GLTF + License.txt)
         node tools/preppackC.cjs */
const fs=require('fs'), https=require('https');
const URL='https://kenney.nl/media/pages/assets/space-kit/20874c75ac-1677698978/kenney_space-kit.zip'; // CC0
const OUT='/tmp/packC/pack.zip';
fs.mkdirSync('/tmp/packC',{recursive:true});
function get(url,dest,redirs=0){ return new Promise((res,rej)=>{
  https.get(url,{headers:{'User-Agent':'Mozilla/5.0'}},r=>{
    if([301,302,303,307,308].includes(r.statusCode)&&r.headers.location&&redirs<5){ r.resume(); return res(get(r.headers.location,dest,redirs+1)); }
    if(r.statusCode!==200) return rej(new Error('HTTP '+r.statusCode));
    const f=fs.createWriteStream(dest); r.pipe(f); f.on('finish',()=>f.close(()=>res(dest))); f.on('error',rej);
  }).on('error',rej);
}); }
(async()=>{ console.log('downloading Kenney Space Kit (CC0)...');
  await get(URL,OUT); console.log('saved',OUT, Math.round(fs.statSync(OUT).size/1024)+'kb');
})().catch(e=>{console.error('FAIL',e.message);process.exit(1);});
