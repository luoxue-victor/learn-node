import KoaApplication from 'koa'

const assert = require('assert')
const fs = require('fs')
const is = require('is-type-of')
const co = require('co')
const BaseContextClass = require('./utils/base_context_class')
const utils = require('./utils')
const Router = require('@eggjs/router').EggRouter
const Timing = require('./utils/timing')
const Lifecycle = require('./lifecycle')

const DEPRECATE = Symbol('EggCore#deprecate')
const ROUTER = Symbol('EggCore#router')
const EGG_LOADER = Symbol.for('egg#loader')
const CLOSE_PROMISE = Symbol('EggCore#closePromise')

export default class Core extends KoaApplication {
  timing: any
  _options: any
  options: any
  BaseContextClass: any
  Controller: any
  Service: any
  lifecycle: any
  loader: any
  console: any
  constructor (options: any = {}) {
    options.baseDir = options.baseDir || process.cwd()
    options.type = options.type || 'application'

    assert(typeof options.baseDir === 'string', 'options.baseDir required, and must be a string')
    assert(fs.existsSync(options.baseDir), `Directory ${options.baseDir} not exists`)
    assert(fs.statSync(options.baseDir).isDirectory(), `Directory ${options.baseDir} is not a directory`)
    assert(options.type === 'application' || options.type === 'agent', 'options.type should be application or agent')

    super()

    this.timing = new Timing()

    // cache deprecate object by file
    this[DEPRECATE] = new Map()

    this._options = this.options = options
    this.deprecate.property(this, '_options', 'app._options is deprecated, use app.options instead')

    this.BaseContextClass = BaseContextClass

    const Controller = this.BaseContextClass

    this.Controller = Controller

    const Service = this.BaseContextClass

    this.Service = Service

    this.lifecycle = new Lifecycle({
      baseDir: options.baseDir,
      app: this
    })
    this.lifecycle.on('error', err => this.emit('error', err))
    this.lifecycle.on('ready_timeout', id => this.emit('ready_timeout', id))
    this.lifecycle.on('ready_stat', data => this.emit('ready_stat', data))

    const Loader = this[EGG_LOADER]
    assert(Loader, 'Symbol.for(\'egg#loader\') is required')
    this.loader = new Loader({
      baseDir: options.baseDir,
      app: this,
      plugins: options.plugins,
      logger: this.console,
      serverScope: options.serverScope,
      env: options.env
    })
  }

  use (fn: any): any {
    assert(is.function(fn), 'app.use() requires a function')
    this.middleware.push(utils.middleware(fn))
    return this
  }

  get type () {
    return this.options.type
  }

  get baseDir () {
    return this.options.baseDir
  }

  get deprecate () {
    const caller = utils.getCalleeFromStack()
    if (!this[DEPRECATE].has(caller)) {
      const deprecate = require('depd')('egg')
      deprecate._file = caller
      this[DEPRECATE].set(caller, deprecate)
    }
    return this[DEPRECATE].get(caller)
  }

  get name () {
    return this.loader ? this.loader.pkg.name : ''
  }

  get plugins () {
    return this.loader ? this.loader.plugins : {}
  }

  get config () {
    return this.loader ? this.loader.config : {}
  }

  beforeStart (scope) {
    this.lifecycle.registerBeforeStart(scope)
  }

  ready (flagOrFunction) {
    return this.lifecycle.ready(flagOrFunction)
  }

  readyCallback (name, opts) {
    return this.lifecycle.legacyReadyCallback(name, opts)
  }

  beforeClose (fn) {
    this.lifecycle.registerBeforeClose(fn)
  }

  async close () {
    if (this[CLOSE_PROMISE]) return this[CLOSE_PROMISE]
    this[CLOSE_PROMISE] = this.lifecycle.close()
    return this[CLOSE_PROMISE]
  }

  get router () {
    if (this[ROUTER]) {
      return this[ROUTER]
    }
    const router = this[ROUTER] = new Router({ sensitive: true }, this)
    // register router middleware
    this.beforeStart(() => {
      this.use(router.middleware())
    })
    return router
  }

  url (name, params) {
    return this.router.url(name, params)
  }

  del (...args) {
    this.router.delete(...args)
    return this
  }

  get [EGG_LOADER] () {
    return require('./loader/egg_loader')
  }

  // toAsyncFunction (fn) {
  //   if (!is.generatorFunction(fn)) return fn
  //   fn = co.wrap(fn)
  //   return async function (...args) {
  //     return fn.apply(this, args)
  //   }
  // }

  toPromise (obj) {
    return co(function * () {
      return yield obj
    })
  }
}

// delegate all router method to application
utils.methods.concat(['all', 'resources', 'register', 'redirect']).forEach(method => {
  Core.prototype[method] = function (...args) {
    this.router[method](...args)
    return this
  }
})
