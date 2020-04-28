import utils from '../../utils'
import path from 'path'
const is = require('is-type-of')
const utility = require('utility')
const FULLPATH = require('../file_loader').FULLPATH

export default {

  loadController (opt: { directory: any }) {
    (this as any).timing.start('Load Controller')
    opt = Object.assign({
      caseStyle: 'lower',
      directory: path.join((this as any).options.baseDir, 'app/controller'),
      initializer: (obj: { (arg0: any): any; prototype: { pathName: any; fullPath: any } }, opt: { pathName: any; path: any }) => {
        if (is.function(obj) && !is.generatorFunction(obj) && !is.class(obj) && !is.asyncFunction(obj)) {
          obj = obj((this as any).app)
        }
        if (is.class(obj)) {
          obj.prototype.pathName = opt.pathName
          obj.prototype.fullPath = opt.path
          return wrapClass(obj)
        }
        if (is.object(obj)) {
          return wrapObject(obj, opt.path)
        }
        if (is.generatorFunction(obj) || is.asyncFunction(obj)) {
          return wrapObject({ 'module.exports': obj }, opt.path)['module.exports']
        }
        return obj
      }
    }, opt)
    // eslint-disable-next-line func-call-spacing
    const controllerBase: any = opt.directory;

    (this as any).loadToApp(controllerBase, 'controller', opt);
    (this as any).options.logger.info('[egg:loader] Controller loaded: %s', controllerBase);
    (this as any).timing.end('Load Controller')
  }

}

// wrap the class, yield a object with middlewares
function wrapClass (Controller: { prototype: { fullPath: string }; name: string }) {
  let proto = Controller.prototype
  const ret = {}
  // tracing the prototype chain
  while (proto !== Object.prototype) {
    const keys = Object.getOwnPropertyNames(proto)
    for (const key of keys) {
      // getOwnPropertyNames will return constructor
      // that should be ignored
      if (key === 'constructor') {
        continue
      }
      // skip getter, setter & non-function properties
      const d = Object.getOwnPropertyDescriptor(proto, key)
      // prevent to override sub method
      // eslint-disable-next-line no-prototype-builtins
      if (is.function(d.value) && !ret.hasOwnProperty(key)) {
        ret[key] = methodToMiddleware(Controller as any, key)
        ret[key][FULLPATH] = Controller.prototype.fullPath + '#' + Controller.name + '.' + key + '()'
      }
    }
    proto = Object.getPrototypeOf(proto)
  }
  return ret

  function methodToMiddleware (Controller: new (arg0: any) => any, key: string) {
    return function classControllerMiddleware (this: any, ...args) {
      const controller = new Controller(this)
      if (!this.app.config.controller || !this.app.config.controller.supportParams) {
        args = [this]
      }
      return utils.callFn(controller[key], args, controller)
    }
  }
}

// wrap the method of the object, method can receive ctx as it's first argument
function wrapObject (obj: { [x: string]: any; 'module.exports'?: any }, path: any, prefix?: string) {
  const keys = Object.keys(obj)
  const ret = {}
  for (const key of keys) {
    if (is.function(obj[key])) {
      const names = utility.getParamNames(obj[key])
      if (names[0] === 'next') {
        throw new Error(`controller \`${prefix || ''}${key}\` should not use next as argument from file ${path}`)
      }
      ret[key] = functionToMiddleware(obj[key])
      ret[key][FULLPATH] = `${path}#${prefix || ''}${key}()`
    } else if (is.object(obj[key])) {
      ret[key] = wrapObject(obj[key], path, `${prefix || ''}${key}.`)
    }
  }
  return ret

  function functionToMiddleware (func: { [x: string]: any }) {
    const objectControllerMiddleware = async function (this: any, ...args) {
      if (!this.app.config.controller || !this.app.config.controller.supportParams) {
        args = [this]
      }
      return await utils.callFn(func, args, this)
    }
    for (const key in func) {
      objectControllerMiddleware[key] = func[key]
    }
    return objectControllerMiddleware
  }
}
