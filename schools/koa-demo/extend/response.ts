/// <reference types="node" />
// eslint-disable-next-line no-unused-vars
import KoaApplication = require('koa');

export default <KoaApplication.Response> {
  get status () {
    return this.res.statusCode
  },
  set status (statusCode) {
    this.res.statusCode = statusCode
  }
}
