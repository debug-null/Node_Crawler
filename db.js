const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');  // 有多种适配器可选择
 
const course = new FileSync('./db/course.json');
const log = new FileSync('./db/log.json')
 
module.exports =  {
  course: low(course),
  log: low(log)
};