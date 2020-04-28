'use strict'

const fs = require('fs')
const path = require('path')
const assert = require('assert')
const is = require('is-type-of')
const debug = require('debug')('egg-core')
const homedir = require('node-homedir')
const FileLoader = require('./file_loader')
const ContextLoader = require('./context_loader')
const utility = require('utility')
const utils = require('../utils')
const Timing = require('../utils/timing')

const REQUIRE_COUNT = Symbol('EggLoader#requireCount')

export default class EggLoader {
  options: any
  app: any
  lifecycle: any
  timing: any
  pkg: any
  eggPaths: any[]
  serverEnv: any
  appInfo: {
    name: any
    baseDir: any
    env: any
    scope: any
    HOME: any
    pkg: any
    root: any
  }

  serverScope: any
  dirs: any
  orderPlugins: any
  /**
   * @class
   * @param {Object} options - options
   * @param {String} options.baseDir - the directory of application
   * @param {EggCore} options.app - Application instance
   * @param {Logger} options.logger - logger
   * @param {Object} [options.plugins] - custom plugins
   * @since 1.0.0
   */
  constructor (options) {
    this.options = options
    assert(fs.existsSync(this.options.baseDir), `${this.options.baseDir} not exists`)
    assert(this.options.app, 'options.app is required')
    assert(this.options.logger, 'options.logger is required')

    this.app = this.options.app
    this.lifecycle = this.app.lifecycle
    this.timing = this.app.timing || new Timing()
    this[REQUIRE_COUNT] = 0

    /**
     * @member {Object} EggLoader#pkg
     * @see {@link AppInfo#pkg}
     * @since 1.0.0
     */
    this.pkg = utility.readJSONSync(path.join(this.options.baseDir, 'package.json'))

    this.eggPaths = this.getEggPaths()
    debug('Loaded eggPaths %j', this.eggPaths)

    this.serverEnv = this.getServerEnv()
    debug('Loaded serverEnv %j', this.serverEnv)

    this.appInfo = this.getAppInfo()

    this.serverScope = options.serverScope !== undefined
      ? options.serverScope
      : this.getServerScope()
  }

  getServerEnv () {
    let serverEnv = this.options.env

    const envPath = path.join(this.options.baseDir, 'config/env')
    if (!serverEnv && fs.existsSync(envPath)) {
      serverEnv = fs.readFileSync(envPath, 'utf8').trim()
    }

    if (!serverEnv) {
      serverEnv = process.env.EGG_SERVER_ENV
    }

    if (!serverEnv) {
      if (process.env.NODE_ENV === 'test') {
        serverEnv = 'unittest'
      } else if (process.env.NODE_ENV === 'production') {
        serverEnv = 'prod'
      } else {
        serverEnv = 'local'
      }
    } else {
      serverEnv = serverEnv.trim()
    }

    return serverEnv
  }

  getServerScope () {
    return process.env.EGG_SERVER_SCOPE || ''
  }

  getAppname () {
    if (this.pkg.name) {
      debug('Loaded appname(%s) from package.json', this.pkg.name)
      return this.pkg.name
    }
    const pkg = path.join(this.options.baseDir, 'package.json')
    throw new Error(`name is required from ${pkg}`)
  }

  getHomedir () {
    return process.env.EGG_HOME || homedir() || '/home/admin'
  }

  getAppInfo () {
    const env = this.serverEnv
    const scope = this.serverScope
    const home = this.getHomedir()
    const baseDir = this.options.baseDir

    return {
      name: this.getAppname(),
      baseDir,
      env,
      scope,
      HOME: home,
      pkg: this.pkg,
      root: env === 'local' || env === 'unittest' ? baseDir : home
    }
  }

  getEggPaths () {
    // avoid require recursively
    const EggCore = require('../egg')
    const eggPaths = []

    let proto = this.app

    // Loop for the prototype chain
    while (proto) {
      proto = Object.getPrototypeOf(proto)
      // stop the loop if
      // - object extends Object
      // - object extends EggCore
      if (proto === Object.prototype || proto === EggCore.prototype) {
        break
      }

      const eggPath = proto[Symbol.for('egg#eggPath')]
      assert(eggPath && typeof eggPath === 'string', 'Symbol.for(\'egg#eggPath\') should be string')
      assert(fs.existsSync(eggPath), `${eggPath} not exists`)
      const realpath = fs.realpathSync(eggPath)
      if (!eggPaths.includes(realpath)) {
        eggPaths.unshift(realpath)
      }
    }

    return eggPaths
  }

  loadFile (filepath, ...inject) {
    filepath = filepath && this.resolveModule(filepath)
    if (!filepath) {
      return null
    }

    // function(arg1, args, ...) {}
    if (inject.length === 0) inject = [this.app]

    let ret = this.requireFile(filepath)
    if (is.function(ret) && !is.class(ret)) {
      ret = ret(...inject)
    }
    return ret
  }

  requireFile (filepath) {
    const timingKey = `Require(${this[REQUIRE_COUNT]++}) ${utils.getResolvedFilename(filepath, this.options.baseDir)}`
    this.timing.start(timingKey)
    const ret = utils.loadFile(filepath)
    this.timing.end(timingKey)
    return ret
  }

  getLoadUnits () {
    if (this.dirs) {
      return this.dirs
    }

    const dirs = this.dirs = []

    if (this.orderPlugins) {
      for (const plugin of this.orderPlugins) {
        dirs.push({
          path: plugin.path,
          type: 'plugin'
        })
      }
    }

    // framework or egg path
    for (const eggPath of this.eggPaths) {
      dirs.push({
        path: eggPath,
        type: 'framework'
      })
    }

    // application
    dirs.push({
      path: this.options.baseDir,
      type: 'app'
    })

    debug('Loaded dirs %j', dirs)
    return dirs
  }

  loadToApp (directory, property, opt) {
    const target = this.app[property] = {}
    opt = Object.assign({}, {
      directory,
      target,
      inject: this.app
    }, opt)

    const timingKey = `Load "${String(property)}" to Application`
    this.timing.start(timingKey)
    new FileLoader(opt).load()
    this.timing.end(timingKey)
  }

  loadToContext (directory, property, opt) {
    opt = Object.assign({}, {
      directory,
      property,
      inject: this.app
    }, opt)

    const timingKey = `Load "${String(property)}" to Context`
    this.timing.start(timingKey)
    new ContextLoader(opt).load()
    this.timing.end(timingKey)
  }

  get FileLoader () {
    return FileLoader
  }

  get ContextLoader () {
    return ContextLoader
  }

  getTypeFiles (filename) {
    const files = [`${filename}.default`]
    if (this.serverScope) files.push(`${filename}.${this.serverScope}`)
    if (this.serverEnv === 'default') return files

    files.push(`${filename}.${this.serverEnv}`)
    if (this.serverScope) files.push(`${filename}.${this.serverScope}_${this.serverEnv}`)
    return files
  }

  resolveModule (filepath) {
    let fullPath
    try {
      fullPath = require.resolve(filepath)
    } catch (e) {
      return undefined
    }

    if (process.env.EGG_TYPESCRIPT !== 'true' && fullPath.endsWith('.ts')) {
      return undefined
    }

    return fullPath
  }
}

const loaders = [
  require('./mixin/plugin'),
  require('./mixin/config'),
  require('./mixin/extend'),
  require('./mixin/custom'),
  require('./mixin/service'),
  require('./mixin/middleware'),
  require('./mixin/controller'),
  require('./mixin/router'),
  require('./mixin/custom_loader')
]

for (const loader of loaders) {
  Object.assign(EggLoader.prototype, loader)
}
