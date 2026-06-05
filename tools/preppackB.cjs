/* Curate a subset of the KayKit Medieval Hexagon Pack (CC0) into the game.
   The whole pack shares ONE tiny 15.7KB atlas, so we just copy the chosen
   {model}.gltf + {model}.bin (flat) plus the single atlas; the gltf references
   the texture by bare filename so a flat folder resolves correctly.
   Source: /tmp/packB/x/...  ->  assets/models/build/
   Run: node tools/preppackB.cjs */
const fs=require('fs'), path=require('path');
const SRC='/tmp/packB/x/KayKit_Medieval_Hexagon_Pack_1.0_FREE';
const GL=path.join(SRC,'Assets','gltf');
const ATLAS=path.join(SRC,'Textures','hexagons_medieval.png');
const DEST=path.join(__dirname,'..','assets','models','build');
fs.mkdirSync(DEST,{recursive:true});

const CHOSEN=[
  'building_castle_red',      // far landmark
  'building_church_red','building_home_A_red','building_home_B_red','building_tavern_red',  // village
  'building_tower_base_red'   // pipes (crenellated, inverts cleanly)
];

function find(base){ // walk GL for {base}.gltf
  const stack=[GL];
  while(stack.length){ const d=stack.pop();
    for(const e of fs.readdirSync(d,{withFileTypes:true})){
      const p=path.join(d,e.name);
      if(e.isDirectory()) stack.push(p);
      else if(e.name===base+'.gltf') return p;
    }
  }
  return null;
}

let copied=0;
for(const m of CHOSEN){
  const gp=find(m);
  if(!gp){ console.log('MISSING',m); continue; }
  fs.copyFileSync(gp, path.join(DEST,m+'.gltf'));
  const j=JSON.parse(fs.readFileSync(gp));
  for(const b of (j.buffers||[])) if(b.uri && !b.uri.startsWith('data:'))
    fs.copyFileSync(path.join(path.dirname(gp), b.uri), path.join(DEST, b.uri));
  copied++;
}
fs.copyFileSync(ATLAS, path.join(DEST,'hexagons_medieval.png'));

fs.writeFileSync(path.join(DEST,'CREDITS.txt'),
`KayKit : Medieval Hexagon Pack (1.0 FREE) by Kay Lousberg (www.kaylousberg.com)
License: CC0 1.0 Universal (Public Domain) - https://creativecommons.org/publicdomain/zero/1.0/
Free for personal, educational and commercial use. Crediting Kay Lousberg is appreciated (not required).
Curated subset (castle, church, homes, tavern, tower); only the glTF variants are used; shared atlas hexagons_medieval.png.
`);

const total=fs.readdirSync(DEST).reduce((s,f)=>s+fs.statSync(path.join(DEST,f)).size,0);
console.log('models copied:',copied,'| files:',fs.readdirSync(DEST).length,'| total',Math.round(total/1024)+'kb');
