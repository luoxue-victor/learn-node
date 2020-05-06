import Application from '../koa/extend/application'

import Router from './router'

const app = new Application()
const router = new Router()

router.get('/', async (ctx) => {
  ctx.body = '首页'
})

app.use(router.routes())
app.use(router.allowedMethods())

app.listen(3000)

console.log('app run at: http://127.0.0.1:3000/')
