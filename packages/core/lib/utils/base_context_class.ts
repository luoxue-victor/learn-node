export default class BaseContextClass {
  ctx: any
  app: any
  config: any
  service: any
  constructor (ctx) {
    this.ctx = ctx
    this.app = ctx.app
    this.config = ctx.app.config
    this.service = ctx.service
  }
}
