## Koa 搭建

```js
import Koa from 'koa'
const PORT = 3001
const app = new Koa()

app.use(async (ctx) => {
  ctx.body = 'Hello World'
})

app.listen(PORT)

console.log(
  `app run at: 
    http://localhost:${PORT}/`
)
```
