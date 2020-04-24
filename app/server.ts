import Koa from 'koa'

export default function () {
  const PORT = 3000
  const app = new Koa()

  app.use(async (ctx) => {
    ctx.body = 'Hello World'
  })

  app.listen(PORT)

  console.log(`app run at: http://localhost:${PORT}/`)
}
