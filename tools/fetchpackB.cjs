/* Download the SECOND asset pack (CC0 buildings/landmarks) from a file.kiwi share link
   and save the zip to /tmp/packB. file.kiwi serves the zip through a one-shot, session-bound
   download endpoint, so we drive headless Chromium and capture the browser's own download
   (a plain curl 404s). Mirrors tools/fetchpack.cjs with a new SHARE link + dest.
   Run: node tools/fetchpackB.cjs
   Then: unzip -o /tmp/packB/pack.zip -d /tmp/packB/x   (inspect glTF/ + License*.txt)
         node tools/preppackB.cjs */
const fs=require('fs');
const { chromium }=require('/opt/node22/lib/node_modules/playwright');
const SHARE='https://file.kiwi/316606a3#qK7Asjw3mFS5vClLXZdAMA';   // CC0 buildings pack share link
(async()=>{
  fs.mkdirSync('/tmp/packB',{recursive:true});
  const br=await chromium.launch({args:['--ignore-certificate-errors']});
  const ctx=await br.newContext({acceptDownloads:true});
  const pg=await ctx.newPage();
  await pg.goto(SHARE,{waitUntil:'domcontentloaded',timeout:60000});
  await pg.waitForTimeout(3000);
  const dlP=pg.waitForEvent('download',{timeout:300000});
  await pg.evaluate(()=>{ const els=[...document.querySelectorAll('button,a,[role=button]')];
    const d=els.filter(b=>/^download$/i.test((b.innerText||'').trim())); (d[d.length-1]).click(); });
  console.log('awaiting download (server assembles the zip)...');
  const dl=await dlP; console.log('file:', dl.suggestedFilename());
  await dl.saveAs('/tmp/packB/pack.zip');
  console.log('saved /tmp/packB/pack.zip');
  await br.close();
})().catch(e=>{ console.error('FAIL',e.message); process.exit(1); });
