/* Calibrate per-model heading: render hero creatures + fish from the GAME camera direction
   (camera at +z looking toward -z) at headings 0, 90, 180, 270 so we can pick the one that
   shows a left-facing (-x) broadside profile. Run: node tools/calib.cjs -> /tmp/pp/calib.png */
const fs=require('fs'),http=require('http'),path=require('path');
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const ROOT=path.join(__dirname,'..','assets','models','ocean-life');
const MODELS=['manta','turtle','shark','fishClown','fishTang','fishMandarin'];
const page=`<!doctype html><html><head><meta charset=utf8>
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/"}}</script>
</head><body><canvas id=sheet></canvas><canvas id=cell width=200 height=200></canvas><script type=module>
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const cell=document.getElementById('cell');
const r=new THREE.WebGLRenderer({canvas:cell,antialias:true,alpha:true}); r.setSize(200,200);
const sc=new THREE.Scene(); const cam=new THREE.PerspectiveCamera(40,1,0.01,1000);
cam.position.set(0.6,0.4,6); cam.lookAt(0,0,0);   // same look-direction as the game camera (+z -> -z)
sc.add(new THREE.AmbientLight(0xffffff,0.9)); const d=new THREE.DirectionalLight(0xffffff,1.4); d.position.set(-4,8,6); sc.add(d);
const loader=new GLTFLoader();
function render1(name,hdg){ return new Promise(res=>{ loader.load(name+'.glb', g=>{
  while(sc.children.length>2) sc.remove(sc.children[2]);
  const box=new THREE.Box3().setFromObject(g.scene), s=new THREE.Vector3(), c=new THREE.Vector3();
  box.getSize(s); box.getCenter(c); const sc0=4/Math.max(s.x,s.y,s.z);
  const wrap=new THREE.Group(); g.scene.scale.setScalar(sc0); g.scene.position.set(-c.x*sc0,-c.y*sc0,-c.z*sc0);
  wrap.add(g.scene); wrap.rotation.y=hdg; sc.add(wrap);
  r.render(sc,cam); requestAnimationFrame(()=>{ r.render(sc,cam); res(); });
}, undefined, ()=>res()); }); }
window.build=async(models)=>{
  const hdgs=[0,Math.PI/2,Math.PI,3*Math.PI/2], cw=210, ch=232;
  const sheet=document.getElementById('sheet'); sheet.width=4*cw+10; sheet.height=models.length*ch+10;
  const x=sheet.getContext('2d'); x.fillStyle='#15202b'; x.fillRect(0,0,sheet.width,sheet.height);
  for(let m=0;m<models.length;m++){ for(let h=0;h<4;h++){ await render1(models[m],hdgs[h]);
    x.drawImage(cell, h*cw+8, m*ch+8, 200,200);
    x.fillStyle='#cfe'; x.font='13px sans-serif'; x.fillText(models[m]+'  hdg='+['0','90','180','270'][h], h*cw+8, m*ch+224); } }
  return sheet.toDataURL('image/png');
};
window.__ready=true;
</script></body></html>`;
const srv=http.createServer((req,rq)=>{ let p=decodeURIComponent(req.url.split('?')[0]);
  if(p==='/'){ rq.writeHead(200,{'content-type':'text/html'}); return rq.end(page); }
  const fp=path.join(ROOT,p); if(fs.existsSync(fp)){ rq.writeHead(200); return rq.end(fs.readFileSync(fp)); } rq.writeHead(404); rq.end('no'); });
(async()=>{ await new Promise(r=>srv.listen(8737,r));
  const br=await chromium.launch({args:['--ignore-certificate-errors','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const pg=await (await br.newContext({ignoreHTTPSErrors:true})).newPage();
  await pg.goto('http://localhost:8737/',{waitUntil:'networkidle'}); await pg.waitForFunction('window.__ready===true');
  const data=await pg.evaluate(ms=>window.build(ms), MODELS);
  fs.writeFileSync('/tmp/pp/calib.png', Buffer.from(data.split(',')[1],'base64'));
  await br.close(); srv.close(); console.log('done /tmp/pp/calib.png');
})().catch(e=>{console.error(e);process.exit(1);});
