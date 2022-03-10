## Vue router

路由的作用是根据不同的路径映射不同的视图，vue-router 支持`hash` `history`两种模式，提供`router-view`和`router-link`两个全局的组件

```html
<div id="app">
 <!-- router-link默认渲染a标签 to属性是跳转链接 -->
 <router-link to="/foo">Go to Foo</router-link>
 <router-link to="/bar">Go to Bar</router-link>
 <!-- 路由匹配的页面渲染的出口 -->
 <router-view></router-view>
</div>
```

```javascript
import Vue from "vue";
import VueRouter from "vue-router";
import App from "./App";

Vue.use(VueRouter);

// 1. 定义（路由）组件。
// 可以从其他文件 import 进来
const Foo = { template: "<div>foo</div>" };
const Bar = { template: "<div>bar</div>" };

// 2. 定义路由
// 每个路由应该映射一个组件。 其中"component" 可以是 ue.extend() 创建的组件构造器 组件配置对象
const routes = [
 { path: "/foo", component: Foo },
 { path: "/bar", component: Bar },
];

// 3. 创建 router 实例，然后传 `routes` 配置
const router = new VueRouter({
 routes,
});

// 4. 创建和挂载根实例。 router 配置参数注入路由,让整个应用都有路由功能
const app = new Vue({
 el: "#app",
 render(h) {
  return h(App);
 },
 router,
});

/**
 * 1.创建一个class，添加一个静态方法 install（use方法需要）
 *    - 函数添加属性标识install方法只调用一次
 *    - 当vue加载时把传入的router对象挂载到vue实例上
 * 2.初始化options，routesMap记录path对应的组件 处理当前的path作为响应式依赖
 * 3.注册模式对应的事件
 * 4.创建两个全局组件
 * 5.当路径改变在routesMap里找到对应的组件
 * */
```

## Vue.use

`Vue` 提供 `Vue.use` 全局方法来注册插件，定义在`src\core\global-api\use.js`

```javascript
export function initUse(Vue: GlobalAPI) {
 Vue.use = function (plugin: Function | Object) {
  const installedPlugins =
   this._installedPlugins || (this._installedPlugins = []);
  if (installedPlugins.indexOf(plugin) > -1) {
   return this;
  }

  // additional parameters
  // 把数组中的第一个元素(plugin)去除
  const args = toArray(arguments, 1);
  // 把this(Vue)插入第一个元素的位置
  args.unshift(this);
  if (typeof plugin.install === "function") {
   plugin.install.apply(plugin, args);
  } else if (typeof plugin === "function") {
   plugin.apply(null, args);
  }
  installedPlugins.push(plugin);
  return this;
 };
}
```

内部维护一个 `installedPlugins` 数组，存储所有注册过的插件，判断插件是否有 `install` 方法，有则执行该方法执行的第一个参数是 `Vue`，最后把插件存入数组。
每个插件都需要一个 `install` 方法，当执行 `use` 时就会执行 `install` 并且在可以根据拿到 Vue，不需要在 `import Vue` 了.

## 安装路由

Vue-router 的入口文件在`src\index.js`,定义了 VueRouter 类，实现了静态的 install 方法，定义在`src\install.js`

```javascript
export let _Vue;

export function install(Vue) {
 if (install.installed && _Vue === Vue) return;
 install.installed = true;

 _Vue = Vue;

 const isDef = (v) => v !== undefined;

 const registerInstance = (vm, callVal) => {
  let i = vm.$options._parentVnode;
  if (isDef(i) && isDef((i = i.data)) && isDef((i = i.registerRouteInstance))) {
   i(vm, callVal);
  }
 };

 Vue.mixin({
  beforeCreate() {
   if (isDef(this.$options.router)) {
    this._routerRoot = this;
    this._router = this.$options.router;
    this._router.init(this);
    Vue.util.defineReactive(this, "_route", this._router.history.current);
   } else {
    this._routerRoot = (this.$parent && this.$parent._routerRoot) || this;
   }
   registerInstance(this, this);
  },
  destroyed() {
   registerInstance(this);
  },
 });

 Object.defineProperty(Vue.prototype, "$router", {
  get() {
   return this._routerRoot._router;
  },
 });

 Object.defineProperty(Vue.prototype, "$route", {
  get() {
   return this._routerRoot._route;
  },
 });

 Vue.component("RouterView", View);
 Vue.component("RouterLink", Link);

 const strats = Vue.config.optionMergeStrategies;
 // use the same hook merging strategy for route hooks
 strats.beforeRouteEnter =
  strats.beforeRouteLeave =
  strats.beforeRouteUpdate =
   strats.created;
}
```

当执行 `Vue.use(VueRouter)`时，实际执行 `install` 方法，并且在 `install` 函数上添加标志位，只确保执行一次避免反复安装，另外使用局部变量`_Vue` 来接受大 `Vue`，作为插件对 `Vue` 具有依赖，为了避免 `import Vue` 增加包体积，以这种方式获取 `Vue` 对象。其次通过 `mixin` 的混入方式把 `beforeCreate` 和 `destroyed` 钩子注入到每一个组件中，对于根实例而言 `this._routerRoot` 表示自身；`this._router` 表示 `new Vue` 选项是传入的 `router` 实例，另外执行 `this._router.init(this)`去初始化 `router`，在调用 `defineReactive`方法将`_route` 转变为响应式对象，而对于子组件而言，由于组件是树状结构，在深度遍历组件树的过程中，它们在执行钩子函数的时候 `this._routerRoot` 始终指定的离他最近的传入 `router` 对象作为配置而实例化的父实例。
接着对 `Vue` 的原型上定义`$router`和`$route`，方便组件实例访问，最后通过 `Vue.component` 方法定义了全局组件 `RouterView` 和 `RouterLink`

## VueRouter 对象

VueRouter 是一个类定义在`src\index.js`

```javascript
export default class VueRouter {
 static install: () => void;
 static version: string;
 static isNavigationFailure: Function;
 static NavigationFailureType: any;
 static START_LOCATION: Route;

 app: any;
 apps: Array<any>;
 ready: boolean;
 readyCbs: Array<Function>;
 options: RouterOptions;
 mode: string;
 history: HashHistory | HTML5History | AbstractHistory;
 matcher: Matcher;
 fallback: boolean;
 beforeHooks: Array<?NavigationGuard>;
 resolveHooks: Array<?NavigationGuard>;
 afterHooks: Array<?AfterNavigationHook>;

 constructor(options: RouterOptions = {}) {
  if (process.env.NODE_ENV !== "production") {
   warn(
    this instanceof VueRouter,
    `Router must be called with the new operator.`
   );
  }
  this.app = null;
  this.apps = [];
  this.options = options;
  this.beforeHooks = [];
  this.resolveHooks = [];
  this.afterHooks = [];
  this.matcher = createMatcher(options.routes || [], this);

  let mode = options.mode || "hash";
  this.fallback =
   mode === "history" && !supportsPushState && options.fallback !== false;
  if (this.fallback) {
   mode = "hash";
  }
  if (!inBrowser) {
   mode = "abstract";
  }
  this.mode = mode;

  switch (mode) {
   case "history":
    this.history = new HTML5History(this, options.base);
    break;
   case "hash":
    this.history = new HashHistory(this, options.base, this.fallback);
    break;
   case "abstract":
    this.history = new AbstractHistory(this, options.base);
    break;
   default:
    if (process.env.NODE_ENV !== "production") {
     assert(false, `invalid mode: ${mode}`);
    }
  }
 }

 match(raw: RawLocation, current?: Route, redirectedFrom?: Location): Route {
  return this.matcher.match(raw, current, redirectedFrom);
 }

 get currentRoute(): ?Route {
  return this.history && this.history.current;
 }

 init(app: any /* Vue component instance */) {
  process.env.NODE_ENV !== "production" &&
   assert(
    install.installed,
    `not installed. Make sure to call \`Vue.use(VueRouter)\` ` +
     `before creating root instance.`
   );

  this.apps.push(app);

  // set up app destroyed handler
  // https://github.com/vuejs/vue-router/issues/2639
  app.$once("hook:destroyed", () => {
   // clean out app from this.apps array once destroyed
   const index = this.apps.indexOf(app);
   if (index > -1) this.apps.splice(index, 1);
   // ensure we still have a main app or null if no apps
   // we do not release the router so it can be reused
   if (this.app === app) this.app = this.apps[0] || null;

   if (!this.app) this.history.teardown();
  });

  // main app previously initialized
  // return as we don't need to set up new history listener
  if (this.app) {
   return;
  }

  this.app = app;

  const history = this.history;

  if (history instanceof HTML5History || history instanceof HashHistory) {
   const handleInitialScroll = (routeOrError) => {
    const from = history.current;
    const expectScroll = this.options.scrollBehavior;
    const supportsScroll = supportsPushState && expectScroll;

    if (supportsScroll && "fullPath" in routeOrError) {
     handleScroll(this, routeOrError, from, false);
    }
   };
   const setupListeners = (routeOrError) => {
    history.setupListeners();
    handleInitialScroll(routeOrError);
   };
   history.transitionTo(
    history.getCurrentLocation(),
    setupListeners,
    setupListeners
   );
  }

  history.listen((route) => {
   this.apps.forEach((app) => {
    app._route = route;
   });
  });
 }

 beforeEach(fn: Function): Function {
  return registerHook(this.beforeHooks, fn);
 }

 beforeResolve(fn: Function): Function {
  return registerHook(this.resolveHooks, fn);
 }

 afterEach(fn: Function): Function {
  return registerHook(this.afterHooks, fn);
 }

 onReady(cb: Function, errorCb?: Function) {
  this.history.onReady(cb, errorCb);
 }

 onError(errorCb: Function) {
  this.history.onError(errorCb);
 }

 push(location: RawLocation, onComplete?: Function, onAbort?: Function) {
  // $flow-disable-line
  if (!onComplete && !onAbort && typeof Promise !== "undefined") {
   return new Promise((resolve, reject) => {
    this.history.push(location, resolve, reject);
   });
  } else {
   this.history.push(location, onComplete, onAbort);
  }
 }

 replace(location: RawLocation, onComplete?: Function, onAbort?: Function) {
  // $flow-disable-line
  if (!onComplete && !onAbort && typeof Promise !== "undefined") {
   return new Promise((resolve, reject) => {
    this.history.replace(location, resolve, reject);
   });
  } else {
   this.history.replace(location, onComplete, onAbort);
  }
 }

 go(n: number) {
  this.history.go(n);
 }

 back() {
  this.go(-1);
 }

 forward() {
  this.go(1);
 }

 getMatchedComponents(to?: RawLocation | Route): Array<any> {
  const route: any = to
   ? to.matched
     ? to
     : this.resolve(to).route
   : this.currentRoute;
  if (!route) {
   return [];
  }
  return [].concat.apply(
   [],
   route.matched.map((m) => {
    return Object.keys(m.components).map((key) => {
     return m.components[key];
    });
   })
  );
 }

 resolve(
  to: RawLocation,
  current?: Route,
  append?: boolean
 ): {
  location: Location,
  route: Route,
  href: string,
  // for backwards compat
  normalizedTo: Location,
  resolved: Route,
 } {
  current = current || this.history.current;
  const location = normalizeLocation(to, current, append, this);
  const route = this.match(location, current);
  const fullPath = route.redirectedFrom || route.fullPath;
  const base = this.history.base;
  const href = createHref(base, fullPath, this.mode);
  return {
   location,
   route,
   href,
   // for backwards compat
   normalizedTo: location,
   resolved: route,
  };
 }

 getRoutes() {
  return this.matcher.getRoutes();
 }

 addRoute(parentOrRoute: string | RouteConfig, route?: RouteConfig) {
  this.matcher.addRoute(parentOrRoute, route);
  if (this.history.current !== START) {
   this.history.transitionTo(this.history.getCurrentLocation());
  }
 }

 addRoutes(routes: Array<RouteConfig>) {
  if (process.env.NODE_ENV !== "production") {
   warn(
    false,
    "router.addRoutes() is deprecated and has been removed in Vue Router 4. Use router.addRoute() instead."
   );
  }
  this.matcher.addRoutes(routes);
  if (this.history.current !== START) {
   this.history.transitionTo(this.history.getCurrentLocation());
  }
 }
}
```

构造函数中定义了许多属性，其中 `app` 为根实例，`apps` 存储`$options.router` 属性的 `Vue` 实例，`this.options` 保存传入的路由配置 `matcher` 表示路由匹配器，`fallback` 表示浏览器不支持 `H5history` 下进行降级处理，`mode` 表示路由模式，根据 `mode` 实例化不同的基类,在 `new Vue` 的过程中会把 `VueRouter` 的实例对象传入 `options` 当中并在混入的钩子函数中执行 `init` 方法

```javascript
  init (app: any /* Vue component instance */) {
    process.env.NODE_ENV !== 'production' &&
      assert(
        install.installed,
        `not installed. Make sure to call \`Vue.use(VueRouter)\` ` +
          `before creating root instance.`
      )

    this.apps.push(app)

    // set up app destroyed handler
    // https://github.com/vuejs/vue-router/issues/2639
    app.$once('hook:destroyed', () => {
      // clean out app from this.apps array once destroyed
      const index = this.apps.indexOf(app)
      if (index > -1) this.apps.splice(index, 1)
      // ensure we still have a main app or null if no apps
      // we do not release the router so it can be reused
      if (this.app === app) this.app = this.apps[0] || null

      if (!this.app) this.history.teardown()
    })

    // main app previously initialized
    // return as we don't need to set up new history listener
    if (this.app) {
      return
    }

    this.app = app

    const history = this.history

    if (history instanceof HTML5History || history instanceof HashHistory) {
      const handleInitialScroll = routeOrError => {
        const from = history.current
        const expectScroll = this.options.scrollBehavior
        const supportsScroll = supportsPushState && expectScroll

        if (supportsScroll && 'fullPath' in routeOrError) {
          handleScroll(this, routeOrError, from, false)
        }
      }
      const setupListeners = routeOrError => {
        history.setupListeners()
        handleInitialScroll(routeOrError)
      }
      history.transitionTo(
        history.getCurrentLocation(),
        setupListeners,
        setupListeners
      )
    }

    history.listen(route => {
      this.apps.forEach(app => {
        app._route = route
      })
    })
  }
```

将传入的 `Vue` 实例添加到 `app` 当中，对于 `options` 中又 `router` 选项的实例添加到 `apps` 中，拿到当前的 `history` 根据他的不同类型决定执行他不同的逻辑,最后调用 `transitionTo` 方法定义在`src\history\base.js`

```javascript
  transitionTo (
    location: RawLocation,
    onComplete?: Function,
    onAbort?: Function
  ) {
    let route
    // catch redirect option https://github.com/vuejs/vue-router/issues/3201
    try {
      route = this.router.match(location, this.current)
    }
  }
```

内部调用了 `match` 方法完成路由过度。

