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
import path from "path";

const client_id = "574961985a664031a4d935d187430793";
const client_secret = "35306bd544d34ec4840574956d9b402d";
const user_id = "122868332"
// const env = "spotify.env";
const db = "output/data.json"
// let token = {};
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

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

const query = async (track, artist, token) => {
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
  // else console.log(result.tracks.items.map(m=>m.uri))
  return result
}

// 每一个epoch最多搜四次
// 全名一次
// 去掉尾首尾的数字一次
// 去掉艺术家与前两者各组合一次
export async function epoch(track, artist, token) {
  let data = await query(track, artist, token)
  if (data.tracks.total > 0) return data.tracks.items;
  const track1 = track.replace(/^\d+(\.\d+)?/, '').replace(/\d+(\.\d+)?$/, '')
  if (track1 != track) {
    console.log("retry", track1, track, track == track1);
    const data2 = await query(track1, artist, token); // try 1
    if (data2.tracks.total > 0) return data2.tracks.items;
  }
  return data.tracks.items; // 暂时不做无艺术家的搜索
  // data = await query(track, ''); // try 2
  // if (data.tracks.items.length > 0) return data;
  // if (track1 == track) return data;
  // return await query(track1, '') // try 3 条件最宽松，匹配度最低
}

export async function get_db(from, to) {
  try {
    await fs.promises.access(db, fs.constants.R_OK | fs.constants.W_OK);
    const text = await fs.promises.readFile(db, { encoding: 'utf-8' })
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

export async function create_playlist(vol, user_id, token) {
  const name = `Luoo radio ${vol.title.replace(/^vol/, 'Vol')}`;
  const body = {
    "name": name,
    "description": vol.desc.replace(/\n/g, '  '),
    "public": false
  };
  const response = await fetch(`https://api.spotify.com/v1/users/${user_id}/playlists`, {
    method: "POST",
    body: JSON.stringify(body),// 文档说要json，其实是要string
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const playlist = await response.json()
  if (playlist.error) console.error(playlist.error)
  else console.log('create playlist: %s, id: %s', name, playlist.id);

  await fill_playlist(vol, playlist.id, token)
  // return playlist;
}

const fill_playlist = async (vol, pid, token) => {
  // 找出vol的tracks，用歌名+歌手精确匹配，找到了就add进去
  let tracks = []
  for (const m of vol.musics) {
    const results = await epoch(m.name, m.author, token)
    if (results.length > 0) {
      const track = results[0]; // 使用匹配出来的第一个
      tracks.push(track.uri)
    }
    await sleep(500);
  }
  // await Promise.all(vol.musics.map(async m => {
  //   const results = await epoch(m.name, m.author, token)
  //   if (results.length > 0) {
  //     const track = results[0]; // 使用匹配出来的第一个
  //     tracks.push(track.uri)
  //   }
  // }));
  const body = { "uris": tracks, "position": 0 }
  console.log("playlist %s spotify:playlist:%s\n", vol.title, pid, body)
  if (tracks.length == 0) return
  const response = await fetch(`https://api.spotify.com/v1/playlists/${pid}/tracks`, {
    method: "POST",
    body: JSON.stringify(body),// 文档说要json，其实是要string
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  const result = await response.json()
  if (result.error) console.error(result.error)
  console.log(vol.title, 'done')
}

export const change_playlist = async (token) => {
  try {
    await fs.promises.access(db, fs.constants.R_OK | fs.constants.W_OK);
    const text = await fs.promises.readFile(db, { encoding: 'utf-8' })
    const data = JSON.parse(text)

    let response = await fetch(`https://api.spotify.com/v1/users/${user_id}/playlists?limit=50&offset=0`, {
      method: "GET",
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    let result = await response.json()
    for (const m of result.items) {
      const match = m.name.match(/vol\.(\d+)/i);
      if (!match || match.length != 2) continue;
      const key = `vol_${match[1]}`
      if (!Object.hasOwnProperty.call(data, key)) continue;
      const element = data[key];
      let desc = element.desc;
      if (desc.length == 0) continue;
      desc = desc.replace(/\n/g, '  ');

      // 修改desc
      const body = {
        "description": desc
      }
      console.log("do put for", m.name)
      const resp = await fetch(`https://api.spotify.com/v1/playlists/${m.id}`, {
        method: "PUT",
        body: JSON.stringify(body),
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log(await resp.text());
      console.log(m.name, 'done');
      console.log(desc)
    }
  } catch { }
}

export const cover_playlist = async (token) => {
    let response = await fetch(`https://api.spotify.com/v1/users/${user_id}/playlists?limit=50&offset=0`, {
      method: "GET",
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    let result = await response.json()
    for (const m of result.items) {
      const match = m.name.match(/vol\.(\d+)/i);
      if (!match || match.length != 2) {
        console.log(m.name);
        continue;
      }
      const vol_num = match[1]
      const key = `vol_${vol_num}`;
      const cover = path.resolve("output", `${vol_num}_cover.jpg`)
      console.log("reading file:", cover)
      try {
        await fs.promises.access(cover, fs.constants.R_OK | fs.constants.W_OK)
        const image = await fs.promises.readFile(cover)
        const data = Buffer.from(image).toString('base64')
        const resp = await fetch(`https://api.spotify.com/v1/playlists/${m.id}/images`, {
          method: "PUT",
          body: data,
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const result = await resp.text()
        console.log(m.name, "ok", result)
      } catch (e){
        console.error(e)
      }
      // console.log(await resp.text());
      // console.log(m.name, 'done');
      // console.log(desc)
    }
}

(async () => {
  await cover_playlist('BQAaqv6N99YH2dixm8XpEI5jcXyn5N3Z5v1LLO-hZubM6sSXMNAPVV_FYpQ-HAFX606eqT-9YY2tQXahCVtFmE5_JOUzygbhRiuXuHWkpIGFDnV_3z_iz98c7jIHlE3mtbfD26C21aBE0L3-Wt7yO4M4Q-a_dP9PsiKTgpsx72tYC9_Nv8RP7eFQsJqMAdJqElnK-EpO-3QX48hM86tyrolKYWWeTxxW1AaOT8vmjlCQWj9VRgGyyvY4yBoa9PBwljeuqF1-iS3ydeW2sSI')
})()