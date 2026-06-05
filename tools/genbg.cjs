/* Generate painterly parallax layers + high-fidelity background sprites as PNGs.
   Run: node tools/genbg.cjs   (uses headless Chromium to draw a 2D canvas -> PNG)
   Output: assets/bg/{clouds,mountains,hills,treeline,balloon,birdv,eagle,butterfly}.png
   Every layer/sprite is run through an RGB color-bleed (dilation) pass so transparent
   texels carry a sensible colour — kills the dark fringe/squares that bilinear filtering
   + mipmaps otherwise pull out of straight-alpha PNGs. */
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
    function harmonics(rand, n){ const a=[]; let amp=1; for(let f=1;f<=n;f++){ a.push([f, amp*(0.6+rand()*0.6), rand()*6.28]); amp*=0.62; } return a; }
    function heightAt(u, harm){ let h=0, tot=0; for(const [f,a,p] of harm){ h+=Math.sin(u*f+p)*a; tot+=a; } return (h/tot)*0.5+0.5; }
    function ridgePath(ctx,W,H,baseY,amp,harm){
      ctx.beginPath(); ctx.moveTo(0,H);
      for(let x=0;x<=W;x+=2){ const u=x/W*Math.PI*2; const y=baseY-heightAt(u,harm)*amp; ctx.lineTo(x,y); }
      ctx.lineTo(W,H); ctx.closePath();
    }
    function vgrad(ctx,x0,y0,y1,stops){ const g=ctx.createLinearGradient(0,y0,0,y1); stops.forEach(s=>g.addColorStop(s[0],s[1])); return g; }
    // color-bleed: give transparent edge pixels the avg RGB of their covered neighbours so
    // bilinear filtering / mipmaps never pull edges toward black (no dark fringe). Canvas
    // stores premultiplied alpha, so a fully-transparent pixel can't keep RGB — we stamp a
    // tiny alpha (1/255, well below the material's alphaTest) so the colour survives the PNG
    // round-trip while the pixel stays effectively invisible. wrapX tiles horizontally.
    function bleed(ctx,W,H,iters,wrapX){
      const img=ctx.getImageData(0,0,W,H), d=img.data;
      for(let it=0; it<iters; it++){ const s=new Uint8ClampedArray(d);
        for(let y=0;y<H;y++) for(let x=0;x<W;x++){ const i=(y*W+x)*4; if(s[i+3]>1) continue;
          let r=0,g=0,b=0,n=0;
          for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){ if(!dx&&!dy) continue;
            let xx=x+dx, yy=y+dy; if(yy<0||yy>=H) continue;
            if(xx<0||xx>=W){ if(wrapX) xx=(xx+W)%W; else continue; }
            const j=(yy*W+xx)*4; if(s[j+3]>1){ r+=s[j]; g+=s[j+1]; b+=s[j+2]; n++; } }
          if(n){ d[i]=r/n; d[i+1]=g/n; d[i+2]=b/n; d[i+3]=1; } } }
      ctx.putImageData(img,0,0);
    }

    const out = {};
    const finish=(name,c,ctx,iters,wrapX)=>{ bleed(ctx,c.width,c.height,iters||4,wrapX!==false); out[name]=c.toDataURL('image/png'); };

    // ===== MOUNTAINS (snow-capped, cleaner saturated blue) =====
    (function(){ const W=2048,H=640,c=mk(W,H),ctx=c.getContext('2d'); const rand=rng(7);
      const order=[ {base:H*1.0, amp:H*0.40, top:'#7d93c8', bot:'#4f6aa6', snow:0.0, harm:harmonics(rand,5)},
                    {base:H*1.0, amp:H*0.52, top:'#8aa0d8', bot:'#4a64a4', snow:0.62, harm:harmonics(rand,6)},
                    {base:H*1.02,amp:H*0.66, top:'#aabfe8', bot:'#5874b2', snow:0.7,  harm:harmonics(rand,6)} ];
      order.forEach(r=>{
        ctx.save(); ridgePath(ctx,W,H,r.base,r.amp,r.harm);
        ctx.fillStyle=vgrad(ctx,0,r.base-r.amp,r.base,[[0,r.top],[1,r.bot]]); ctx.fill();
        if(r.snow>0){ ctx.clip();
          for(let x=0;x<=W;x+=2){ const u=x/W*Math.PI*2; const hh=heightAt(u,r.harm); if(hh>r.snow){ const y=r.base-hh*r.amp; const t=(hh-r.snow)/(1-r.snow); ctx.fillStyle='rgba(255,255,255,'+(0.55*t).toFixed(3)+')'; ctx.fillRect(x,y,2,8+18*t); } }
        }
        ctx.restore();
      });
      finish('mountains',c,ctx,5);
    })();

    // ===== HILLS (forested rolling, deeper saturated greens) =====
    (function(){ const W=2048,H=512,c=mk(W,H),ctx=c.getContext('2d'); const rand=rng(23);
      const order=[ {base:H*1.0, amp:H*0.34, top:'#73a85f', bot:'#4c8a48', harm:harmonics(rand,5)},
                    {base:H*1.0, amp:H*0.46, top:'#64a052', bot:'#3c7e3e', harm:harmonics(rand,6)},
                    {base:H*1.03,amp:H*0.6,  top:'#569447', bot:'#2c6a34', harm:harmonics(rand,7)} ];
      order.forEach((r,i)=>{
        ctx.save(); ridgePath(ctx,W,H,r.base,r.amp,r.harm);
        ctx.fillStyle=vgrad(ctx,0,r.base-r.amp,r.base,[[0,r.top],[1,r.bot]]); ctx.fill();
        if(i===order.length-1){ ctx.clip(); ctx.globalAlpha=0.13;
          for(let k=0;k<900;k++){ const x=rand()*W; const u=x/W*Math.PI*2; const y=r.base-heightAt(u,r.harm)*r.amp + rand()*40; ctx.fillStyle=rand()>0.5?'#1e4a24':'#82c466'; ctx.beginPath(); ctx.arc(x,y,2+rand()*3,0,6.28); ctx.fill(); }
          ctx.globalAlpha=1; }
        ctx.restore();
      });
      finish('hills',c,ctx,5);
    })();

    // ===== TREELINE (near forest silhouette, rich deep green) =====
    (function(){ const W=2048,H=420,c=mk(W,H),ctx=c.getContext('2d'); const rand=rng(91);
      const baseY=H*0.92;
      ctx.fillStyle=vgrad(ctx,0,baseY-10,H,[[0,'#2f5e34'],[1,'#1c3d23']]); ctx.fillRect(0,baseY-6,W,H);
      const n=46, step=W/n;
      for(let i=0;i<=n;i++){ const cx=i*step + (Math.sin(i*12.9)*0.5)*step*0.3; const r=rand();
        const th=120+ r*150; const tw=step*(0.7+rand()*0.5);
        const topY=baseY-th; const g=vgrad(ctx,0,topY,baseY,[[0,'#3f7a44'],[1,'#1b3c22']]);
        ctx.fillStyle=g;
        if(r>0.5){ ctx.beginPath(); ctx.moveTo(cx, topY); ctx.lineTo(cx+tw*0.5, baseY); ctx.lineTo(cx-tw*0.5, baseY); ctx.closePath(); ctx.fill();
          ctx.beginPath(); ctx.moveTo(cx, topY+th*0.28); ctx.lineTo(cx+tw*0.62, baseY*0.62+topY*0.38); ctx.lineTo(cx-tw*0.62, baseY*0.62+topY*0.38); ctx.closePath(); ctx.fill();
        } else { ctx.beginPath(); ctx.ellipse(cx, topY+th*0.4, tw*0.55, th*0.5, 0, 0, 6.28); ctx.fill();
          ctx.fillRect(cx-tw*0.06, topY+th*0.5, tw*0.12, th*0.5); }
        ctx.globalAlpha=0.09; ctx.fillStyle='#c7ec9e'; ctx.beginPath(); ctx.arc(cx-tw*0.18, topY+th*0.34, tw*0.08,0,6.28); ctx.fill(); ctx.globalAlpha=1;
      }
      finish('treeline',c,ctx,5);
    })();

    // ===== CLOUDS (soft warm band, tileable) =====
    (function(){ const W=1280,H=384,c=mk(W,H),ctx=c.getContext('2d'); const rand=rng(55);
      function puff(cx,cy,r,warm){ const g=ctx.createRadialGradient(cx,cy,0,cx,cy,r); const a=0.42; g.addColorStop(0,'rgba(255,'+(warm?246:252)+','+(warm?226:252)+','+a+')'); g.addColorStop(0.6,'rgba(255,250,242,'+(a*0.4).toFixed(3)+')'); g.addColorStop(1,'rgba(255,255,255,0)'); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,r,0,6.28); ctx.fill(); }
      const N=16; for(let i=0;i<N;i++){ const cx=rand()*W, cy=H*(0.25+rand()*0.5), base=55+rand()*110, warm=rand()>0.5;
        for(let k=0;k<5;k++){ const ox=(rand()-0.5)*base*1.6, oy=(rand()-0.5)*base*0.5; const r=base*(0.5+rand()*0.7);
          puff(cx+ox,cy+oy,r,warm); puff(cx+ox-W,cy+oy,r,warm); puff(cx+ox+W,cy+oy,r,warm); } }
      finish('clouds',c,ctx,3);
    })();

    // ===== HOT-AIR BALLOON (paneled gores, shaded, basket) =====
    (function(){ const W=512,H=660,c=mk(W,H),ctx=c.getContext('2d');
      const cx=W*0.5, cy=H*0.36, rx=W*0.36, ry=H*0.34;
      function envelope(){ ctx.beginPath();
        ctx.moveTo(cx, cy+ry*1.18);
        ctx.bezierCurveTo(cx-rx*1.18, cy+ry*0.55, cx-rx*1.02, cy-ry*0.9, cx, cy-ry*1.12);
        ctx.bezierCurveTo(cx+rx*1.02, cy-ry*0.9, cx+rx*1.18, cy+ry*0.55, cx, cy+ry*1.18);
        ctx.closePath(); }
      const cols=[['#ff7a6b','#d83f54'],['#ffd166','#eda63a'],['#5ec8e0','#2f93b8'],['#9be07a','#4f9e46']];
      ctx.save(); envelope(); ctx.clip();
      const gores=8;
      for(let i=0;i<gores;i++){ const x0=cx-rx*1.2 + (i/gores)*rx*2.4, x1=cx-rx*1.2 + ((i+1)/gores)*rx*2.4;
        const pair=cols[i%cols.length]; const g=ctx.createLinearGradient(0,cy-ry*1.1,0,cy+ry*1.2);
        g.addColorStop(0,pair[0]); g.addColorStop(1,pair[1]); ctx.fillStyle=g; ctx.fillRect(x0,cy-ry*1.3,x1-x0+1,ry*2.6); }
      // curvature shading: bright upper-left, dark lower-right
      let sh=ctx.createRadialGradient(cx-rx*0.35,cy-ry*0.5,rx*0.1, cx,cy,rx*1.3);
      sh.addColorStop(0,'rgba(255,255,255,0.38)'); sh.addColorStop(0.5,'rgba(255,255,255,0)'); sh.addColorStop(1,'rgba(20,10,30,0.34)');
      ctx.fillStyle=sh; ctx.fillRect(0,0,W,H);
      ctx.restore();
      // envelope outline
      ctx.lineWidth=3; ctx.strokeStyle='rgba(60,30,40,0.35)'; envelope(); ctx.stroke();
      // ropes
      ctx.strokeStyle='rgba(50,35,25,0.7)'; ctx.lineWidth=2.4;
      const by=cy+ry*1.62, bw=rx*0.42;
      [[-1],[1]].forEach(s=>{ ctx.beginPath(); ctx.moveTo(cx+s[0]*rx*0.7, cy+ry*1.05); ctx.lineTo(cx+s[0]*bw*0.9, by); ctx.stroke(); });
      // basket
      const bg=ctx.createLinearGradient(0,by,0,by+H*0.085); bg.addColorStop(0,'#9a6a3a'); bg.addColorStop(1,'#6e4421');
      ctx.fillStyle=bg; ctx.beginPath(); ctx.moveTo(cx-bw,by); ctx.lineTo(cx+bw,by); ctx.lineTo(cx+bw*0.82,by+H*0.085); ctx.lineTo(cx-bw*0.82,by+H*0.085); ctx.closePath(); ctx.fill();
      finish('balloon',c,ctx,4,false);
    })();

    // ===== BIRD FLOCK (small V-cluster silhouettes) =====
    (function(){ const W=320,H=160,c=mk(W,H),ctx=c.getContext('2d'); const rand=rng(3);
      ctx.strokeStyle='#3a4654'; ctx.lineCap='round'; ctx.fillStyle='#3a4654';
      function gull(x,y,s){ ctx.lineWidth=s*0.18; ctx.beginPath();
        ctx.moveTo(x-s, y+s*0.12); ctx.quadraticCurveTo(x-s*0.35, y-s*0.5, x, y);
        ctx.quadraticCurveTo(x+s*0.35, y-s*0.5, x+s, y+s*0.12); ctx.stroke(); }
      const pts=[[0.5,0.32,30],[0.32,0.5,24],[0.68,0.52,24],[0.2,0.72,18],[0.8,0.74,18],[0.5,0.66,20]];
      pts.forEach(p=>gull(p[0]*W,p[1]*H,p[2]*(0.85+rand()*0.3)));
      finish('birdv',c,ctx,3,false);
    })();

    // ===== SOARING EAGLE (single broad-wing silhouette) =====
    (function(){ const W=320,H=200,c=mk(W,H),ctx=c.getContext('2d');
      const cx=W*0.5, cy=H*0.5; ctx.fillStyle='#2c2620';
      ctx.beginPath();
      ctx.moveTo(cx, cy-H*0.16);                                  // head/top
      ctx.bezierCurveTo(cx+W*0.06, cy-H*0.05, cx+W*0.18, cy-H*0.16, cx+W*0.42, cy-H*0.3); // right wing top
      ctx.bezierCurveTo(cx+W*0.30, cy-H*0.02, cx+W*0.30, cy+H*0.06, cx+W*0.12, cy+H*0.05); // right wing under
      ctx.bezierCurveTo(cx+W*0.06, cy+H*0.22, cx+W*0.02, cy+H*0.28, cx, cy+H*0.30);        // tail right
      ctx.bezierCurveTo(cx-W*0.02, cy+H*0.28, cx-W*0.06, cy+H*0.22, cx-W*0.12, cy+H*0.05); // tail left
      ctx.bezierCurveTo(cx-W*0.30, cy+H*0.06, cx-W*0.30, cy-H*0.02, cx-W*0.42, cy-H*0.3);  // left wing under
      ctx.bezierCurveTo(cx-W*0.18, cy-H*0.16, cx-W*0.06, cy-H*0.05, cx, cy-H*0.16);        // left wing top
      ctx.closePath(); ctx.fill();
      // faint wing highlight
      ctx.globalAlpha=0.18; ctx.fillStyle='#6a5e4a';
      ctx.beginPath(); ctx.ellipse(cx, cy-H*0.02, W*0.30, H*0.06, 0, 0, 6.28); ctx.fill(); ctx.globalAlpha=1;
      finish('eagle',c,ctx,3,false);
    })();

    // ===== BUTTERFLY (two-tone wings, rim, body + antennae) =====
    (function(){ const W=256,H=256,c=mk(W,H),ctx=c.getContext('2d');
      const cx=W*0.5, cy=H*0.5, rx=W*0.2, ry=H*0.22;
      function side(sx){ ctx.save(); ctx.translate(cx,cy); ctx.scale(sx,1);
        const gu=ctx.createRadialGradient(rx*0.4,-ry*0.4,2, rx*0.5,-ry*0.35,rx*1.1);
        gu.addColorStop(0,'#ffd24a'); gu.addColorStop(0.6,'#ff8a2a'); gu.addColorStop(1,'#e85d1a');
        ctx.fillStyle=gu; ctx.beginPath(); ctx.ellipse(rx*0.55,-ry*0.4, rx*0.6, ry*0.5, -0.5, 0,6.28); ctx.fill();
        ctx.lineWidth=5; ctx.strokeStyle='#3a1c08'; ctx.stroke();
        const gl=ctx.createRadialGradient(rx*0.4,ry*0.4,2, rx*0.45,ry*0.35,rx*0.9);
        gl.addColorStop(0,'#ffb03a'); gl.addColorStop(1,'#d8541a');
        ctx.fillStyle=gl; ctx.beginPath(); ctx.ellipse(rx*0.46,ry*0.42, rx*0.46, ry*0.4, 0.4, 0,6.28); ctx.fill(); ctx.stroke();
        ctx.fillStyle='rgba(255,255,255,0.92)'; ctx.beginPath(); ctx.arc(rx*0.85,-ry*0.5,5,0,6.28); ctx.fill();
        ctx.beginPath(); ctx.arc(rx*0.6,-ry*0.2,3.5,0,6.28); ctx.fill();
        ctx.restore(); }
      side(1); side(-1);
      // body
      ctx.fillStyle='#241208'; ctx.beginPath(); ctx.ellipse(cx,cy, W*0.022, H*0.2, 0,0,6.28); ctx.fill();
      // antennae
      ctx.strokeStyle='#241208'; ctx.lineWidth=3; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(cx,cy-H*0.18); ctx.quadraticCurveTo(cx-W*0.06,cy-H*0.3, cx-W*0.1,cy-H*0.32); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx,cy-H*0.18); ctx.quadraticCurveTo(cx+W*0.06,cy-H*0.3, cx+W*0.1,cy-H*0.32); ctx.stroke();
      finish('butterfly',c,ctx,4,false);
    })();

    // ===== SPACE: NEBULA (far colourful cloud band, tileable) =====
    (function(){ const W=1280,H=448,c=mk(W,H),ctx=c.getContext('2d'); const rand=rng(71);
      function neb(cx,cy,r,col){ const g=ctx.createRadialGradient(cx,cy,0,cx,cy,r);
        g.addColorStop(0,col.replace('A','0.5')); g.addColorStop(0.5,col.replace('A','0.16')); g.addColorStop(1,col.replace('A','0'));
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,r,0,6.28); ctx.fill(); }
      const cols=['rgba(150,70,220,A)','rgba(220,60,150,A)','rgba(60,120,230,A)','rgba(90,200,210,A)'];
      for(let i=0;i<14;i++){ const cx=rand()*W, cy=H*(0.18+rand()*0.72), r=170+rand()*320, col=cols[(rand()*cols.length)|0];
        for(let k=0;k<3;k++){ const ox=(rand()-0.5)*r, oy=(rand()-0.5)*r*0.6, rr=r*(0.6+rand()*0.6);
          neb(cx+ox,cy+oy,rr,col); neb(cx+ox-W,cy+oy,rr,col); neb(cx+ox+W,cy+oy,rr,col); } }
      ctx.fillStyle='#ffffff'; for(let i=0;i<420;i++){ const x=rand()*W,y=rand()*H,s=rand()*1.6+0.3; ctx.globalAlpha=0.25+rand()*0.7; ctx.fillRect(x,y,s,s); } ctx.globalAlpha=1;
      finish('space_nebula',c,ctx,3,true);
    })();

    // ===== SPACE: GALAXY (diagonal dust band + star clusters, tileable) =====
    (function(){ const W=1280,H=384,c=mk(W,H),ctx=c.getContext('2d'); const rand=rng(88);
      ctx.save(); ctx.translate(W/2,H/2); ctx.rotate(-0.17); ctx.translate(-W/2,-H/2);
      const g=ctx.createLinearGradient(0,H*0.32,0,H*0.68); g.addColorStop(0,'rgba(120,80,200,0)'); g.addColorStop(0.5,'rgba(160,125,235,0.5)'); g.addColorStop(1,'rgba(80,140,210,0)');
      ctx.fillStyle=g; ctx.fillRect(-W,H*0.32,W*3,H*0.36);
      for(let i=0;i<26;i++){ const x=rand()*W, y=H*0.5+(rand()-0.5)*H*0.16, r=30+rand()*95; const rg=ctx.createRadialGradient(x,y,0,x,y,r); rg.addColorStop(0,'rgba(235,215,255,0.45)'); rg.addColorStop(1,'rgba(235,215,255,0)'); ctx.fillStyle=rg; ctx.beginPath(); ctx.arc(x,y,r,0,6.28); ctx.fill(); }
      ctx.restore();
      ctx.fillStyle='#ffffff'; for(let i=0;i<320;i++){ const x=rand()*W,y=rand()*H,s=rand()*1.8+0.3; ctx.globalAlpha=0.3+rand()*0.7; ctx.fillRect(x,y,s,s); } ctx.globalAlpha=1;
      finish('space_galaxy',c,ctx,3,true);
    })();

    // ===== SPACE: PLANETS (distant lit planet discs + bright stars, tileable) =====
    (function(){ const W=1280,H=384,c=mk(W,H),ctx=c.getContext('2d'); const rand=rng(102);
      function planet(cx,cy,r,c1,c2,rim){
        const g=ctx.createRadialGradient(cx-r*0.32,cy-r*0.32,r*0.1,cx,cy,r); g.addColorStop(0,c1); g.addColorStop(0.7,c2); g.addColorStop(1,'#0a0a18');
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,r,0,6.28); ctx.fill();
        const sg=ctx.createRadialGradient(cx+r*0.5,cy+r*0.42,r*0.1,cx,cy,r*1.3); sg.addColorStop(0,'rgba(0,0,12,0)'); sg.addColorStop(1,'rgba(0,0,12,0.7)'); ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(cx,cy,r,0,6.28); ctx.fill();
        ctx.lineWidth=Math.max(2,r*0.045); ctx.strokeStyle=rim; ctx.globalAlpha=0.6; ctx.beginPath(); ctx.arc(cx,cy,r*0.985,-2.5,-0.5); ctx.stroke(); ctx.globalAlpha=1;
      }
      planet(W*0.17,H*0.42,96,'#caa37a','#8a5a3a','#ffd9a0');
      planet(W*0.58,H*0.55,140,'#7fa8d8','#3a5a8c','#bfe0ff');
      planet(W*0.86,H*0.30,70,'#b98fd0','#6a3f8c','#e8c8ff');
      ctx.fillStyle='#ffffff'; for(let i=0;i<220;i++){ const x=rand()*W,y=rand()*H,s=rand()*1.8+0.3; ctx.globalAlpha=0.3+rand()*0.7; ctx.fillRect(x,y,s,s); } ctx.globalAlpha=1;
      finish('space_planets',c,ctx,3,true);
    })();

    // ===== OCEAN: TRENCH (deep-water gradient + soft god-ray columns + biolume glow + marine snow) =====
    (function(){ const W=1280,H=448,c=mk(W,H),ctx=c.getContext('2d'); const rand=rng(201);
      ctx.fillStyle=vgrad(ctx,0,0,H,[[0,'#0e5a78'],[0.45,'#073650'],[1,'#02101c']]); ctx.fillRect(0,0,W,H);
      // soft overlapping light columns descending from the surface
      for(let i=0;i<13;i++){ const x=rand()*W, w=50+rand()*120; const g=ctx.createLinearGradient(x,0,x+w*0.4,H);
        g.addColorStop(0,'rgba(160,230,255,'+(0.05+rand()*0.07)+')'); g.addColorStop(0.55,'rgba(120,200,235,0.025)'); g.addColorStop(1,'rgba(120,200,235,0)');
        ctx.fillStyle=g; ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x+w,0); ctx.lineTo(x+w*1.6,H); ctx.lineTo(x+w*0.4,H); ctx.closePath(); ctx.fill(); }
      // faint biolume glow blobs in the deep
      for(let i=0;i<9;i++){ const x=rand()*W,y=H*0.3+rand()*H*0.6,r=24+rand()*70; const col=['120,210,255','120,255,210','170,130,235'][(rand()*3)|0];
        const g=ctx.createRadialGradient(x,y,0,x,y,r); g.addColorStop(0,'rgba('+col+','+(0.05+rand()*0.06)+')'); g.addColorStop(1,'rgba('+col+',0)'); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,r,0,6.28); ctx.fill(); }
      // marine snow, denser/brighter toward the lit top
      for(let i=0;i<340;i++){ const x=rand()*W,y=rand()*H,s=rand()*1.6+0.3; ctx.fillStyle='#cdf2ff'; ctx.globalAlpha=(0.04+rand()*0.22)*(1-y/H*0.5); ctx.fillRect(x,y,s,s);} ctx.globalAlpha=1;
      finish('ocean_trench',c,ctx,3,true);
    })();

    // ===== OCEAN: KELP FOREST (layered swaying strands + bladed fronds, tileable) =====
    (function(){ const W=2048,H=512,c=mk(W,H),ctx=c.getContext('2d'); const rand=rng(212);
      const baseY=H*1.02;
      ctx.fillStyle=vgrad(ctx,0,H*0.42,H,[[0,'rgba(6,42,54,0)'],[1,'rgba(4,30,42,0.92)']]); ctx.fillRect(0,H*0.42,W,H*0.58);
      // two passes: a darker, shorter BACK layer then a brighter FRONT layer (parallax depth within the silhouette)
      [{N:60,thA:120,thB:200,wA:7,wB:11,c0:'#0f4a3c',c1:'#062018',al:0.85},
       {N:80,thA:170,thB:300,wA:9,wB:16,c0:'#1a6e58',c1:'#08352a',al:1}].forEach(P=>{
        for(let i=0;i<P.N;i++){ const x=(i/P.N)*W+(rand()-0.5)*26; const th=P.thA+rand()*(P.thB-P.thA); const w=P.wA+rand()*(P.wB-P.wA);
          const sway=(rand()-0.5)*140, topY=baseY-th;
          ctx.globalAlpha=P.al; const g=vgrad(ctx,0,topY,baseY,[[0,P.c0],[1,P.c1]]); ctx.strokeStyle=g; ctx.lineWidth=w; ctx.lineCap='round';
          ctx.beginPath(); ctx.moveTo(x,baseY); ctx.bezierCurveTo(x+sway*0.3,baseY-th*0.4, x+sway*0.7,baseY-th*0.75, x+sway,topY); ctx.stroke();
          // bladed leaves along the stalk
          ctx.fillStyle=P.c0; for(let k=0;k<5;k++){ const f=0.2+k*0.17; const lx=x+sway*f, ly=baseY-th*f; const dir=k%2?1:-1;
            ctx.save(); ctx.translate(lx,ly); ctx.rotate(dir*0.7+sway*0.002); ctx.globalAlpha=P.al*0.6; ctx.beginPath(); ctx.ellipse(dir*w*1.3,0,w*2.2,w*0.55,0,0,6.28); ctx.fill(); ctx.restore(); }
          ctx.globalAlpha=1;
        }
      });
      finish('ocean_kelp',c,ctx,4,true);
    })();

    // ===== OCEAN: REEF (near seabed ridge studded with real coral silhouettes, tileable) =====
    (function(){ const W=2048,H=420,c=mk(W,H),ctx=c.getContext('2d'); const rand=rng(223);
      const harm=harmonics(rand,5), base=H*1.06, amp=H*0.5;
      ctx.save(); ridgePath(ctx,W,H,base,amp,harm);
      ctx.fillStyle=vgrad(ctx,0,base-amp,base,[[0,'#125a6a'],[1,'#04222e']]); ctx.fill(); ctx.clip();
      const cols=['#27a89a','#37b074','#e06a86','#ec9a44','#a878e0','#46c0d0'];
      function coral(x,y,r,col){ ctx.fillStyle=col; ctx.strokeStyle=col; const t=(rand()*3)|0;
        if(t===0){ ctx.lineCap='round'; const nb=4+(rand()*3|0); for(let b=0;b<nb;b++){ const a=-Math.PI/2+(rand()-0.5)*1.7, len=r*(0.8+rand()); ctx.lineWidth=Math.max(1.5,r*0.22);
            ctx.beginPath(); ctx.moveTo(x,y); ctx.quadraticCurveTo(x+Math.cos(a)*len*0.6,y+Math.sin(a)*len*0.6, x+Math.cos(a)*len,y+Math.sin(a)*len); ctx.stroke(); } }
        else if(t===1){ ctx.beginPath(); ctx.ellipse(x,y,r,r*0.72,0,Math.PI,2*Math.PI); ctx.fill(); for(let g=0;g<4;g++){ ctx.globalAlpha*=0.9; ctx.beginPath(); ctx.ellipse(x+(rand()-0.5)*r,y-rand()*r*0.4,r*0.3,r*0.5,0,Math.PI,2*Math.PI); ctx.fill(); } }
        else { ctx.lineWidth=Math.max(1,r*0.1); for(let b=0;b<7;b++){ const a=-Math.PI/2+(b/6-0.5)*1.5; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+Math.cos(a)*r*1.4,y+Math.sin(a)*r*1.4); ctx.stroke(); } } }
      // far (small, dim) then near (larger, brighter) coral passes for depth
      for(const P of [{n:150,rA:4,rB:10,al:0.4},{n:120,rA:9,rB:22,al:0.72}]){
        for(let k=0;k<P.n;k++){ const x=rand()*W; const u=x/W*Math.PI*2; const y=base-heightAt(u,harm)*amp+rand()*40;
          ctx.globalAlpha=P.al; coral(x,y,P.rA+rand()*(P.rB-P.rA),cols[(rand()*cols.length)|0]); }
      }
      ctx.globalAlpha=1; ctx.restore();
      finish('ocean_reef',c,ctx,5,true);
    })();

    // ===== RUINS: CANOPY RIDGE (misty jungle ridgeline with warm temple light) =====
    (function(){ const W=2048,H=520,c=mk(W,H),ctx=c.getContext('2d'); const rand=rng(301);
      ctx.fillStyle=vgrad(ctx,0,0,H,[[0,'rgba(110,144,168,0.12)'],[0.58,'rgba(140,154,104,0.18)'],[1,'rgba(70,90,48,0.76)']]); ctx.fillRect(0,0,W,H);
      const order=[{base:H*1.05,amp:H*0.28,top:'#789260',bot:'#3d5a35',al:0.48,h:harmonics(rand,5)},
                   {base:H*1.08,amp:H*0.42,top:'#66834f',bot:'#25422b',al:0.78,h:harmonics(rand,6)}];
      order.forEach(r=>{ ctx.save(); ridgePath(ctx,W,H,r.base,r.amp,r.h); ctx.globalAlpha=r.al; ctx.fillStyle=vgrad(ctx,0,r.base-r.amp,r.base,[[0,r.top],[1,r.bot]]); ctx.fill(); ctx.restore(); });
      for(let i=0;i<120;i++){ const x=rand()*W,y=H*(0.58+rand()*0.38),r=4+rand()*14; ctx.globalAlpha=0.12+rand()*0.18; ctx.fillStyle=rand()>0.5?'#b6c485':'#314d2e'; ctx.beginPath(); ctx.arc(x,y,r,0,6.28); ctx.fill(); }
      for(let i=0;i<9;i++){ const x=rand()*W,w=90+rand()*160; const g=ctx.createLinearGradient(x,0,x+w*0.3,H); g.addColorStop(0,'rgba(255,240,192,0.08)'); g.addColorStop(1,'rgba(255,240,192,0)'); ctx.fillStyle=g; ctx.globalAlpha=1; ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x+w,0); ctx.lineTo(x+w*1.45,H); ctx.lineTo(x+w*0.35,H); ctx.closePath(); ctx.fill(); }
      ctx.globalAlpha=1; finish('ruins_canopy',c,ctx,5,true);
    })();

    // ===== RUINS: TEMPLE SILHOUETTE (stepped pyramids, arches, palms, tileable) =====
    (function(){ const W=2048,H=460,c=mk(W,H),ctx=c.getContext('2d'); const rand=rng(312);
      ctx.fillStyle=vgrad(ctx,0,H*0.22,H,[[0,'rgba(227,212,168,0)'],[1,'rgba(77,74,42,0.72)']]); ctx.fillRect(0,0,W,H);
      function temple(cx,base,s,al){ ctx.globalAlpha=al; ctx.fillStyle='#8f7b55';
        for(let i=0;i<5;i++){ const w=s*(1-i*0.16),h=s*0.11; ctx.fillRect(cx-w/2,base-h*(i+1),w,h); }
        ctx.fillStyle='#725f42'; ctx.fillRect(cx-s*0.16,base-s*0.78,s*0.32,s*0.18);
        ctx.fillStyle='#31482d'; for(let k=-2;k<=2;k++){ ctx.beginPath(); ctx.ellipse(cx+k*s*0.18,base-s*(0.18+rand()*0.45),s*(0.04+rand()*0.04),s*(0.18+rand()*0.2),rand()*1.2,0,6.28); ctx.fill(); }
        ctx.globalAlpha=1; }
      for(let i=0;i<7;i++) temple((i/7)*W+rand()*120,H*(0.72+rand()*0.2),180+rand()*180,0.35+rand()*0.35);
      ctx.strokeStyle='#6f603f'; ctx.lineWidth=18; ctx.globalAlpha=0.58;
      for(let i=0;i<8;i++){ const x=rand()*W,y=H*(0.62+rand()*0.22),r=35+rand()*42; ctx.beginPath(); ctx.arc(x,y,r,Math.PI,0); ctx.stroke(); }
      ctx.globalAlpha=1; finish('ruins_temple',c,ctx,5,true);
    })();

    // ===== RUINS: VINE CURTAIN (near hanging vines + leaf clusters, tileable alpha) =====
    (function(){ const W=2048,H=512,c=mk(W,H),ctx=c.getContext('2d'); const rand=rng(323);
      ctx.fillStyle=vgrad(ctx,0,H*0.35,H,[[0,'rgba(37,55,28,0)'],[1,'rgba(32,55,30,0.42)']]); ctx.fillRect(0,H*0.35,W,H*0.65);
      for(let i=0;i<95;i++){ const x=(i/95)*W+(rand()-0.5)*38, top=rand()*H*0.3, len=H*(0.35+rand()*0.55), sway=(rand()-0.5)*90;
        ctx.strokeStyle=rand()>0.45?'#315f29':'#4a7a32'; ctx.lineWidth=4+rand()*8; ctx.globalAlpha=0.45+rand()*0.38; ctx.beginPath(); ctx.moveTo(x,top); ctx.bezierCurveTo(x+sway*0.2,top+len*0.35,x+sway*0.75,top+len*0.7,x+sway,top+len); ctx.stroke();
        ctx.fillStyle=ctx.strokeStyle; for(let k=0;k<4;k++){ const f=0.18+k*0.2, lx=x+sway*f, ly=top+len*f; ctx.save(); ctx.translate(lx,ly); ctx.rotate((rand()-0.5)*1.4); ctx.beginPath(); ctx.ellipse(0,0,7+rand()*11,3+rand()*7,0,0,6.28); ctx.fill(); ctx.restore(); } }
      ctx.globalAlpha=1; finish('ruins_vines',c,ctx,5,true);
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
