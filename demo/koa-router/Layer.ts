import { pathToRegexp, compile, parse } from 'path-to-regexp'
import uri from 'urijs'

const debug = require('debug')('koa-router')

export default function Layer (this: any, path, methods, middleware, opts) {
  this.opts = opts || {}
  this.name = this.opts.name || null
  this.methods = []
  this.paramNames = []
  this.stack = Array.isArray(middleware) ? middleware : [middleware]

  methods.forEach(function (this: any, method) {
    const l = this.methods.push(method.toUpperCase())
    if (this.methods[l - 1] === 'GET') {
      this.methods.unshift('HEAD')
    }
  }, this)

  this.path = path
  this.regexp = pathToRegexp(path, this.paramNames, this.opts)

  debug('defined route %s %s', this.methods, this.opts.prefix + this.path)
}

Layer.prototype.match = function (path) {
  return this.regexp.test(path)
}

Layer.prototype.params = function (path, captures, existingParams) {
  var params = existingParams || {}

  for (var len = captures.length, i = 0; i < len; i++) {
    if (this.paramNames[i]) {
      var c = captures[i]
      params[this.paramNames[i].name] = c ? safeDecodeURIComponent(c) : c
    }
  }

  return params
}

Layer.prototype.captures = function (path) {
  if (this.opts.ignoreCaptures) return []
  return path.match(this.regexp).slice(1)
}

Layer.prototype.url = function (params, options) {
  let args = params
  const url = this.path.replace(/\(\.\*\)/g, '')
  const toPath = compile(url)
  let replaced

  if (typeof params !== 'object') {
    args = Array.prototype.slice.call(arguments)
    if (typeof args[args.length - 1] === 'object') {
      options = args[args.length - 1]
      args = args.slice(0, args.length - 1)
    }
  }

  const tokens = parse(url)
  let replace = {}

  if (args instanceof Array) {
    for (let len = tokens.length, i = 0, j = 0; i < len; i++) {
      if ((tokens[i] as any).name) replace[(tokens[i] as any).name] = args[j++]
    }
  } else if (tokens.some((token) => (token as any).name)) {
    replace = params
  } else {
    options = params
  }

  replaced = toPath(replace)

  if (options && options.query) {
    replaced = new uri(replaced)
    replaced.search(options.query)
    return replaced.toString()
  }

  return replaced
}

Layer.prototype.param = function (param, fn) {
  var stack = this.stack
  var params = this.paramNames
  var middleware = function (this: any, ctx, next) {
    return fn.call(this, ctx.params[param], ctx, next)
  }

  ;(middleware as any).param = param

  var names = params.map(function (p) {
    return p.name
  })

  var x = names.indexOf(param)
  if (x > -1) {
    stack.some(function (fn, i) {
      if (!fn.param || names.indexOf(fn.param) > x) {
        stack.splice(i, 0, middleware)
        return true
      }
    })
  }

  return this
}

Layer.prototype.setPrefix = function (prefix) {
  if (this.path) {
    this.path = prefix + this.path
    this.paramNames = []
    this.regexp = pathToRegexp(this.path, this.paramNames, this.opts)
  }

  return this
}

function safeDecodeURIComponent (text) {
  try {
    return decodeURIComponent(text)
  } catch (e) {
    return text
  }
}
