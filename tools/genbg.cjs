/* Generate painterly, horizontally-tileable parallax background layers as PNGs.
   Run: node tools/genbg.cjs   (uses headless Chromium to draw a 2D canvas -> PNG)
   Output: assets/bg/{clouds,mountains,hills,treeline}.png  */
const fs = require('fs'), path = require('path');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const OUT = path.join(__dirname, '..', 'assets', 'bg');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ args: ['--ignore-certificate-errors'] });
  const page = await browser.newPage();
  await page.setContent('<canvas id="c"></canvas>');

  const layers = await page.evaluate(() => {
    // ---- helpers ----
    function rng(seed){ let s=seed>>>0; return ()=>{ s=s+0x6D2B79F5|0; let t=Math.imul(s^s>>>15,1|s); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
    function mk(w,h){ const c=document.createElement('canvas'); c.width=w; c.height=h; return c; }
    // periodic ridge height in [0..1], seamless over width
    function harmonics(rand, n){ const a=[]; let amp=1; for(let f=1;f<=n;f++){ a.push([f, amp*(0.6+rand()*0.6), rand()*6.28]); amp*=0.62; } return a; }
    function heightAt(u, harm){ let h=0, tot=0; for(const [f,a,p] of harm){ h+=Math.sin(u*f+p)*a; tot+=a; } return (h/tot)*0.5+0.5; }
    function ridgePath(ctx,W,H,baseY,amp,harm){
      ctx.beginPath(); ctx.moveTo(0,H);
      for(let x=0;x<=W;x+=2){ const u=x/W*Math.PI*2; const y=baseY-heightAt(u,harm)*amp; ctx.lineTo(x,y); }
      ctx.lineTo(W,H); ctx.closePath();
    }
    function vgrad(ctx,x0,y0,y1,stops){ const g=ctx.createLinearGradient(0,y0,0,y1); stops.forEach(s=>g.addColorStop(s[0],s[1])); return g; }

    const out = {};

    // ===== MOUNTAINS (snow-capped, hazy blue-violet) =====
    (function(){ const W=2048,H=640,c=mk(W,H),ctx=c.getContext('2d'); const rand=rng(7);
      const order=[ {base:H*1.0, amp:H*0.40, top:'#8493b8', bot:'#5e6f97', snow:0.0, harm:harmonics(rand,5)},
                    {base:H*1.0, amp:H*0.52, top:'#8fa0c6', bot:'#586a93', snow:0.62, harm:harmonics(rand,6)},
                    {base:H*1.02,amp:H*0.66, top:'#a9b7d6', bot:'#62739c', snow:0.7,  harm:harmonics(rand,6)} ];
      order.forEach(r=>{
        ctx.save(); ridgePath(ctx,W,H,r.base,r.amp,r.harm);
        ctx.fillStyle=vgrad(ctx,0,r.base-r.amp,r.base,[[0,r.top],[1,r.bot]]); ctx.fill();
        if(r.snow>0){ // snow caps: clip to ridge, paint white where ridge is high
          ctx.clip();
          for(let x=0;x<=W;x+=2){ const u=x/W*Math.PI*2; const hh=heightAt(u,r.harm); if(hh>r.snow){ const y=r.base-hh*r.amp; const t=(hh-r.snow)/(1-r.snow); ctx.fillStyle='rgba(255,255,255,'+(0.5*t).toFixed(3)+')'; ctx.fillRect(x,y,2,8+18*t); } }
        }
        ctx.restore();
      });
      out.mountains=c.toDataURL('image/png');
    })();

    // ===== HILLS (forested rolling, green->haze) =====
    (function(){ const W=2048,H=512,c=mk(W,H),ctx=c.getContext('2d'); const rand=rng(23);
      const order=[ {base:H*1.0, amp:H*0.34, top:'#6f9a5e', bot:'#4d7a48', harm:harmonics(rand,5)},
                    {base:H*1.0, amp:H*0.46, top:'#5f9050', bot:'#3c6a3e', harm:harmonics(rand,6)},
                    {base:H*1.03,amp:H*0.6,  top:'#52864a', bot:'#2f5a34', harm:harmonics(rand,7)} ];
      order.forEach((r,i)=>{
        ctx.save(); ridgePath(ctx,W,H,r.base,r.amp,r.harm);
        ctx.fillStyle=vgrad(ctx,0,r.base-r.amp,r.base,[[0,r.top],[1,r.bot]]); ctx.fill();
        // soft tree-dapple on the front ridge
        if(i===order.length-1){ ctx.clip(); ctx.globalAlpha=0.12;
          for(let k=0;k<900;k++){ const x=rand()*W; const u=x/W*Math.PI*2; const y=r.base-heightAt(u,r.harm)*r.amp + rand()*40; ctx.fillStyle=rand()>0.5?'#234a28':'#6fae5a'; ctx.beginPath(); ctx.arc(x,y,2+rand()*3,0,6.28); ctx.fill(); }
          ctx.globalAlpha=1; }
        ctx.restore();
      });
      out.hills=c.toDataURL('image/png');
    })();

    // ===== TREELINE (near forest silhouette, deep green) =====
    (function(){ const W=2048,H=420,c=mk(W,H),ctx=c.getContext('2d'); const rand=rng(91);
      const baseY=H*0.92;
      // ground band
      ctx.fillStyle=vgrad(ctx,0,baseY-10,H,[[0,'#2c5230'],[1,'#1d3a22']]); ctx.fillRect(0,baseY-6,W,H);
      // periodic trees (pines + round), tile by spacing that divides W
      const n=46, step=W/n;
      for(let i=0;i<=n;i++){ const cx=i*step + (Math.sin(i*12.9)*0.5)*step*0.3; const r=rand();
        const th=120+ r*150; const tw=step*(0.7+rand()*0.5);
        const topY=baseY-th; const g=vgrad(ctx,0,topY,baseY,[[0,'#3a6b3f'],[1,'#1c3a21']]);
        ctx.fillStyle=g;
        if(r>0.5){ // pine
          ctx.beginPath(); ctx.moveTo(cx, topY); ctx.lineTo(cx+tw*0.5, baseY); ctx.lineTo(cx-tw*0.5, baseY); ctx.closePath(); ctx.fill();
          ctx.beginPath(); ctx.moveTo(cx, topY+th*0.28); ctx.lineTo(cx+tw*0.62, baseY*0.62+topY*0.38); ctx.lineTo(cx-tw*0.62, baseY*0.62+topY*0.38); ctx.closePath(); ctx.fill();
        } else { // round
          ctx.beginPath(); ctx.ellipse(cx, topY+th*0.4, tw*0.55, th*0.5, 0, 0, 6.28); ctx.fill();
          ctx.fillRect(cx-tw*0.06, topY+th*0.5, tw*0.12, th*0.5);
        }
        // rim light hint
        ctx.globalAlpha=0.07; ctx.fillStyle='#bfe39a'; ctx.beginPath(); ctx.arc(cx-tw*0.18, topY+th*0.34, tw*0.08,0,6.28); ctx.fill(); ctx.globalAlpha=1;
      }
      out.treeline=c.toDataURL('image/png');
    })();

    // ===== CLOUDS (soft warm band, tileable) =====
    (function(){ const W=1280,H=384,c=mk(W,H),ctx=c.getContext('2d'); const rand=rng(55);
      function puff(cx,cy,r,warm){ const g=ctx.createRadialGradient(cx,cy,0,cx,cy,r); const a=0.42; g.addColorStop(0,'rgba(255,'+(warm?246:252)+','+(warm?226:252)+','+a+')'); g.addColorStop(0.6,'rgba(255,250,242,'+(a*0.4).toFixed(3)+')'); g.addColorStop(1,'rgba(255,255,255,0)'); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,r,0,6.28); ctx.fill(); }
      const N=16; for(let i=0;i<N;i++){ const cx=rand()*W, cy=H*(0.25+rand()*0.5), base=55+rand()*110, warm=rand()>0.5;
        for(let k=0;k<5;k++){ const ox=(rand()-0.5)*base*1.6, oy=(rand()-0.5)*base*0.5; const r=base*(0.5+rand()*0.7);
          puff(cx+ox,cy+oy,r,warm); puff(cx+ox-W,cy+oy,r,warm); puff(cx+ox+W,cy+oy,r,warm); } } // wrap copies
      out.clouds=c.toDataURL('image/png');
    })();

    return out;
  });

  for (const [name, dataURL] of Object.entries(layers)) {
    const b64 = dataURL.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(b64, 'base64'));
    console.log('wrote', name + '.png', Math.round(Buffer.from(b64,'base64').length/1024) + 'kb');
  }
  await browser.close();
})().catch(e => { console.error('GEN FAIL', e); process.exit(1); });
