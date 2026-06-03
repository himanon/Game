/* Clean mid-play screenshots of the pillar caps for each theme: serve repo, boot, set theme,
   start an easy run, flap to stay alive while warming until a pipe sits near the bird, then shoot.
   Usage: node tools/capcaps.cjs [theme...]   Writes /tmp/shots/caps_<theme>.png */
const fs=require('fs'), http=require('http'), path=require('path');
const { chromium }=require('/opt/node22/lib/node_modules/playwright');
const ROOT='/home/user/Game', OUT='/tmp/shots'; fs.mkdirSync(OUT,{recursive:true});
const themes=process.argv.slice(2); const list=themes.length?themes:['space','ocean','ruins'];
const MIME={'.html':'text/html','.js':'text/javascript','.png':'image/png','.hdr':'application/octet-stream','.bin':'application/octet-stream','.gltf':'model/gltf+json','.glb':'model/gltf-binary','.json':'application/json','.jpg':'image/jpeg','.mp3':'audio/mpeg'};
const srv=http.createServer((rq,rs)=>{ let p=decodeURIComponent(rq.url.split('?')[0]); if(p==='/')p='/flappy3d.html';
  const fp=path.join(ROOT,p); if(fs.existsSync(fp)&&fs.statSync(fp).isFile()){ rs.writeHead(200,{'content-type':MIME[path.extname(fp)]||'application/octet-stream'}); fs.createReadStream(fp).pipe(rs);} else { rs.writeHead(404); rs.end('no'); } });
(async()=>{
  await new Promise(r=>srv.listen(8733,r));
  const br=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const pg=await (await br.newContext({viewport:{width:900,height:600}})).newPage();
  await pg.goto('http://localhost:8733/flappy3d.html?fullfx',{waitUntil:'domcontentloaded'});
  await pg.waitForFunction(()=>window.__game && window.__game.ready, null, {timeout:120000});
  await pg.evaluate(()=>window.__game.ready);
  for(const th of list){
    await pg.evaluate(t=>window.__game.setTheme(t), th);
    await pg.evaluate(()=>window.__game.setDifficulty('easy'));
    await pg.evaluate(()=>window.__game.setSeed(7));
    await pg.evaluate(()=>window.__game.start());
    // fly level: flap whenever falling below mid, warm frames until a pipe is just ahead of the bird
    for(let i=0;i<140;i++){
      const st=await pg.evaluate(()=>window.__game.getState());
      if(st.state!=='PLAYING'){ await pg.evaluate(()=>window.__game.start()); }
      if(st.bird && st.bird.vy<0.5 && st.bird.y<2.0) await pg.evaluate(()=>window.__game.flap());
      const near=(st.pipes||[]).some(p=>Math.abs(p.x-3)<1.2);   // pipe near bird x
      if(near){ break; }
      await pg.evaluate(()=>window.__game.warm(1));
    }
    await pg.evaluate(()=>window.__game.warm(1));
    await pg.screenshot({path:path.join(OUT,'caps_'+th+'.png')});
    console.log('shot',th, JSON.stringify(await pg.evaluate(()=>window.__game.getState())).slice(0,160));
  }
  await br.close(); srv.close();
})().catch(e=>{console.error('FAIL',e.message);process.exit(1);});
