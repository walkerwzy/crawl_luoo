import puppeteer from "puppeteer"
import * as fs from "fs"
import path from "path"
;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function crawlImage(browser, url, fileName) {
    const location = path.resolve('output', fileName)
    console.log('crawling: %s\nsaving to %s', url, location)

    let retry = 0
    while (retry < 10) {
        try {
            const page = await browser.newPage();
            const response = await page.goto(url);
            const imageBuffer = await response.buffer();
            await fs.promises.writeFile(location, imageBuffer)   
            retry = 100 // 退出
        } catch {
            retry++
            await sleep(1000)
        }
    }

    // 拦截response的下载方式（如果要这么做，在网页的请求里就可以了）
    // page.on('response', async response => {
    //     const url = response.url();
    //     if (response.request().resourceType() === 'image') {
    //         response.buffer().then(file => {
    //             const fileName = url.split('/').pop();
    //             const filePath = path.resolve(__dirname, fileName);
    //             const writeStream = fs.createWriteStream(filePath);
    //             writeStream.write(file);
    //         });
    //     }
    // });

    // 截图的方式，这种方式不能保证图片尺寸匹配
    // await page.screenshot({ path: 'output2.jpg'})
    // page.goto(imageUrl)
    // .then(() => page.screenshot({ path: imagePath }))
    // .then(() => console.log(`Image ${imageNumber} saved to disk as ${imageName}`))
    // .catch(error => console.error(`Error saving image ${imageNumber}: ${error}`));
}

// (async () => {
//     const url = "https://www.luoow.com/999/"
//     var content = await fetch(url)
//     console.log(await content.text())
// })()

async function crawlPage(browser, vol, data) {
    const url = `https://www.luoow.com/${vol}/`;
    console.log("processing: %s", url);
    const page = await browser.newPage();
    // Optimisation
    await page.setRequestInterception(true);
    page.on('request', (req) => {
        const rstype = req.resourceType();
        if (rstype in ['font', 'image', 'media', 'stylesheet']) req.abort();
        else req.continue();
    });
    const response = await page.goto(url);
    // await page.waitForNetworkIdle();
    const source = await response.text(); // 直接返回的page
    const html = await page.content(); // 渲染后的page
    // console.log(source)

    let covername = ""
    const musics = await page.evaluate(() => {
        return eval('window.player.music')
    });
    musics.forEach( (m, i) => {
        if (covername.length == 0) covername = m.cover;
        const title = m.name.replace(/^\d{1,2}\./, '').trim()
        if (title.length == 0) musics.splice(i, 1) // 如果歌名为空，就移除这一项
        delete m.src;
        delete m.cover;
        m.name = title
    })

    const title = await page.$eval('h3', el => el.textContent)
    const cover = `https://luoow.wxwenku.com/${covername}`;
    const desc = await page.$eval('div.vol-desc', el => el.innerHTML)
    
    // console.log("titie: %s", title);
    // console.log(cover)
    // console.log("desc: %s", pureHtml(desc))

    const info = {
        title: title,
        cover: cover,
        desc: pureHtml(desc),
        musics: musics
    }
    const volumn = `vol_${vol}`;
    data[volumn] = info
    console.log(info)

    
    const fileName = covername.replace(/\//, '').replace(/\//g, '_')
    await crawlImage(browser, cover, fileName)

    await page.close()
}

const pureHtml = (source) => {
    return source.replace(/<\/p>|<br>/ig, "\n")
    .replace(/\n+/g, '\n')
    .replace(/<.*?>/ig, '')
    .trim()
    .replace(/\n+/g, '\n')
}

(async()=> {
    // debug
    // const browser1 = await puppeteer.launch({headless: "new"});
    // await crawlPage(browser1, 498, {})
    // await browser1.close()
    // return;


    const max = 999
    const args = process.argv.slice(2)
    let from = Math.min(parseInt(args[0], 10) || 1, max)
    let to = Math.min((parseInt(args[1], 10) || from), max)
    console.log("crawing from: %d to %d", from ,to)

    const db = "output/data.json";
    try {
        await fs.promises.access(db, fs.constants.R_OK | fs.constants.W_OK);
    } catch {
        await fs.promises.writeFile(db, '{}');
    }
    const text = await fs.promises.readFile(db, {encoding: 'utf-8'})
    const data = JSON.parse(text)
    const browser = await puppeteer.launch({headless: "new"});
    let retry = 0
    while (from <= to) {
        const vol = `vol_${from}`
        if (vol in data) {
            from++
            continue;
        }
        try {
            await crawlPage(browser, from, data)
            await fs.promises.writeFile(db, JSON.stringify(data))
            from++
            retry = 0
            await sleep(1000)
        } catch (error) {
            console.error(error)
            // 开始1秒一试，5次后3秒1试，共10次
            if (retry++ < 10) await sleep(1000 * (retry > 5 ? 3 : 1))
            else { // 实在不行就下一条
                from++
                retry = 0
            }
        }
    }
    await browser.close()
})()
