/* Render per-category contact sheets of the Poly Pizza candidates downloaded by fetchpackE.cjs,
   so the curator can eyeball quality before picking. Reads /tmp/pp/manifest.json.
   Run: node tools/thumbsE.cjs  -> /tmp/pp/sheets/<category>.png */
const fs=require('fs'), http=require('http'), path=require('path');
const { chromium }=require('/opt/node22/lib/node_modules/playwright');
const man=JSON.parse(fs.readFileSync('/tmp/pp/manifest.json','utf8'));
const OUT='/tmp/pp/sheets'; fs.mkdirSync(OUT,{recursive:true});
const cats={}; for(const m of man){ (cats[m.query]=cats[m.query]||[]).push(m); }

const page=`<!doctype html><html><head><meta charset=utf8>
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/"}}</script>
</head><body><canvas id=sheet></canvas><canvas id=cell width=220 height=220></canvas><script type=module>
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const cell=document.getElementById('cell');
const r=new THREE.WebGLRenderer({canvas:cell,antialias:true,alpha:true}); r.setSize(220,220);
const sc=new THREE.Scene(); const cam=new THREE.PerspectiveCamera(40,1,0.01,1000);
sc.add(new THREE.AmbientLight(0xffffff,0.9)); const d=new THREE.DirectionalLight(0xffffff,1.6); d.position.set(3,6,4); sc.add(d);
const loader=new GLTFLoader();
function renderModel(file){ return new Promise((res)=>{ loader.load(file, g=>{
  while(sc.children.length>2) sc.remove(sc.children[2]);
  const box=new THREE.Box3().setFromObject(g.scene), s=new THREE.Vector3(), c0=new THREE.Vector3();
  box.getSize(s); box.getCenter(c0); g.scene.position.sub(c0); sc.add(g.scene);
  const rad=Math.max(s.x,s.y,s.z)||1; cam.position.set(rad*1.5,rad*1.1,rad*1.8); cam.lookAt(0,0,0);
  r.render(sc,cam); requestAnimationFrame(()=>{ r.render(sc,cam); res(true); });
}, undefined, e=>res(false)); }); }
window.renderSheet=async(items)=>{
  const cols=4, cw=240, ch=265, rows=Math.ceil(items.length/cols);
  const sheet=document.getElementById('sheet'); sheet.width=cols*cw; sheet.height=rows*ch;
  const x=sheet.getContext('2d'); x.fillStyle='#15202b'; x.fillRect(0,0,sheet.width,sheet.height);
  for(let i=0;i<items.length;i++){ const it=items[i]; const ok=await renderModel(it.file.replace('/tmp/pp/',''));
    const cx=(i%cols)*cw+10, cy=((i/cols)|0)*ch+8;
    if(ok) x.drawImage(cell,cx,cy,220,220);
    x.fillStyle=it.license==='CC0'?'#7fff9f':'#ffd27f'; x.font='13px sans-serif';
    x.fillText(it.id+'  ['+it.license+']',cx,cy+236);
    x.fillStyle='#cfe'; x.font='12px sans-serif';
    x.fillText((it.title+' / '+(it.author||'?')).slice(0,34),cx,cy+252);
    x.fillText(((it.bytes/1024|0)+'KB'),cx,cy+264);
  }
  return sheet.toDataURL('image/png');
};
window.__ready=true;
</script></body></html>`;
const srv=http.createServer((req,rq)=>{ let p=decodeURIComponent(req.url.split('?')[0]);
  if(p==='/'){ rq.writeHead(200,{'content-type':'text/html'}); return rq.end(page); }
  const fp='/tmp/pp'+p; if(fs.existsSync(fp)){ rq.writeHead(200); return rq.end(fs.readFileSync(fp)); } rq.writeHead(404); rq.end('no'); });
(async()=>{ await new Promise(r=>srv.listen(8736,r));
  const br=await chromium.launch({args:['--ignore-certificate-errors','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const pg=await (await br.newContext({ignoreHTTPSErrors:true})).newPage();
  pg.on('console',m=>{ if(m.type()==='error') console.log('  cerr',m.text().slice(0,80)); });
  await pg.goto('http://localhost:8736/',{waitUntil:'networkidle'}); await pg.waitForFunction('window.__ready===true');
  for(const [cat,items] of Object.entries(cats)){
    // de-dup by id within a category
    const uniq=[...new Map(items.map(m=>[m.id,m])).values()];
    const data=await pg.evaluate(its=>window.renderSheet(its), uniq.map(m=>({id:m.id,file:m.file,title:m.title,author:m.author,license:m.license,bytes:m.bytes})));
    fs.writeFileSync(path.join(OUT,cat.replace(/\s+/g,'_')+'.png'), Buffer.from(data.split(',')[1],'base64'));
    console.log('sheet',cat,uniq.length);
  }
  await br.close(); srv.close(); console.log('done',OUT);
})().catch(e=>{console.error(e);process.exit(1);});
