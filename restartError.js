const Crawler = require("crawler");
const db = require("./db");
const fs = require("fs");
const path = require('path')

var c = new Crawler({
  rateLimit: 2000, // 两次请求之间将闲置2000ms
  headers: {
    Connection: "keep-alive",
    Pragma: "no-cache",
    //签名
    Authorization:"Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE1ODU5NzIxNjksImlzcyI6Imh0dHBzOlwvXC9wYXNzcG9ydC5qaWtlci5jb20iLCJleHAiOjE1ODY0MDQxNjksImF1ZCI6Imh0dHBzOlwvXC9qaWtlci5jb20iLCJzdWIiOjE2MTU3NSwiaW5mbyI6eyJpZCI6MTYxNTc1LCJuYW1lIjoiamlrZXI0NDMyODQyIiwiY291bnRyeV9jb2RlIjoiODYiLCJwaG9uZV9udW1iZXIiOiIxNTIxMDQwMzMwNiIsImludml0ZV91c2VyX2lkIjowfX0.iS1QOE9PJjdx8KfH_wgyshyZsfg7auFGR4vyesSZXLg",
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36"
  },
  // 在每个请求处理完毕后将调用此回调函数
  callback: function(error, res, done) {
    console.log("res", res);
    if (error) {
      console.log(error);
    } else {
      console.log($("title").text());
    }
    done();
  }
});

var courseList = db.log.get("list").value();
let index = 0;
if(courseList){
  for(let list of courseList){
    if(!list.status){
      index++
      videoDown(list.item, list.path, index)
    }
  }
}




//视频下载
function videoDown(item,directory,index){
  return new Promise(async (reject, resolve) => {
    console.log(`${index}-正在重新下载视频---》`, item.name);
    var videoData = await crawlerSync({
      encoding: null,
      jQuery: false,
      url: item.url,
      filename: item.name, //写入文件名
      headers: {
        Host: "q1.youked.jiker.com"
      }
    });
    let sep = path.sep;
    let fileName = (`第${index}节-${item.name}.mp4`).replace(new RegExp(sep,'g'),'-');//防止课程名称包含反斜杆
    // 文件流存为mp4视频
    saveFile(path.join(directory,fileName) , videoData.body)
      .then(res => {
        db.log.get("list").push(
        {
          name: item.name,
          status: true,
          url: item.url,
          path: directory
        }).write();
        console.log(`${index}-视频下载完毕---》`, item.name);
        reject(true);
      })
      .catch(err => {
        db.log.get("list").push(
          {
            name: item.name,
            status: false,
            error: err,
            url: item.url,
            path: directory
          }).write();
        console.log("视频下载失败", err);
      });
  });
}

/**分片下载
 * [saveFileWithStream description]
 * @param {String} filePath [文件路径]
 * @param {Buffer} readData [Buffer 数据]
 */
function saveFile(filePath, fileData) {
  return new Promise((resolve, reject) => {
    // 块方式写入文件
    const wstream = fs.createWriteStream(filePath);

    wstream.on("open", () => {
      const blockSize = 128;
      const nbBlocks = Math.ceil(fileData.length / blockSize);
      for (let i = 0; i < nbBlocks; i += 1) {
        const currentBlock = fileData.slice(
          blockSize * i,
          Math.min(blockSize * (i + 1), fileData.length)
        );
        wstream.write(currentBlock);
      }

      wstream.end();
    });
    wstream.on("error", err => {
      reject(err);
    });
    wstream.on("finish", () => {
      resolve(true);
    });
  });
}

//同步
function crawlerSync(options) {
  return new Promise((resolve, reject) => {
    c.queue([
      {
        ...options,
        // 覆盖全局的callback
        callback: function(error, res, done) {
          if (error) {
            reject(error);
          } else {
            resolve(res);
          }
          done();
        }
      }
    ]);
  });
}