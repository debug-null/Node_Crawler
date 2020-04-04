const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');  // 有多种适配器可选择
 
const adapter = new FileSync('db.json'); // 申明一个适配器
const db = low(adapter);
 
module.exports =  db;
// db.defaults({posts: [], user: {}, count: 0})
//   .write();
 
// db.get('posts')
//   .push({id: 1, title: 'lowdb is awesome'})
//   .write()
 
// db.set('user.name', 'typicode')
//   .write()
 
// db.update('count', n => n + 1)
//   .write()