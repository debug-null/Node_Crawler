# 使用方法
* npm i
* npm start
> 注意： 抓取前要将你账户的签名粘贴至index.js文件中，可通过浏览器获取签名 Authorization
> 由于我是VIP，只测试了VIP账户，普通账户应该需要做其他处理。

### 爬取流程
* 进入视频课页面 https://www.jiker.com/course
* 获取所有的视频列表数据  //https://www.jiker.com/course?page=1&page_size=102&sort_type=time&difficulty_level=0&category_id&category_level  通过这个链接省去了翻页操作
* 进入课程详情页, 获取每个课程的章节数据
* 下载视频，下载地址在， 章节数据中的 content[0].children.url