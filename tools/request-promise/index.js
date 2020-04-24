
const request = require('request')
const qs = require('querystring')

exports.requestPromise = function requestPromise (url, params) {
  return new Promise((resolve, reject) => {
    request({
      url: `${url}?${qs.stringify(params)}`,
      method: 'GET',
      json: true,
      headers: {
        'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' +
        ' (KHTML, like Gecko) Chrome/74.0.3729.131 Safari/537.36'
      }
    }, (error, response, body) => {
      if (error) reject(error)
      if (!error && response.statusCode === 200) {
        resolve(body)
      } else {
        reject(body)
      }
    })
  })
}