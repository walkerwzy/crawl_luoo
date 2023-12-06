import express from "express"
import request from "request"
import crypto from "crypto"
import cors from "cors"
import querystring from "querystring"
import cookieParser from "cookie-parser"
import * as fs from "fs"
import * as client from "./spotify.js"
;

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

var client_id = '574961985a664031a4d935d187430793'; // your clientId
var client_secret = '35306bd544d34ec4840574956d9b402d'; // Your secret
var redirect_uri = 'http://localhost:3333/callback'; // Your redirect uri


const generateRandomString = (length) => {
  return crypto
  .randomBytes(60)
  .toString('hex')
  .slice(0, length);
}

var stateKey = 'spotify_auth_state';

var app = express();

app.use(express.static(__dirname + '/public'))
   .use(cors())
   .use(cookieParser());

function extractToken (req) {
  if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
      return req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
      return req.query.token;
  }
  return null;
}

app.get('/login', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);
// your application requests authorization

  // https://developer.spotify.com/documentation/web-api/concepts/scopes
  // playlist-read-private playlist-read-collaborative playlist-modify-private playlist-modify-public  
  // var scope = 'user-read-private user-read-email user-library-read playlist-modify-public';
  var scope = 'user-read-private playlist-read-private playlist-modify-public playlist-modify-private';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get('/callback', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + (new Buffer.from(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
            refresh_token = body.refresh_token;
        console.log(body);

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          console.log(body);

          // we can also pass the token to the browser to make requests from there
          res.redirect('/#' +
            querystring.stringify({
              access_token: access_token,
              refresh_token: refresh_token,
              user_id: body.id
            }));
        });
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

app.get('/playlist/create/:uid/:from/:to', async (req, res) => {
  var token = extractToken(req)
  if (!token) res.status(401)
  console.log("token:", token)
  var from = req.params.from, to = req.params.to, user_id = req.params.uid;
  var list = await client.get_db(from ,to);
  Promise.all(list.map(async m => {
    await client.create_playlist(m.title, m.desc, token);
  }));
  res.status(200)
});

app.get('/refresh_token', function(req, res) {

  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 
      'content-type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + (new Buffer.from(client_id + ':' + client_secret).toString('base64')) 
    },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token,
          refresh_token = body.refresh_token;
      console.log(body)

      res.send({
        'access_token': access_token,
        'refresh_token': refresh_token
      });
    }
  });
});

const playlist = async (token) => {

  try {
    await fs.promises.access(db, fs.constants.R_OK | fs.constants.W_OK);
    const text = await fs.promises.readFile(db, {encoding: 'utf-8'})
    const data = JSON.parse(text)

    // for (const key in data) {
    //   if (Object.hasOwnProperty.call(data, key)) {
    //     const vol = data[key];
    //     const playlist = await create_playlist(vol.title, vol.desc)
    //   }
    // }
    const titles = Object.keys(data).slice(0,3);
    // for (let index = 0; index < titles.length; index++) {
    //   const key = titles[index];
    //   if (Object.hasOwnProperty.call(data, key)) {
    //     const vol = data[key];
    //     const playlist = await create_playlist(vol.title, vol.desc)
    //   }
    // }
    Promise.all(titles.map(async key => {
      if (Object.hasOwnProperty.call(data, key)) {
        const vol = data[key];
        const playlist = await create_playlist(vol.title, vol.desc)
      }
    }));
    
} catch {
    
}
}

console.log('Listening on 3333');
app.listen(3333);
