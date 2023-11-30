// const http = require('http');
// const https = require('https');
// const fs = require('fs');
import http from 'http'
import https from 'https'
import fs from 'fs'

const url = 'https://luoow.wxwenku.com/999/cover.jpg';
const fileName = 'output.jpg';

// 根据 URL 的协议选择适当的模块
const client = url.startsWith('https') ? https : http;

client.get(url, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    fs.writeFile(fileName, data, (err) => {
      if (err) {
        console.error(`写入文件错误：${err}`);
        return;
      }
      console.log(`内容已写入到 ${fileName}`);
    });
  });
}).on('error', (err) => {
  console.error(`请求错误：${err}`);
});