/// <reference types="node" />
// eslint-disable-next-line no-unused-vars
import KoaApplication = require('koa');

export default <KoaApplication.Context>{
  get url () {
    return this.request.url
  },
  set url (val) {
    this.request.url = val
  },
  get body () {
    return this.response.body
  },
  set body (data) {
    this.response.body = data
  }
}
