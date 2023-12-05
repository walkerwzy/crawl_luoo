// import * as http from "http"
// ;

// const hostname = '127.0.0.1';
// const port = 3333;

// const server = http.createServer((req, res) => {
//     let body = [];
//     req.on('data', (chunk) => {
//       body.push(chunk);
//     }).on('end', () => {
//       body = Buffer.concat(body).toString();
//       const data = JSON.parse(body);
//       console.log('Received JSON data: ', data);
//       res.statusCode = 200;
//       res.setHeader('Content-Type', 'text/plain');
//       res.end('Hello, World!\n');
//     });
//   });

// server.listen(port, hostname, () => {
//   console.log(`Server running at http://${hostname}:${port}/`);
// });

import { exec, execSync } from "child_process"
import * as fs from "fs"
;

const client_id = "574961985a664031a4d935d187430793";
const client_secret = "35306bd544d34ec4840574956d9b402d";
const user_id = "122868332"
const env = "spotify.env";
const db = "output/data.json"
let token = {};

// const cmd = `curl -X POST "https://accounts.spotify.com/api/token" \
// -H "Content-Type: application/x-www-form-urlencoded" \
// -d "grant_type=client_credentials&client_id=${client_id}&client_secret=${client_secret}"
// `;

// const response =  execSync(cmd);
// const result = response.toString();
// console.log(JSON.parse(result));


const test_token = () => {
  consolr.log(token.expires, date.now())
  if (token.access_token.length == 0 || token.expires <= Date.now()) return Promise.resolve(false);
  // 加入了过期时间，就不需要测试请求了
  // const response = await fetch(`https://api.spotify.com/v1/search?q=hello&type=track`, {
  //   method: "GET", 
  //   headers: {
  //     'Authorization': `Bearer ${token}`,
  //     'Accept': 'application/json'
  //   }
  // })
  // return response.status == 200
}

const refresh_token = async () => {
  const dict = {
      grant_type: "client_credentials",
      client_id: client_id,
      client_secret: client_secret
  }
  const body = Object.entries(dict).map(([k, v]) => encodeURIComponent(k)+'='+encodeURIComponent(v)).join('&');
  // e.g: `grant_type=client_credentials&client_id=${client_id}&client_secret=${client_secret}`;

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST", 
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body
  })
  const obj = await response.json()
  // 将有效期转化为具体的时间点
  obj.expires = Date.now() + (obj.expires_in - 100) * 1000
  delete obj.expires_in
  try {
    await fs.promises.writeFile(env, JSON.stringify(obj))
  } catch {}
}

const get_token = async() => {
  try {
    await fs.promises.access(env, fs.constants.R_OK | fs.constants.W_OK);
    const text = await fs.promises.readFile(env, {encoding: 'utf-8'})
    token = JSON.parse(text)
    if (!test_token()) await refresh_token()
  } catch {
    await refresh_token()
  }
}

const query = async(track, artist) => {
  await get_token();
  // console.log("token:", token.access_token)
  console.log('searching: %s - %s', track, artist);

  let q = `${track.trim()} artist:${artist.trim()}`
  q = encodeURIComponent(q)
  const response = await fetch(`https://api.spotify.com/v1/search?q=${q}&type=track`, {
    method: "GET", 
    headers: {
      'Authorization': `${token.token_type} ${token.access_token}`,
      'Accept': 'application/json'
    }
  })

  const result = await response.json()
  if (result.error) console.error(result.error)
  return result
}

// 每一个epoch最多搜四次
// 全名一次
// 去掉尾首尾的数字一次
// 去掉艺术家与前两者各组合一次
const epoch = async(track, artist) => {
  let data = await query(track, artist)
  if (data.tracks.items.length > 0) return data;
  const track1 = track.replace(/^\d+(\.\d+)?/, '').replace(/\d+(\.\d+)?$/, '')
  if (track1 != track) {
    const data2 = await query(track1, artist); // try 1
    if (data2.tracks.items.length > 0) return data2;
  }
  return data; // 暂时不做无艺术家的搜索
  // data = await query(track, ''); // try 2
  // if (data.tracks.items.length > 0) return data;
  // if (track1 == track) return data;
  // return await query(track1, '') // try 3 条件最宽松，匹配度最低
}

const create_playlist = async(name, desc) => {
  const body = {
    "name": name,
    "description": desc,
    "public": false
  };
  const response = await fetch(`https://api.spotify.com/v1/users/${user_id}/playlists`, {
    method: "POST",
    headers: {
      'Authorization': `${token.token_type} ${token.access_token}`,
      'Content-Type': 'application/json'
    },
    body: body
  })
}

(async() => {
  // const data = await epoch("Des Wotans schwarzer Haufen", "Absurd")
  // if (!data.tracks || data.tracks.items.length == 0) return;

  // data.tracks.items.forEach( m => {
  //   let output = m.name;
  //   output += ' - ';
  //   output +=  m.artists.map(a => a.name).join(',')
  //   console.log(output)
  // })

  // 1. 遍历db, 每一期建一个playlist
  // 2. 遍历vol，每个track搜索一次，完全匹配上则添加到playlist
  // 3. 为了不反复update playlist，先把spotify track id集合做好再调步骤1

  try {
      await fs.promises.access(db, fs.constants.R_OK | fs.constants.W_OK);
      const text = await fs.promises.readFile(db, {encoding: 'utf-8'})
      const data = JSON.parse(text)
      
  } catch {
      
  }
})()