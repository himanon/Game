/* Download CC0 ambientCG PBR sets for the ruins map.
   Usage: node tools/fetchruins.cjs [stoneId] [mossId] [floorId]
   Defaults favor warm worn stone + mossy ground. Installs selected maps into
   assets/textures/ruins/ as ruin_stone_*, ruin_moss_*, and ruin_floor_*.
   CC0 1.0 (public domain) — ambientcg.com. */
const fs=require('fs'), path=require('path'), https=require('https'), { execSync }=require('child_process');
const ROOT=path.join(__dirname,'..');
const DST=path.join(ROOT,'assets','textures','ruins');
const TMP='/tmp/ruinspack';
const SETS=[
  { prefix:'ruin_stone', id:process.argv[2]||'Rock035' },
  { prefix:'ruin_moss',  id:process.argv[3]||'Moss001' },
  { prefix:'ruin_floor', id:process.argv[4]||'Ground037' },
];
fs.mkdirSync(TMP,{recursive:true}); fs.mkdirSync(DST,{recursive:true});
function get(url,dest,redirs=0){ return new Promise((res,rej)=>{
  https.get(url,{headers:{'User-Agent':'Mozilla/5.0'}},r=>{
    if([301,302,303,307,308].includes(r.statusCode)&&r.headers.location&&redirs<5){ r.resume(); return res(get(r.headers.location,dest,redirs+1)); }
    if(r.statusCode!==200) return rej(new Error('HTTP '+r.statusCode+' '+url));
    const f=fs.createWriteStream(dest); r.pipe(f); f.on('finish',()=>f.close(()=>res(dest))); f.on('error',rej);
  }).on('error',rej);
}); }
function pick(files, suffix){ return files.find(f=>new RegExp('_'+suffix+'\\.jpg$','i').test(f)); }
(async()=>{
  for(const set of SETS){
    const zip=path.join(TMP,set.prefix+'.zip'), x=path.join(TMP,set.prefix);
    console.log('downloading ambientCG',set.id,'->',set.prefix);
    await get(`https://ambientcg.com/get?file=${set.id}_1K-JPG.zip`,zip);
    execSync(`rm -rf "${x}" && unzip -o -q "${zip}" -d "${x}"`);
    const files=fs.readdirSync(x);
    const wanted={ color:pick(files,'Color'), normal:pick(files,'NormalGL'), rough:pick(files,'Roughness'), ao:pick(files,'AmbientOcclusion') };
    if(!wanted.color||!wanted.normal) throw new Error('missing required maps for '+set.id+': '+files.join(','));
    for(const [kind,file] of Object.entries(wanted)){
      if(!file) continue;
      fs.copyFileSync(path.join(x,file), path.join(DST,set.prefix+'_'+kind+'.jpg'));
      console.log('  +',set.prefix+'_'+kind+'.jpg','<-',file);
    }
  }
  console.log('done');
})().catch(e=>{ console.error('FAIL',e.message); process.exit(1); });
