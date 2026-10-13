const http=require('http'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'dist');
const types={'.html':'text/html; charset=utf-8','.md':'text/markdown; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.webp':'image/webp','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.avif':'image/avif','.png':'image/png','.svg':'image/svg+xml','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav'};
const port=Number(process.env.PORT||4173);

function isGoogleMapsUrl(value){
  try {
    const url=new URL(value);
    return url.protocol==='https:' && (url.hostname==='maps.app.goo.gl'||url.hostname==='goo.gl'||url.hostname==='google.com'||url.hostname.endsWith('.google.com'));
  } catch { return false; }
}

function coordinates(value){
  const decoded=decodeURIComponent(value);
  const match=decoded.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/)||decoded.match(/[?&](?:q|query|destination)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/)||decoded.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  return match ? [match[1],match[2]] : null;
}

async function resolveGoogleMapsEmbed(value){
  if(!isGoogleMapsUrl(value)) throw new Error('Chỉ hỗ trợ liên kết Google Maps dùng HTTPS.');
  let point=coordinates(value);
  if(!point){
    const response=await fetch(value,{redirect:'manual',headers:{'User-Agent':'Mozilla/5.0'}});
    const location=response.headers.get('location');
    if(location) point=coordinates(new URL(location,value).href);
  }
  if(!point) throw new Error('Không tìm thấy tọa độ trong liên kết Google Maps. Hãy tạo lại link bằng nút Chia sẻ trên Google Maps.');
  return `https://www.google.com/maps/embed?origin=mfe&pb=!1m3!2m1!1s${point[0]},${point[1]}!6i17`;
}

async function serve(req,res){
  let requestUrl;
  try{requestUrl=new URL(req.url,'http://localhost');}catch{res.writeHead(400).end();return;}
  if(requestUrl.pathname==='/api/google-maps-embed'){
    try{
      const target=await resolveGoogleMapsEmbed(requestUrl.searchParams.get('url')||'');
      res.writeHead(302,{Location:target,'Cache-Control':'no-store'}).end();
    }catch(error){
      res.writeHead(400,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}).end(`Không thể hiển thị bản đồ.\n${error.message}`);
    }
    return;
  }
  let pathname;
  try{pathname=decodeURIComponent(requestUrl.pathname);}catch{res.writeHead(400).end();return;}
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.stat(file,(err,stat)=>{
    if(err||!stat.isFile()){res.writeHead(404).end('Not found');return;}
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':stat.size});
    fs.createReadStream(file).pipe(res);
  });
}

if(require.main===module) http.createServer((req,res)=>serve(req,res)).listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}`));
module.exports={coordinates,isGoogleMapsUrl,resolveGoogleMapsEmbed,serve};
