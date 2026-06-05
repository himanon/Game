/* Render thumbnails of the staged Kenney Space Kit GLBs (self-contained) so we can pick the
   landmark, pipe structure, and scenery. Serves the stage dir + a three.js page over http.
   Run: node tools/thumbsC.cjs  -> /tmp/packC/thumbs/*.png */
const fs=require('fs'), http=require('http'), path=require('path');
const { chromium }=require('/opt/node22/lib/node_modules/playwright');
const STAGE='/tmp/packC/stage', OUT='/tmp/packC/thumbs'; fs.mkdirSync(OUT,{recursive:true});
const models=fs.readdirSync(STAGE).filter(f=>f.endsWith('.glb')).map(f=>f.replace('.glb',''));
const page=`<!doctype html><html><head><meta charset=utf8>
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/"}}</script>
</head><body><canvas id=c width=320 height=320></canvas><script type=module>
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const r=new THREE.WebGLRenderer({canvas:c,antialias:true,alpha:true}); r.setSize(320,320);
const sc=new THREE.Scene(); const cam=new THREE.PerspectiveCamera(40,1,0.01,1000);
sc.add(new THREE.AmbientLight(0xffffff,0.95)); const d=new THREE.DirectionalLight(0xffffff,1.5); d.position.set(3,6,4); sc.add(d);
const loader=new GLTFLoader();
window.shoot=(name)=>new Promise((res,rej)=>{ loader.load(name+'.glb', g=>{
  while(sc.children.length>2) sc.remove(sc.children[2]);
  const box=new THREE.Box3().setFromObject(g.scene), s=new THREE.Vector3(), c0=new THREE.Vector3();
  box.getSize(s); box.getCenter(c0); g.scene.position.sub(c0); sc.add(g.scene);
  const rad=Math.max(s.x,s.y,s.z)||1; cam.position.set(rad*1.4,rad*1.1,rad*1.7); cam.lookAt(0,0,0);
  r.render(sc,cam); requestAnimationFrame(()=>{ r.render(sc,cam); res(true); });
}, undefined, e=>rej(e.message)); });
window.__ready=true;
</script></body></html>`;
const srv=http.createServer((req,rq)=>{ let p=req.url.split('?')[0]; if(p==='/'){ rq.writeHead(200,{'content-type':'text/html'}); return rq.end(page);}
  const fp=path.join(STAGE, decodeURIComponent(p)); if(fs.existsSync(fp)){ rq.writeHead(200); return rq.end(fs.readFileSync(fp)); } rq.writeHead(404); rq.end('no'); });
(async()=>{ await new Promise(r=>srv.listen(8734,r));
  const br=await chromium.launch({args:['--ignore-certificate-errors','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const pg=await (await br.newContext({ignoreHTTPSErrors:true})).newPage();
  pg.on('console',m=>{ if(m.type()==='error') console.log('  cerr',m.text()); });
  await pg.goto('http://localhost:8734/',{waitUntil:'networkidle'}); await pg.waitForFunction('window.__ready===true');
  for(const m of models){ try{ await pg.evaluate(n=>window.shoot(n), m); await pg.waitForTimeout(80);
    fs.writeFileSync(path.join(OUT,m+'.png'), await pg.locator('#c').screenshot()); console.log('shot',m);}catch(e){console.log('FAIL',m,e);} }
  await br.close(); srv.close(); console.log('done',OUT);
})().catch(e=>{console.error(e);process.exit(1);});
