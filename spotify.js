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

//access_token=BQBLjxAhqSrd9DFd9Ni5S1GMafaP0rndmN1yGe-DfxHbcDzPiwju8dY7mL5yIIO7ocJQ-wQLqfvAp_5AV4DldiWtNZVB7KlXm5T0XlUVmqtQzx5d6sSatJTlkS-oYxiZlpGoJvuQQvvvv0Aaih7YsSxIRYpK1I9jp9ohPkbOH4v-yaRCaZ1oafRzavR2czk5
//refresh_token=AQDN38t3TW3ext4W23gcPy-t7rcNEkfg_WECvYT-EaxDLrZxAkFTvJbf4A0b5OLRlvulkJjahrOS_OVIY6whsL1ptXw007UiBgXnMcKwgHBXgfLGWwup3su197fisKKTmlw

// const cmd = `curl -X POST "https://accounts.spotify.com/api/token" \
// -H "Content-Type: application/x-www-form-urlencoded" \
// -d "grant_type=client_credentials&client_id=${client_id}&client_secret=${client_secret}"
// `;

// const response =  execSync(cmd);
// const result = response.toString();
// console.log(JSON.parse(result));

// client_credentials类型的token只能获取一些用户数据无关的
// 所以还是要走登录授权的authorization_codes机制
// const test_token = () => {
//   consolr.log(token.expires, date.now())
//   if (token.access_token.length == 0 || token.expires <= Date.now()) return Promise.resolve(false);
//   // 加入了过期时间，就不需要测试请求了
//   // const response = await fetch(`https://api.spotify.com/v1/search?q=hello&type=track`, {
//   //   method: "GET", 
//   //   headers: {
//   //     'Authorization': `Bearer ${token}`,
//   //     'Accept': 'application/json'
//   //   }
//   // })
//   // return response.status == 200
// }

// const refresh_token = async () => {
//   // const dict = {
//   //     grant_type: "client_credentials",
//   //     client_id: client_id,
//   //     client_secret: client_secret
//   // }
//   // const body = Object.entries(dict).map(([k, v]) => encodeURIComponent(k)+'='+encodeURIComponent(v)).join('&');
//   // e.g: `grant_type=client_credentials&client_id=${client_id}&client_secret=${client_secret}`;

//   const response = await fetch('https://accounts.spotify.com/api/token', {
//     method: 'POST',
//     body: new URLSearchParams({
//       'grant_type': 'client_credentials',
//     }),
//     headers: {
//       'Content-Type': 'application/x-www-form-urlencoded',
//       'Authorization': 'Basic ' + (Buffer.from(client_id + ':' + client_secret).toString('base64')),
//     },
//   });

//   const obj = await response.json()
//   // 将有效期转化为具体的时间点
//   obj.expires = Date.now() + (obj.expires_in - 100) * 1000
//   delete obj.expires_in
//   try {
//     await fs.promises.writeFile(env, JSON.stringify(obj))
//   } catch {}
// }

// const get_token = async() => {
//   try {
//     await fs.promises.access(env, fs.constants.R_OK | fs.constants.W_OK);
//     const text = await fs.promises.readFile(env, {encoding: 'utf-8'})
//     token = JSON.parse(text)
//     if (!test_token()) await refresh_token()
//   } catch {
//     await refresh_token()
//   }
// }

const query = async(track, artist, token) => {
  console.log('searching: %s - %s', track, artist);

  let q = `${track.trim()} artist:${artist.trim()}`
  q = encodeURIComponent(q)
  const response = await fetch(`https://api.spotify.com/v1/search?q=${q}&type=track`, {
    method: "GET", 
    headers: {
      'Authorization': `Bearer ${token}`,
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
export async function epoch (track, artist, token) {
  let data = await query(track, artist, token)
  if (data.tracks.items.length > 0) return data;
  const track1 = track.replace(/^\d+(\.\d+)?/, '').replace(/\d+(\.\d+)?$/, '')
  if (track1 != track) {
    const data2 = await query(track1, artist, token); // try 1
    if (data2.tracks.items.length > 0) return data2;
  }
  return data; // 暂时不做无艺术家的搜索
  // data = await query(track, ''); // try 2
  // if (data.tracks.items.length > 0) return data;
  // if (track1 == track) return data;
  // return await query(track1, '') // try 3 条件最宽松，匹配度最低
}

export async function get_db(from, to) {
  try {
      await fs.promises.access(db, fs.constants.R_OK | fs.constants.W_OK);
      const text = await fs.promises.readFile(db, {encoding: 'utf-8'})
      const data = JSON.parse(text)

      const titles = Object.keys(data).filter(m => {
        const vol = parseInt(m.replace("vol_", ""), 10);
        return vol >= from && vol <= to;
      })
      let output = [];
      titles.forEach(m => {
        output.push(data[m]);
      });
      return output;
      // Promise.all(titles.map(async key => {
      //   if (Object.hasOwnProperty.call(data, key)) {
      //     const vol = data[key];
      //     const playlist = await create_playlist(vol.title, vol.desc)
      //   }
      // }));
      
  } catch {
      
  }
}

export async function create_playlist (name, desc, user_id, token) {
  const body = {
    "name": name,
    "description": desc,
    "public": false
  };
  const response = await fetch(`https://api.spotify.com/v1/users/${user_id}/playlists`, {
    method: "POST",
    body: body,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  const playlist = await response.json()
  if (playlist.error) console.error(playlist.error)
  else console.log('create:', name, playlist.id)//.id, playlist.uri)
}

export function aaa(a, b) {
  console.log(a, b)
}

// TODO: playlist cover image

(async() => {

  // const data = await epoch("Des Wotans schwarzer Haufen", "Absurd")
  // if (!data.tracks || data.tracks.items.length == 0) return;

  // data.tracks.items.forEach( m => {
  //   let output = m.name;
  //   output += ' - ';
  //   output +=  m.artists.map(a => a.name).join(',')
  //   console.log(output)
  // })

  // 1. 遍历db, 每一期建一个playlist（一次性跑批）
  // 2. 遍历playlist, 匹配vol，每个track搜索一次，完全匹配上则添加到playlist
  // 3. 为了不反复update playlist，先把spotify track id集合做好再调步骤2

//   try {
//       await fs.promises.access(db, fs.constants.R_OK | fs.constants.W_OK);
//       const text = await fs.promises.readFile(db, {encoding: 'utf-8'})
//       const data = JSON.parse(text)

//       // for (const key in data) {
//       //   if (Object.hasOwnProperty.call(data, key)) {
//       //     const vol = data[key];
//       //     const playlist = await create_playlist(vol.title, vol.desc)
//       //   }
//       // }
//       const titles = Object.keys(data).slice(0,3);
//       // for (let index = 0; index < titles.length; index++) {
//       //   const key = titles[index];
//       //   if (Object.hasOwnProperty.call(data, key)) {
//       //     const vol = data[key];
//       //     const playlist = await create_playlist(vol.title, vol.desc)
//       //   }
//       // }
//       Promise.all(titles.map(async key => {
//         if (Object.hasOwnProperty.call(data, key)) {
//           const vol = data[key];
//           const playlist = await create_playlist(vol.title, vol.desc)
//         }
//       }));
      
//   } catch {
      
//   }
})()