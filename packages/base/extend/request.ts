/// <reference types="node" />
// eslint-disable-next-line no-unused-vars
import KoaApplication = require('koa');

export default <KoaApplication.Request> {
  get url () {
    return this.url
  },
  set url (val) {
    this.url = val
  }
}
