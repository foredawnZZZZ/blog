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

## matcher

`matcher` 相关实现定义在`src\create-matcher.js`,`matcher` 作为路由匹配器，用来匹配 `location` 和 `Route` 的这两个概念定义在`flow\declarations.js`

```javascript
declare type Location = {
 _normalized?: boolean,
 name?: string,
 path?: string,
 hash?: string,
 query?: Dictionary<string>,
 params?: Dictionary<string>,
 append?: boolean,
 replace?: boolean,
};

declare type Route = {
 path: string,
 name: ?string,
 hash: string,
 query: Dictionary<string>,
 params: Dictionary<string>,
 fullPath: string,
 matched: Array<RouteRecord>,
 redirectedFrom?: string,
 meta?: any,
};
```

`location` 数据结构与 window.location 相似，都是对 `url` 结构的描述，`Route` 表示路由中的线路,`matcher` 的创建来自 `createMatcher` 函数，定义在`src\create-matcher.js`

```javascript
export function createMatcher(
 routes: Array<RouteConfig>,
 router: VueRouter
): Matcher {
 const { pathList, pathMap, nameMap } = createRouteMap(routes);

 function addRoutes(routes) {
  createRouteMap(routes, pathList, pathMap, nameMap);
 }

 function addRoute(parentOrRoute, route) {
  const parent =
   typeof parentOrRoute !== "object" ? nameMap[parentOrRoute] : undefined;
  // $flow-disable-line
  createRouteMap([route || parentOrRoute], pathList, pathMap, nameMap, parent);

  // add aliases of parent
  if (parent && parent.alias.length) {
   createRouteMap(
    // $flow-disable-line route is defined if parent is
    parent.alias.map((alias) => ({ path: alias, children: [route] })),
    pathList,
    pathMap,
    nameMap,
    parent
   );
  }
 }

 function getRoutes() {
  return pathList.map((path) => pathMap[path]);
 }

 function match(
  raw: RawLocation,
  currentRoute?: Route,
  redirectedFrom?: Location
 ): Route {
  const location = normalizeLocation(raw, currentRoute, false, router);
  const { name } = location;

  if (name) {
   const record = nameMap[name];
   if (process.env.NODE_ENV !== "production") {
    warn(record, `Route with name '${name}' does not exist`);
   }
   if (!record) return _createRoute(null, location);
   const paramNames = record.regex.keys
    .filter((key) => !key.optional)
    .map((key) => key.name);

   if (typeof location.params !== "object") {
    location.params = {};
   }

   if (currentRoute && typeof currentRoute.params === "object") {
    for (const key in currentRoute.params) {
     if (!(key in location.params) && paramNames.indexOf(key) > -1) {
      location.params[key] = currentRoute.params[key];
     }
    }
   }

   location.path = fillParams(
    record.path,
    location.params,
    `named route "${name}"`
   );
   return _createRoute(record, location, redirectedFrom);
  } else if (location.path) {
   location.params = {};
   for (let i = 0; i < pathList.length; i++) {
    const path = pathList[i];
    const record = pathMap[path];
    if (matchRoute(record.regex, location.path, location.params)) {
     return _createRoute(record, location, redirectedFrom);
    }
   }
  }
  // no match
  return _createRoute(null, location);
 }

 // ... ...

 return {
  match,
  addRoute,
  getRoutes,
  addRoutes,
 };
}
```

该方法接受两个参数，一个用户自定义的配置，一个 `VueRouter` 实例，首先逻辑是调用 `createRouteMap` 创建一个路由映射表定义在`src\create-route-map.js`

```javascript
export function createRouteMap(
 routes: Array<RouteConfig>,
 oldPathList?: Array<string>,
 oldPathMap?: Dictionary<RouteRecord>,
 oldNameMap?: Dictionary<RouteRecord>,
 parentRoute?: RouteRecord
): {
 pathList: Array<string>,
 pathMap: Dictionary<RouteRecord>,
 nameMap: Dictionary<RouteRecord>,
} {
 // the path list is used to control path matching priority
 const pathList: Array<string> = oldPathList || [];
 // $flow-disable-line
 const pathMap: Dictionary<RouteRecord> = oldPathMap || Object.create(null);
 // $flow-disable-line
 const nameMap: Dictionary<RouteRecord> = oldNameMap || Object.create(null);

 routes.forEach((route) => {
  addRouteRecord(pathList, pathMap, nameMap, route, parentRoute);
 });

 // ensure wildcard routes are always at the end
 for (let i = 0, l = pathList.length; i < l; i++) {
  if (pathList[i] === "*") {
   pathList.push(pathList.splice(i, 1)[0]);
   l--;
   i--;
  }
 }
 // ... ...

 return {
  pathList,
  pathMap,
  nameMap,
 };
}
```

`createRouteMap` 函数目标是把用户的路由表转换为一张映射表，`pathList` 存储所有的 `path`，`pathMap` 表示一个 `path` 到 `RouteRecord` 的映射关系，`nameMap` 表示 `name` 到 `RouteRecord` 的映射关系，`RouteRecord` 的概念定义在`flow\declarations.js`

```javascript
declare type RouteRecord = {
 path: string,
 alias: Array<string>,
 regex: RouteRegExp,
 components: Dictionary<any>,
 instances: Dictionary<any>,
 enteredCbs: Dictionary<Array<Function>>,
 name: ?string,
 parent: ?RouteRecord,
 redirect: ?RedirectOption,
 matchAs: ?string,
 beforeEnter: ?NavigationGuard,
 meta: any,
 props: boolean | Object | Function | Dictionary<boolean | Object | Function>,
};
```

通过遍历 routes 为每一个 route 执行 addRouteRecord 方法生成记录

```javascript
function addRouteRecord(
 pathList: Array<string>,
 pathMap: Dictionary<RouteRecord>,
 nameMap: Dictionary<RouteRecord>,
 route: RouteConfig,
 parent?: RouteRecord,
 matchAs?: string
) {
 const { path, name } = route;
 if (process.env.NODE_ENV !== "production") {
  assert(path != null, `"path" is required in a route configuration.`);
  assert(
   typeof route.component !== "string",
   `route config "component" for path: ${String(path || name)} cannot be a ` +
    `string id. Use an actual component instead.`
  );

  warn(
   // eslint-disable-next-line no-control-regex
   !/[^\u0000-\u007F]+/.test(path),
   `Route with path "${path}" contains unencoded characters, make sure ` +
    `your path is correctly encoded before passing it to the router. Use ` +
    `encodeURI to encode static segments of your path.`
  );
 }

 const pathToRegexpOptions: PathToRegexpOptions =
  route.pathToRegexpOptions || {};
 const normalizedPath = normalizePath(path, parent, pathToRegexpOptions.strict);

 if (typeof route.caseSensitive === "boolean") {
  pathToRegexpOptions.sensitive = route.caseSensitive;
 }

 const record: RouteRecord = {
  path: normalizedPath,
  regex: compileRouteRegex(normalizedPath, pathToRegexpOptions),
  components: route.components || { default: route.component },
  alias: route.alias
   ? typeof route.alias === "string"
     ? [route.alias]
     : route.alias
   : [],
  instances: {},
  enteredCbs: {},
  name,
  parent,
  matchAs,
  redirect: route.redirect,
  beforeEnter: route.beforeEnter,
  meta: route.meta || {},
  props:
   route.props == null
    ? {}
    : route.components
    ? route.props
    : { default: route.props },
 };

 if (route.children) {
  // Warn if route is named, does not redirect and has a default child route.
  // If users navigate to this route by name, the default child will
  // not be rendered (GH Issue #629)
  if (process.env.NODE_ENV !== "production") {
   if (
    route.name &&
    !route.redirect &&
    route.children.some((child) => /^\/?$/.test(child.path))
   ) {
    warn(
     false,
     `Named Route '${route.name}' has a default child route. ` +
      `When navigating to this named route (:to="{name: '${route.name}'"), ` +
      `the default child route will not be rendered. Remove the name from ` +
      `this route and use the name of the default child route for named ` +
      `links instead.`
    );
   }
  }
  route.children.forEach((child) => {
   const childMatchAs = matchAs
    ? cleanPath(`${matchAs}/${child.path}`)
    : undefined;
   addRouteRecord(pathList, pathMap, nameMap, child, record, childMatchAs);
  });
 }

 if (!pathMap[record.path]) {
  pathList.push(record.path);
  pathMap[record.path] = record;
 }

 if (route.alias !== undefined) {
  const aliases = Array.isArray(route.alias) ? route.alias : [route.alias];
  for (let i = 0; i < aliases.length; ++i) {
   const alias = aliases[i];
   if (process.env.NODE_ENV !== "production" && alias === path) {
    warn(
     false,
     `Found an alias with the same value as the path: "${path}". You have to remove that alias. It will be ignored in development.`
    );
    // skip in dev to make it work
    continue;
   }

   const aliasRoute = {
    path: alias,
    children: route.children,
   };
   addRouteRecord(
    pathList,
    pathMap,
    nameMap,
    aliasRoute,
    parent,
    record.path || "/" // matchAs
   );
  }
 }

 if (name) {
  if (!nameMap[name]) {
   nameMap[name] = record;
  } else if (process.env.NODE_ENV !== "production" && !matchAs) {
   warn(
    false,
    `Duplicate named routes definition: ` +
     `{ name: "${name}", path: "${record.path}" }`
   );
  }
 }
}
```

`path` 是规范化后的路径，他会根据 `parent` 的 `path` 做计算，`regx` 是正则扩展，`components` 是路由组件，`instances` 是路由实例，`parent` 是父 `RouteRecord`，因为路由表可以配置子路由，所以结构是树状的，设置了 `children` 就会进行递归，最后拿到一个完整的记录。由于 `pathList，pathMap，nameMap` 都是引用类型在遍历执行 `addRouteRecord` 方法时会不断给源对象添加数据，整个 `createRouteMap` 方法执行完，就会得到完成的对象。最后回到 `createMatcher` 中，定义一系列方法后，最终返回一个对象，所以 `matcher` 是一个对象，他对外暴露了 `match` 和 `addRoute` 等方法

**addRoute**
`addRoutes` 方法是动态添加路由配置，部分开发场景下路由表不能写死，需要一些条件动态增加路由，本质就是在次调用 `createRouteMap`，传入新的配置，根据引用类型特征，修改配置。
**match**

```javascript
function match(
 raw: RawLocation,
 currentRoute?: Route,
 redirectedFrom?: Location
): Route {
 const location = normalizeLocation(raw, currentRoute, false, router);
 const { name } = location;

 if (name) {
  const record = nameMap[name];
  if (process.env.NODE_ENV !== "production") {
   warn(record, `Route with name '${name}' does not exist`);
  }
  if (!record) return _createRoute(null, location);
  const paramNames = record.regex.keys
   .filter((key) => !key.optional)
   .map((key) => key.name);

  if (typeof location.params !== "object") {
   location.params = {};
  }

  if (currentRoute && typeof currentRoute.params === "object") {
   for (const key in currentRoute.params) {
    if (!(key in location.params) && paramNames.indexOf(key) > -1) {
     location.params[key] = currentRoute.params[key];
    }
   }
  }

  location.path = fillParams(
   record.path,
   location.params,
   `named route "${name}"`
  );
  return _createRoute(record, location, redirectedFrom);
 } else if (location.path) {
  location.params = {};
  for (let i = 0; i < pathList.length; i++) {
   const path = pathList[i];
   const record = pathMap[path];
   if (matchRoute(record.regex, location.path, location.params)) {
    return _createRoute(record, location, redirectedFrom);
   }
  }
 }
 // no match
 return _createRoute(null, location);
}
```

该方法接受三个参数，raw 是一个 url 字符串，currentRoute 是当前 Route 类型，表示当前路径，match 方法返回一个路径，根据传入的 raw 和当前的路径 currentRoute 计算出一个新的路径并返回。
首先执行 normalizeLocation，定义在`src\util\location.js`

```javascript
export function normalizeLocation(
 raw: RawLocation,
 current: ?Route,
 append: ?boolean,
 router: ?VueRouter
): Location {
 let next: Location = typeof raw === "string" ? { path: raw } : raw;
 // named target
 if (next._normalized) {
  return next;
 } else if (next.name) {
  next = extend({}, raw);
  const params = next.params;
  if (params && typeof params === "object") {
   next.params = extend({}, params);
  }
  return next;
 }

 // relative params
 if (!next.path && next.params && current) {
  next = extend({}, next);
  next._normalized = true;
  const params: any = extend(extend({}, current.params), next.params);
  if (current.name) {
   next.name = current.name;
   next.params = params;
  } else if (current.matched.length) {
   const rawPath = current.matched[current.matched.length - 1].path;
   next.path = fillParams(rawPath, params, `path ${current.path}`);
  } else if (process.env.NODE_ENV !== "production") {
   warn(false, `relative params navigation requires a current route.`);
  }
  return next;
 }

 const parsedPath = parsePath(next.path || "");
 const basePath = (current && current.path) || "/";
 const path = parsedPath.path
  ? resolvePath(parsedPath.path, basePath, append || next.append)
  : basePath;

 const query = resolveQuery(
  parsedPath.query,
  next.query,
  router && router.options.parseQuery
 );

 let hash = next.hash || parsedPath.hash;
 if (hash && hash.charAt(0) !== "#") {
  hash = `#${hash}`;
 }

 return {
  _normalized: true,
  path,
  query,
  hash,
 };
}
```

根据 `raw` 和 `current` 计算出新的 `location`，一种是有 `params` 且没有 `path`，一种是有 `path` 的，对于第一种情况，如果 `current` 有 `name`，则计算出 `location` 也有 `name`，计算完毕后对 `location` 的 `name` 和 `path` 两种情况做处理。

- name
  有 `name` 的情况下根据 `nameMap` 匹配到 `record（RouterRecord ）`，如果 `record` 不存在，则匹配失败，返回一个空路径；然后拿到 `record` 对应的 `paramNames`，再对比 `currentRoute` 中的 `params`，把交集部分的 `params` 添加到 `location` 中，然后在通过 `fillParams` 方法计算出 `location.path`，最后调用`_createRoute` 去生成一个新路径
- path
  通过 `name` 可以快速查找 `record`，但是计算后的 `location.path` 是一个真实路径，而 `record` 中的路径可能会有 `param`，所以需要对 `pathList` 做顺序遍历，然后通过 `matchRoute` 方法根据 `record.regex`, `location.path`, `location.params` 去生成新路径。因为是顺序遍历所以写在前面的优先匹配

`_createRoute` 最终会调用 `createRoute` 方法 定义在

```javascript
function _createRoute(
 record: ?RouteRecord,
 location: Location,
 redirectedFrom?: Location
): Route {
 if (record && record.redirect) {
  return redirect(record, redirectedFrom || location);
 }
 if (record && record.matchAs) {
  return alias(record, location, record.matchAs);
 }
 return createRoute(record, location, redirectedFrom, router);
}

export function createRoute(
 record: ?RouteRecord,
 location: Location,
 redirectedFrom?: ?Location,
 router?: VueRouter
): Route {
 const stringifyQuery = router && router.options.stringifyQuery;

 let query: any = location.query || {};
 try {
  query = clone(query);
 } catch (e) {}

 const route: Route = {
  name: location.name || (record && record.name),
  meta: (record && record.meta) || {},
  path: location.path || "/",
  hash: location.hash || "",
  query,
  params: location.params || {},
  fullPath: getFullPath(location, stringifyQuery),
  matched: record ? formatMatch(record) : [],
 };
 if (redirectedFrom) {
  route.redirectedFrom = getFullPath(redirectedFrom, stringifyQuery);
 }
 return Object.freeze(route);
}

function formatMatch(record: ?RouteRecord): Array<RouteRecord> {
 const res = [];
 while (record) {
  res.unshift(record);
  record = record.parent;
 }
 return res;
}
```

根据 `record` 和 `location` 创建一个 `Route` 路径，所有的 `Route` 最终都会通过 `createRoute` 函数创建并且外部无法修改，它带有 `matched` 属性，它通过formatMatch方法计算而来，通过record向上查找parent，直到最外层，把所有的record都推入一个数组中，最终返回，他记录了一条线路上所有的record，辅助后面的渲染工作。
