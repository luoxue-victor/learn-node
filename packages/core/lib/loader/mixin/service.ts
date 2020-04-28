import path from 'path'

export default {

  /**
   * Load app/service
   * @function EggLoader#loadService
   * @param {Object} opt - LoaderOptions
   * @since 1.0.0
   */
  loadService (opt) {
    (this as any).timing.start('Load Service')
    // 载入到 app.serviceClasses
    opt = Object.assign({
      call: true,
      caseStyle: 'lower',
      fieldClass: 'serviceClasses',
      directory: (this as any).getLoadUnits().map(unit => path.join(unit.path, 'app/service'))
    }, opt)
    const servicePaths = opt.directory;
    (this as any).loadToContext(servicePaths, 'service', opt);
    (this as any).timing.end('Load Service')
  }

}
