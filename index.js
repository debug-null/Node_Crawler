const Crawler = require("crawler");
const db = require("./db");
const fs = require("fs");
const path = require('path')


db.defaults({ courseList: [] }).write(); //创建库

// 爬取流程

var c = new Crawler({
  rateLimit: 2000, // 两次请求之间将闲置2000ms
  headers: {
    Connection: "keep-alive",
    Pragma: "no-cache",
    //签名
    Authorization: '请填写签名'
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

start()


//获取课程列表--程序入口
function start() {
  crawlerSync({
    Host: "www.jiker.com",
    //下载所有，若新增课程，修改page和size即可
    uri:"https://www.jiker.com/course?page=1&page_size=102&sort_type=time&difficulty_level=0&category_id&category_level",
    //下载2门课程，用来做测试，快
    // uri:"https://www.jiker.com/course?page=&page_size=2&sort_type=time&difficulty_level",
    jQuery: true,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Accept-Ranges": "none",
      "Sec-Fetch-Dest": "document",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9"
    }
  })
    .then(res => {
      var $ = res.$;
      $(".course-list > a").each(function(index, item) {
        console.log("item", item);
        //获取所有视频详情页链接
        db.get("courseList")
          .push({
            detailLink: item.attribs.href
          })
          .write();
      });

      //开始获取详情页信息
      getDetail();
    })
    .catch(err => {
      console.log("获取课程列表失败", err);
    });
}

//获取详情页信息-章节信息
function getDetail() {
  console.log("正在获取详情页信息");
  var courseList = db.get("courseList").value();
  (async () => {
    for (let i = 0; i < courseList.length; i++) {
      console.log(courseList[i]);
      try {
        var res = await crawlerSync({
          uri: `https://course.jiker.com/api/web${courseList[i].detailLink}`,
          jQuery: false
        });
        let detail = JSON.parse(res.body);
        courseList[i].title = detail.data.course.name; //存储课程名称
        courseList[i].content = detail.data.course.content; //存储课程章节等信息
        db.get("courseList").write();
      } catch (error) {
        console.log("getDetail -> error", error);
      }
    }
    console.log("详情页信息获取完毕，准备进入下载阶段");
    downVideos(courseList);
  })();
}



//视频下载
function downVideos(courseList, directory) {
  for (let i = 0; i < courseList.length; i++) {
    if (!courseList[i].children) {
      if (!fs.existsSync("./video")) {
        fs.mkdirSync("./video");
      }
      //根节点，创建目录
      let rootDirectory = "./video/" + courseList[i].title;
      if (!fs.existsSync(rootDirectory)) {
        fs.mkdirSync(rootDirectory);
      }
      downVideos(courseList[i].content, rootDirectory);
    }

    let children = courseList[i].children;
    if (children && children.length > 0) {
      (async () => {
        for (let i = 0; i < children.length; i++) {
          console.log("开始下载视频---》", children[i].name);
          await new Promise(async (reject, resolve) => {
            var videoData = await crawlerSync({
              encoding: null,
              jQuery: false,
              url: children[i].url,
              filename: children[i].name, //写入文件名
              headers: {
                Host: "q1.youked.jiker.com"
              }
            });
            let fileName = (children[i].name+'.mp4').replace('/','\\');//防止课程名称包含反斜杆
            // 文件流存为mp4视频
            saveFile(path.join(directory,fileName) , videoData.body)
              .then(res => {
                console.log("视频下载完毕---》", children[i].name);
                reject(true);
              })
              .catch(err => {
                console.log("视频下载失败", err);
              });
          });
        }
      })();
    }
  }
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
