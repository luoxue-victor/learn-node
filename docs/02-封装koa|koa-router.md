## Koa 搭建

### RUN

```bash
npm run demo-koa # koa demo
npm run demo-koa-router # koa-router demo
```

### 实现 koa

```js
import Application from './extend/application'
const app = new Application()

console.log('koa-demo')

export default class Server {
  start () {
    app.use((ctx) => {
      ctx.body = 'hello world'
    })

    app.listen(3000, () => {
      console.log('listening on 3000')
      console.log('app run at: http://127.0.0.1:3000/')
    })
  }
}

const server = new Server()

server.start()
```

### 实现 koa-router

```js
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
```