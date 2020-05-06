import Layer from './Layer'
import HttpError from 'http-errors'
import compose from 'koa-compose'
import methods from 'methods'
const debug = require('debug')('koa-router')

/**
 * @module koa-router
 */

export default function Router (this: any, opts?: any): void {
  if (!(this instanceof Router)) {
    return new Router(opts)
  }

  (this as any).opts = opts || {};
  (this as any).methods = (this as any).opts.methods || [
    'HEAD',
    'OPTIONS',
    'GET',
    'PUT',
    'PATCH',
    'POST',
    'DELETE'
  ]

  ;(this as any).params = {}
  ;(this as any).stack = []
};

methods.forEach(function (method) {
  Router.prototype[method] = function (name, path, middleware) {
    if (typeof path === 'string' || path instanceof RegExp) {
      middleware = Array.prototype.slice.call(arguments, 2)
    } else {
      middleware = Array.prototype.slice.call(arguments, 1)
      path = name
      name = null
    }

    this.register(path, [method], middleware, {
      name: name
    })

    return this
  }
})

Router.prototype.del = Router.prototype.delete

Router.prototype.use = function () {
  const router = this
  const middleware = Array.prototype.slice.call(arguments)
  let path

  // support array of paths
  if (Array.isArray(middleware[0]) && typeof middleware[0][0] === 'string') {
    middleware[0].forEach(function (p) {
      router.use.apply(router, [p].concat(middleware.slice(1)))
    })

    return this
  }

  const hasPath = typeof middleware[0] === 'string'
  if (hasPath) {
    path = middleware.shift()
  }

  middleware.forEach(function (m) {
    if (m.router) {
      m.router.stack.forEach(function (nestedLayer) {
        if (path) nestedLayer.setPrefix(path)
        if (router.opts.prefix) nestedLayer.setPrefix(router.opts.prefix)
        router.stack.push(nestedLayer)
      })

      if (router.params) {
        Object.keys(router.params).forEach(function (key) {
          m.router.param(key, router.params[key])
        })
      }
    } else {
      router.register(path || '(.*)', [], m, { end: false, ignoreCaptures: !hasPath })
    }
  })

  return this
}

Router.prototype.prefix = function (prefix) {
  prefix = prefix.replace(/\/$/, '')

  this.opts.prefix = prefix

  this.stack.forEach(function (route) {
    route.setPrefix(prefix)
  })

  return this
}

Router.prototype.routes = Router.prototype.middleware = function () {
  const router = this

  const dispatch = function dispatch (ctx, next) {
    debug('%s %s', ctx.method, ctx.path)

    const path = router.opts.routerPath || ctx.routerPath || ctx.path
    const matched = router.match(path, ctx.method)

    if (ctx.matched) {
      ctx.matched.push.apply(ctx.matched, matched.path)
    } else {
      ctx.matched = matched.path
    }

    ctx.router = router

    if (!matched.route) return next()

    const matchedLayers = matched.pathAndMethod
    const mostSpecificLayer = matchedLayers[matchedLayers.length - 1]
    ctx._matchedRoute = mostSpecificLayer.path
    if (mostSpecificLayer.name) {
      ctx._matchedRouteName = mostSpecificLayer.name
    }

    const layerChain = matchedLayers.reduce(function (memo, layer) {
      memo.push(function (ctx, next) {
        ctx.captures = layer.captures(path, ctx.captures)
        ctx.params = layer.params(path, ctx.captures, ctx.params)
        ctx.routerName = layer.name
        return next()
      })
      return memo.concat(layer.stack)
    }, [])

    return compose(layerChain)(ctx, next)
  };

  (dispatch as any).router = this

  return dispatch
}

Router.prototype.allowedMethods = function (options) {
  options = options || {}
  const implemented = this.methods

  return function allowedMethods (ctx, next) {
    return next().then(function () {
      const allowed = {}

      if (!ctx.status || ctx.status === 404) {
        ctx.matched.forEach(function (route) {
          route.methods.forEach(function (method) {
            allowed[method] = method
          })
        })

        const allowedArr = Object.keys(allowed)

        if (!~implemented.indexOf(ctx.method)) {
          if (options.throw) {
            let notImplementedThrowable
            if (typeof options.notImplemented === 'function') {
              notImplementedThrowable = options.notImplemented()
            } else {
              notImplementedThrowable = new HttpError.NotImplemented()
            }
            throw notImplementedThrowable
          } else {
            ctx.status = 501
            ctx.set('Allow', allowedArr.join(', '))
          }
        } else if (allowedArr.length) {
          if (ctx.method === 'OPTIONS') {
            ctx.status = 200
            ctx.body = ''
            ctx.set('Allow', allowedArr.join(', '))
          } else if (!allowed[ctx.method]) {
            if (options.throw) {
              let notAllowedThrowable
              if (typeof options.methodNotAllowed === 'function') {
                notAllowedThrowable = options.methodNotAllowed()
              } else {
                notAllowedThrowable = new HttpError.MethodNotAllowed()
              }
              throw notAllowedThrowable
            } else {
              ctx.status = 405
              ctx.set('Allow', allowedArr.join(', '))
            }
          }
        }
      }
    })
  }
}

Router.prototype.all = function (name, path, middleware) {
  if (typeof path === 'string') {
    middleware = Array.prototype.slice.call(arguments, 2)
  } else {
    middleware = Array.prototype.slice.call(arguments, 1)
    path = name
    name = null
  }

  this.register(path, methods, middleware, {
    name: name
  })

  return this
}

Router.prototype.redirect = function (source, destination, code) {
  // lookup source route by name
  if (source[0] !== '/') {
    source = this.url(source)
  }

  // lookup destination route by name
  if (destination[0] !== '/') {
    destination = this.url(destination)
  }

  return this.all(source, ctx => {
    ctx.redirect(destination)
    ctx.status = code || 301
  })
}

Router.prototype.register = function (path, methods, middleware, opts) {
  opts = opts || {}

  const router = this
  const stack = this.stack

  // support array of paths
  if (Array.isArray(path)) {
    path.forEach(function (p) {
      // eslint-disable-next-line no-useless-call
      router.register.call(router, p, methods, middleware, opts)
    })

    return this
  }

  // create route
  const route = new Layer(path, methods, middleware, {
    end: opts.end === false ? opts.end : true,
    name: opts.name,
    sensitive: opts.sensitive || this.opts.sensitive || false,
    strict: opts.strict || this.opts.strict || false,
    prefix: opts.prefix || this.opts.prefix || '',
    ignoreCaptures: opts.ignoreCaptures
  })

  if (this.opts.prefix) {
    route.setPrefix(this.opts.prefix)
  }

  // add parameter middleware
  Object.keys(this.params).forEach(function (this: any, param) {
    route.param(param, this.params[param])
  }, this)

  stack.push(route)

  return route
}

Router.prototype.route = function (name) {
  var routes = this.stack

  for (var len = routes.length, i = 0; i < len; i++) {
    if (routes[i].name && routes[i].name === name) {
      return routes[i]
    }
  }

  return false
}

Router.prototype.url = function (name, params) {
  var route = this.route(name)

  if (route) {
    var args = Array.prototype.slice.call(arguments, 1)
    return route.url.apply(route, args)
  }

  return new Error('No route found for name: ' + name)
}

Router.prototype.match = function (path, method) {
  var layers = this.stack
  var layer
  var matched = {
    path: [],
    pathAndMethod: [],
    route: false
  }

  for (var len = layers.length, i = 0; i < len; i++) {
    layer = layers[i]

    debug('test %s %s', layer.path, layer.regexp)

    if (layer.match(path)) {
      matched.path.push(layer)

      if (layer.methods.length === 0 || ~layer.methods.indexOf(method)) {
        matched.pathAndMethod.push(layer)
        if (layer.methods.length) matched.route = true
      }
    }
  }

  return matched
}

Router.prototype.param = function (param, middleware) {
  this.params[param] = middleware
  this.stack.forEach(function (route) {
    route.param(param, middleware)
  })
  return this
}

Router.url = function (path) {
  var args = Array.prototype.slice.call(arguments, 1)
  return Layer.prototype.url.apply({ path: path }, args)
}
