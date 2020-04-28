import assert from 'assert'
const join = require('path').join
const is = require('is-type-of')
const inspect = require('util').inspect
const debug = require('debug')('egg-core:middleware')
const pathMatching = require('egg-path-matching')
const utils = require('../../utils')

export default {

  /**
   * Load app/middleware
   *
   * app.config.xx is the options of the middleware xx that has same name as config
   *
   * @function EggLoader#loadMiddleware
   * @param {Object} opt - LoaderOptions
   * @example
   * ```js
   * // app/middleware/status.js
   * module.exports = function(options, app) {
   *   // options == app.config.status
   *   return function*(next) {
   *     yield next;
   *   }
   * }
   * ```
   * @since 1.0.0
   */
  loadMiddleware (opt) {
    const _that = this as any
    _that.timing.start('Load Middleware')
    const app = _that.app

    // load middleware to app.middleware
    opt = Object.assign({
      call: false,
      override: true,
      caseStyle: 'lower',
      directory: _that.getLoadUnits().map(unit => join(unit.path, 'app/middleware'))
    }, opt)
    const middlewarePaths = opt.directory
    _that.loadToApp(middlewarePaths, 'middlewares', opt)

    for (const name in app.middlewares) {
      Object.defineProperty(app.middleware, name, {
        get () {
          return app.middlewares[name]
        },
        enumerable: false,
        configurable: false
      })
    }

    _that.options.logger.info('Use coreMiddleware order: %j', _that.config.coreMiddleware)
    _that.options.logger.info('Use appMiddleware order: %j', _that.config.appMiddleware)

    // use middleware ordered by app.config.coreMiddleware and app.config.appMiddleware
    const middlewareNames = _that.config.coreMiddleware.concat(_that.config.appMiddleware)
    debug('middlewareNames: %j', middlewareNames)
    const middlewaresMap = new Map()
    for (const name of middlewareNames) {
      if (!app.middlewares[name]) {
        throw new TypeError(`Middleware ${name} not found`)
      }
      if (middlewaresMap.has(name)) {
        throw new TypeError(`Middleware ${name} redefined`)
      }
      middlewaresMap.set(name, true)

      const options = _that.config[name] || {}
      let mw = app.middlewares[name]
      mw = mw(options, app)
      assert(is.function(mw), `Middleware ${name} must be a function, but actual is ${inspect(mw)}`)
      mw._name = name
      // middlewares support options.enable, options.ignore and options.match
      mw = wrapMiddleware(mw, options)
      if (mw) {
        if (debug.enabled) {
          // show mw debug log on every request
          mw = debugWrapper(mw)
        }
        app.use(mw)
        debug('Use middleware: %s with options: %j', name, options)
        _that.options.logger.info('[egg:loader] Use middleware: %s', name)
      } else {
        _that.options.logger.info('[egg:loader] Disable middleware: %s', name)
      }
    }

    _that.options.logger.info('[egg:loader] Loaded middleware from %j', middlewarePaths)
    _that.timing.end('Load Middleware')
  }

}

function wrapMiddleware (mw, options) {
  // support options.enable
  if (options.enable === false) return null

  // support generator function
  mw = utils.middleware(mw)

  // support options.match and options.ignore
  if (!options.match && !options.ignore) return mw
  const match = pathMatching(options)

  const fn = (ctx, next) => {
    if (!match(ctx)) return next()
    return mw(ctx, next)
  }
  fn._name = mw._name + 'middlewareWrapper'
  return fn
}

function debugWrapper (mw) {
  const fn = (ctx, next) => {
    debug('[%s %s] enter middleware: %s', ctx.method, ctx.url, mw._name)
    return mw(ctx, next)
  }
  fn._name = mw._name + 'DebugWrapper'
  return fn
}
