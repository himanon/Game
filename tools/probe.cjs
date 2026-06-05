/* Lightweight headless probe for a theme: loads the game, waits for ready, switches theme, warms a
   few frames, captures a READY + gameplay screenshot, and reports frameInfo + console errors + failed
   requests. Far lighter than verify.cjs (which times out on dense scenes under swiftshader).
   Run: node tools/probe.cjs [theme=ocean] [outPrefix=probe] [diff=easy] */
const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const ROOT=path.join(__dirname,'..'); const OUT='/tmp/shots'; fs.mkdirSync(OUT,{recursive:true});
const THEME=process.argv[2]||'ocean', PRE=process.argv[3]||'probe', DIFF=process.argv[4]||'easy';
const MIME={'.html':'text/html','.js':'text/javascript','.png':'image/png','.hdr':'application/octet-stream','.bin':'application/octet-stream','.gltf':'model/gltf+json','.glb':'model/gltf-binary','.json':'application/json','.jpg':'image/jpeg','.mp3':'audio/mpeg'};
const srv=http.createServer((rq,rs)=>{let p=decodeURIComponent(rq.url.split('?')[0]);if(p=='/')p='/flappy3d.html';const fp=path.join(ROOT,p);if(fs.existsSync(fp)&&fs.statSync(fp).isFile()){rs.writeHead(200,{'content-type':MIME[path.extname(fp)]||'application/octet-stream'});fs.createReadStream(fp).pipe(rs);}else{rs.writeHead(404);rs.end('no');}});
(async()=>{await new Promise(r=>srv.listen(8748,r));
const br=await chromium.launch({args:['--ignore-certificate-errors','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const pg=await(await br.newContext({ignoreHTTPSErrors:true,viewport:{width:900,height:600}})).newPage();
const errs=[],failed=[];
pg.on('console',m=>{if(m.type()=='error')errs.push(m.text());});
pg.on('pageerror',e=>errs.push('PAGEERR '+e.message));
pg.on('response',r=>{if(r.status()>=400)failed.push(r.status()+' '+r.url().split('/').slice(-2).join('/'));});
await pg.goto('http://localhost:8748/flappy3d.html',{waitUntil:'domcontentloaded'});
await pg.waitForFunction(()=>window.__game&&window.__game.ready,null,{timeout:60000});
await pg.evaluate(()=>window.__game.ready);
await pg.evaluate(t=>window.__game.setTheme(t),THEME);
await pg.evaluate(()=>window.__game.warm(5));
await pg.screenshot({path:`${OUT}/${PRE}_ready.png`});
try{
  await pg.evaluate(d=>window.__game.setDifficulty(d),DIFF);
  await pg.evaluate(()=>window.__game.setSeed&&window.__game.setSeed(7));
  await pg.evaluate(()=>window.__game.start());
  for(let i=0;i<60;i++){const st=await pg.evaluate(()=>window.__game.getState());
    if(st.state!=='PLAYING')await pg.evaluate(()=>window.__game.start());
    if(st.bird&&st.bird.y<2.6)await pg.evaluate(()=>window.__game.flap());
    if((st.pipes||[]).some(p=>Math.abs(p.x-3)<2))break;
    await pg.evaluate(()=>window.__game.warm(2));}
  await pg.screenshot({path:`${OUT}/${PRE}_play.png`});
}catch(e){errs.push('PLAY '+e.message);}
const fi=await pg.evaluate(()=>window.__game.frameInfo());
console.log('THEME:',THEME,'| frameInfo:',JSON.stringify(fi));
console.log('FAILED REQ:',[...new Set(failed)].slice(0,12));
console.log('CONSOLE ERRORS:',errs.length, errs.slice(0,8));
await br.close();srv.close();})().catch(e=>{console.error('PROBEFAIL',e.message);process.exit(1);});
