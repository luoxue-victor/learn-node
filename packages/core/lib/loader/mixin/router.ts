import path from 'path'

export default {

  /**
   * Load app/router.js
   * @function EggLoader#loadRouter
   * @param {Object} opt - LoaderOptions
   * @since 1.0.0
   */
  loadRouter () {
    (this as any).timing.start('Load Router');
    // 加载 router.js
    (this as any).loadFile(path.join((this as any).options.baseDir, 'app/router'));
    (this as any).timing.end('Load Router')
  }
}
