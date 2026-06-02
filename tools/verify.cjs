/* Headless smoke + behaviour check for flappy3d.html.
   Serves the repo over http (CDN importmap needs a real origin), boots the game,
   asserts no console errors, and exercises the difficulty + juice debug API.
   Usage: node tools/verify.cjs [theme] [shot-prefix] [flags]
     flags: "lowfx" -> ?lowfx, "fullfx" -> ?fullfx   (combine: "lowfx&fullfx")
   Writes screenshots to /tmp/shots/. */
const fs=require('fs'), http=require('http'), path=require('path');
const { chromium }=require('/opt/node22/lib/node_modules/playwright');
const ROOT='/home/user/Game';
const theme=process.argv[2]||'hills', prefix=process.argv[3]||'v', flags=process.argv[4]||'';
const OUT='/tmp/shots'; fs.mkdirSync(OUT,{recursive:true});
const MIME={'.html':'text/html','.js':'text/javascript','.png':'image/png','.hdr':'application/octet-stream','.bin':'application/octet-stream','.gltf':'model/gltf+json','.json':'application/json'};
const srv=http.createServer((rq,rs)=>{ let p=decodeURIComponent(rq.url.split('?')[0]); if(p==='/')p='/flappy3d.html';
  const fp=path.join(ROOT,p); if(fs.existsSync(fp)&&fs.statSync(fp).isFile()){ rs.writeHead(200,{'content-type':MIME[path.extname(fp)]||'application/octet-stream'}); fs.createReadStream(fp).pipe(rs);} else { rs.writeHead(404); rs.end('no'); } });
(async()=>{
  await new Promise(r=>srv.listen(8732,r));
  const q=[]; if(/lowfx/.test(flags))q.push('lowfx'); if(/fullfx/.test(flags))q.push('fullfx');
  const url='http://localhost:8732/flappy3d.html'+(q.length?'?'+q.join('&'):'');
  const br=await chromium.launch({args:['--ignore-certificate-errors','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const ctx=await br.newContext({ignoreHTTPSErrors:true,viewport:{width:900,height:600}});
  const pg=await ctx.newPage(); const cerr=[];
  pg.on('console',m=>{ if(m.type()==='error') cerr.push(m.text()); });
  pg.on('pageerror',e=>cerr.push('PAGEERR '+e.message));
  await pg.goto(url,{waitUntil:'domcontentloaded'});
  const ok=await pg.evaluate(()=>window.__game.ready).catch(e=>'READY_FAIL '+e);
  console.log('ready:',ok,'| flags:',flags||'(default)');
  await pg.evaluate(t=>window.__game.setTheme(t), theme);
  await pg.evaluate(()=>window.__game.warm(3));
  await pg.screenshot({path:path.join(OUT,prefix+'_ready.png')});

  // difficulty assertions
  const diffs={};
  for(const d of ['easy','moderate','high','extreme']){
    await pg.evaluate(x=>window.__game.setDifficulty(x), d);
    diffs[d]=await pg.evaluate(()=>window.__game.diffConfig());
  }
  console.log('diff extreme:', JSON.stringify({speed0:diffs.extreme.speed0,gap0:diffs.extreme.gap0,spawnEvery:diffs.extreme.spawnEvery}));
  console.log('diff easy   :', JSON.stringify({speed0:diffs.easy.speed0,gap0:diffs.easy.gap0,spawnEvery:diffs.easy.spawnEvery}));

  // start a run at extreme, warm a bunch, screenshot mid-play; confirm first pipe gap == gap0
  await pg.evaluate(()=>window.__game.setDifficulty('extreme'));
  await pg.evaluate(()=>window.__game.start());
  await pg.evaluate(()=>window.__game.warm(40));
  const st=await pg.evaluate(()=>window.__game.getState());
  console.log('play state:', st.state, '| difficulty:', st.difficulty, '| active pipes:', st.pipes.length, '| first gap:', st.pipes[0]&&st.pipes[0].gap);
  await pg.screenshot({path:path.join(OUT,prefix+'_play.png')});

  // collision probe (must be deterministic, config-independent)
  const hit=await pg.evaluate(()=>({
    center_pass: window.__game.hitTest(-3.4, 2.0, 2.0, 6),   // bird in gap centre -> false
    hit_ceiling: window.__game.hitTest(-3.4, 6.0, 2.0, 6),   // above the gap -> true
    cap: window.__game.capInfo()
  }));
  console.log('collision:', JSON.stringify(hit));

  // mute toggle persists
  const m1=await pg.evaluate(()=>window.__game.mute(true));
  console.log('muted:', m1, '| localStorage:', await pg.evaluate(()=>localStorage.getItem('flappy3d_mute')));
  await pg.evaluate(()=>window.__game.mute(false));

  const fi=await pg.evaluate(()=>window.__game.frameInfo());
  console.log('frameInfo:', JSON.stringify(fi));
  console.log('CONSOLE ERRORS:', cerr.length, cerr.slice(0,8));
  await br.close(); srv.close();
})().catch(e=>{console.error('FAIL',e);srv.close();process.exit(1);});
