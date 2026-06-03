/* Curate a subset of the Kenney Space Kit (CC0) for the space theme. The GLBs are
   self-contained (geometry + embedded colormap texture) and tiny, so we just copy the
   chosen .glb files flat into assets/models/space/.
   Source: /tmp/packC/x/Models/GLTF format   ->  assets/models/space/
   Run: node tools/preppackC.cjs */
const fs=require('fs'), path=require('path');
const SRC='/tmp/packC/x/Models/GLTF format';
const DEST=path.join(__dirname,'..','assets','models','space');
fs.mkdirSync(DEST,{recursive:true});

const CHOSEN=[
  // landmarks: drifting freighter + distant station
  'craft_cargoA','hangar_largeA',
  // asteroid belt: meteors + rocks + crystal pops + small debris
  'meteor_detailed','rock_largeA','rock_largeB','rocks_smallA','rock_crystalsLargeA','rock_crystalsLargeB',
  // debris: satellite + drifting speeder
  'satelliteDish','craft_speederB'
];

let n=0;
for(const m of CHOSEN){
  const sp=path.join(SRC,m+'.glb');
  if(!fs.existsSync(sp)){ console.log('MISSING',m); continue; }
  fs.copyFileSync(sp, path.join(DEST,m+'.glb')); n++;
}
fs.writeFileSync(path.join(DEST,'CREDITS.txt'),
`Space Kit (2.0) by Kenney (www.kenney.nl)
License: CC0 1.0 Universal (Public Domain) - https://creativecommons.org/publicdomain/zero/1.0/
Free for personal, educational and commercial use. Crediting Kenney is appreciated (not required).
Curated subset; self-contained glTF-binary (.glb) variants used as-is.
`);
const total=fs.readdirSync(DEST).reduce((s,f)=>s+fs.statSync(path.join(DEST,f)).size,0);
console.log('copied',n,'| files',fs.readdirSync(DEST).length,'| total',Math.round(total/1024)+'kb');
