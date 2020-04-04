// utils/crawler.js
const Crawler = require('crawler')
const defaultOptions = {
  jQuery: false,
  rateLimit: fetchRateLimit,
  retries: 0,
  timeout: fetchTimeout,
}

module.exports = class PromiseifyCrawler extends Crawler {
    // namespace 是为了后续抓取结果统一上报时候进行区分
    constructor(namespace = 'unknow', options = {}) {
      if (typeof namespace === 'object') {
        options = namespace
        namespace = 'unknow'
      }
      
      options = merge({}, defaultOptions, options)

      const cb = options.callback
      options.callback = (err, res, done) => {
        typeof cb === 'function' && cb(err, res, noop)
        process.nextTick(done)
        // 在这里可以自定义抓取成功还是失败
        // 我这里直接设置的是如果 http code 不是 200 就视为错误
        // 而且在这里也可以做一些抓取成功失败的统计
        if (err || res.statusCode !== 200) {
          if (!err) err = new Error(`${res.statusCode}-${res.statusMessage}`)
          err.options = res.options
          err.options.npolisReject(err)
        } else {
          res.options.npolisResolve(res)
        }
      }
      options.headers = Object.assign({}, options.headers, {
        'X-Requested-With': 'XMLHttpRequest',
      })
      super(options)
    }
  
    queue(options = {}) {
      // 每次抓取都是一个新的 promise
      return new Promise((resolve, reject) => {
        // 然后在 options 里挂载上 resolve 和 reject
        // 这样在全局 callback 上就可以用到了
        options.npolisResolve = resolve
        options.npolisReject = reject

        const pr = options.preRequest
        options.preRequest = (options, done) => {
          typeof pr === 'function' && pr(options, noop)
          // 在这里也可以做一些通用的抓取前的处理
          
          done()
        }

        super.queue(options)
      })
    }
    
  }