/* Download the source asset pack (Quaternius "Stylized Nature MegaKit", FREE/CC0) from the
   file.kiwi share link and extract its glTF set to /tmp/pack/x for tools/preppack.cjs.
   file.kiwi serves the zip through a one-shot, session-bound download endpoint, so we drive
   headless Chromium and capture the browser's own download (a plain curl 404s).
   Run: node tools/fetchpack.cjs
   Then: unzip -o /tmp/pack/pack.zip 'glTF/*' 'License_Standard.txt' -d /tmp/pack/x
         node tools/preppack.cjs */
const fs=require('fs');
const { chromium }=require('/opt/node22/lib/node_modules/playwright');
const SHARE='https://file.kiwi/d4ec1118#74Doim6lBuP6APFcX93cIA';   // CC0 pack share link
(async()=>{
  fs.mkdirSync('/tmp/pack',{recursive:true});
  const br=await chromium.launch({args:['--ignore-certificate-errors']});
  const ctx=await br.newContext({acceptDownloads:true});
  const pg=await ctx.newPage();
  await pg.goto(SHARE,{waitUntil:'domcontentloaded',timeout:60000});
  await pg.waitForTimeout(3000);
  const dlP=pg.waitForEvent('download',{timeout:240000});
  await pg.evaluate(()=>{ const els=[...document.querySelectorAll('button,a,[role=button]')];
    const d=els.filter(b=>/^download$/i.test((b.innerText||'').trim())); (d[d.length-1]).click(); });
  console.log('awaiting download (server assembles ~104MB)...');
  const dl=await dlP; console.log('file:', dl.suggestedFilename());
  await dl.saveAs('/tmp/pack/pack.zip');
  console.log('saved /tmp/pack/pack.zip');
  await br.close();
})().catch(e=>{ console.error('FAIL',e.message); process.exit(1); });
