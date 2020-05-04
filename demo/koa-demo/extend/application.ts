/// <reference types="node" />
import context from './context'
import request from './request'
import response from './response'
import http from 'http'
// eslint-disable-next-line no-unused-vars
import KoaApplication = require('koa');

export default class Application {
  context: KoaApplication.Context
  request: KoaApplication.Request
  response: KoaApplication.Response
  middlewares: any
  constructor () {
    this.context = Object.create(context)
    this.request = Object.create(request)
    this.response = Object.create(response)
    this.middlewares = []
  }

  listen (...args) {
    const server = http.createServer(this.callback())
    return server.listen(...args)
  }

  // 添加中间件
  use (fn) {
    this.middlewares.push(fn)
    return this
  }

  callback () {
    return (req, res) => {
      const ctx = this.createContext(req, res)
      const response = () => this.responseBody(ctx)
      const onerror = (err) => this.onerror(err, ctx)
      const fn = this.compose()
      return fn(ctx).then(response).catch(onerror)
    }
  }

  onerror (err, ctx) {
    if (err.status === 404 || err.expose) return
    const msg = err.stack || err.toString()
    console.error()
    console.error(msg.replace(/^/gm, '  '))
    console.error()
  }

  createContext (req, res) {
    const ctx = Object.create(this.context)
    ctx.request = Object.create(this.request)
    ctx.response = Object.create(this.response)
    ctx.req = ctx.request.req = req
    ctx.res = ctx.response.res = res
    return ctx
  }

  responseBody (ctx) {
    const content = ctx.body
    if (typeof content === 'string') {
      ctx.res.setHeader('Content-Type', 'text/pain;charset=utf-8')
      ctx.res.end(content)
    } else if (typeof content === 'object') {
      ctx.res.setHeader('Content-Type', 'text/json;charset=utf-8')
      ctx.res.end(JSON.stringify(content))
    }
  }

  compose () {
    const middlewares = this.middlewares
    return (ctx) => {
      return dispatch(0)
      function dispatch (i) {
        const fn = middlewares[i]
        if (!fn) {
          return Promise.resolve()
        }
        return Promise.resolve(fn(ctx, function next () {
          return dispatch(i + 1)
        }))
      }
    }
  }
}
