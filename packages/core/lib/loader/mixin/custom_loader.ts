import assert from 'assert'
import path from 'path'
const is = require('is-type-of')

export default {
  loadCustomLoader () {
    const _that = this as any
    assert(_that.config, 'should loadConfig first')
    const customLoader = _that.config.customLoader || {}

    for (const property of Object.keys(customLoader)) {
      const loaderConfig = Object.assign({}, customLoader[property])
      assert(loaderConfig.directory, `directory is required for config.customLoader.${property}`)

      let directory
      if (loaderConfig.loadunit === true) {
        directory = (this as any).getLoadUnits().map(unit => path.join(unit.path, loaderConfig.directory))
      } else {
        directory = path.join(_that.appInfo.baseDir, loaderConfig.directory)
      }
      // don't override directory
      delete loaderConfig.directory

      const inject = loaderConfig.inject || 'app'
      // don't override inject
      delete loaderConfig.inject

      switch (inject) {
        case 'ctx': {
          assert(!(property in _that.app.context), `customLoader should not override ctx.${property}`)
          const defaultConfig = {
            caseStyle: 'lower',
            fieldClass: `${property}Classes`
          }
          _that.loadToContext(directory, property, Object.assign(defaultConfig, loaderConfig))
          break
        }
        case 'app': {
          assert(!(property in _that.app), `customLoader should not override app.${property}`)
          const defaultConfig = {
            caseStyle: 'lower',
            initializer (Clz) {
              return is.class(Clz) ? new Clz(_that.app) : Clz
            }
          }
          _that.loadToApp(directory, property, Object.assign(defaultConfig, loaderConfig))
          break
        }
        default:
          throw new Error('inject only support app or ctx')
      }
    }
  }
}
