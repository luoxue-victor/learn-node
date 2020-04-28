import path from 'path'
const is = require('is-type-of')

const LOAD_BOOT_HOOK = Symbol('Loader#loadBootHook')

export default {
  loadCustomApp () {
    this[LOAD_BOOT_HOOK]('app');
    (this as any).lifecycle.triggerConfigWillLoad()
  },

  /**
   * Load agent.js, same as {@link EggLoader#loadCustomApp}
   */
  loadCustomAgent () {
    this[LOAD_BOOT_HOOK]('agent');
    (this as any).lifecycle.triggerConfigWillLoad()
  },

  // FIXME: no logger used after egg removed
  loadBootHook () {
    // do nothing
  },

  [LOAD_BOOT_HOOK] (fileName) {
    (this as any).timing.start(`Load ${fileName}.js`)
    for (const unit of (this as any).getLoadUnits()) {
      const bootFilePath = (this as any).resolveModule(path.join(unit.path, fileName))
      if (!bootFilePath) {
        continue
      }
      const bootHook = (this as any).requireFile(bootFilePath)
      if (is.class(bootHook)) {
        bootHook.prototype.fullPath = bootFilePath;
        // if is boot class, add to lifecycle
        (this as any).lifecycle.addBootHook(bootHook)
      } else if (is.function(bootHook)) {
        // if is boot function, wrap to class
        // for compatibility
        (this as any).lifecycle.addFunctionAsBootHook(bootHook)
      } else {
        (this as any).options.logger.warn('[egg-loader] %s must exports a boot class', bootFilePath)
      }
    }
    // init boots
    (this as any).lifecycle.init();
    (this as any).timing.end(`Load ${fileName}.js`)
  }
}
