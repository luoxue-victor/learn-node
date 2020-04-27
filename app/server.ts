import Application from '../schools/koa-demo/extend/application'
const app = new Application()

export default class Server {
  start () {
    app.use((ctx) => {
      ctx.body = 'hello world'
    })

    app.listen(3000, () => {
      console.log('listening on 3000')
    })
  }
}
