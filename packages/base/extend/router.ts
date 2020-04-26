import Router from 'koa-router'
import glob from 'glob'
import path from 'path'
// eslint-disable-next-line no-unused-vars
import KoaApplication = require('koa');
const router = new Router()

// 定义不变字段，在使用时读取
export const symbolRoutePrefix: symbol = Symbol('routePrefix')

/**
 * 路由执行类
 * 入口文件载入
 * const route = new Route(ctx: Koa);
 *
 * @class Route
 */
export class Route {
  // 静态 存储被修饰后的路由的地方
  static __DecoratedRouters:
    Map<{
      target: any,
      method: string,
      path: string,
      unless?: boolean
    }, Function | Function[]> = new Map();

  private router: Router;
  private app: KoaApplication;

  constructor (app: KoaApplication) {
    this.app = app
    this.router = router
  }

  /**
   * 注册路由
   * new Route(ctx:Koa).registerRouters(apipath);
   * @param {String} controllerDir api文件路径
   * @memberOf Route
   */
  registerRouters (controllerDir: string) {
    // 载入api接口,使用sync同步载入
    glob.sync(path.join(controllerDir, './*.ts'))
      .forEach((item) => require(item))
    // 不做校验的路由集合
    const unlessPath = []
    // 配置路由
    for (const [config, controller] of Route.__DecoratedRouters) {
      const controllers = Array.isArray(controller)
        ? controller
        : [controller]

      let prefixPath = config.target[symbolRoutePrefix]
      if (prefixPath && (!prefixPath.startsWith('/'))) {
        prefixPath = '/' + prefixPath
      }
      // //拼接api路由
      const routerPath = prefixPath + config.path
      // 将忽略路由集合
      if (config.unless) {
        unlessPath.push(routerPath)
      }
      controllers.forEach(
        (controller) => this.router[config.method](routerPath, controller)
      )
    }

    // 一定要在router载入之前
    this.app.use(this.router.routes())
    this.app.use(this.router.allowedMethods())
  }
}
