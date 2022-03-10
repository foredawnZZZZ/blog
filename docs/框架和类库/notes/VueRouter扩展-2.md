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

根据 `record` 和 `location` 创建一个 `Route` 路径，所有的 `Route` 最终都会通过 `createRoute` 函数创建并且外部无法修改，它带有 `matched` 属性，它通过 formatMatch 方法计算而来，通过 record 向上查找 parent，直到最外层，把所有的 record 都推入一个数组中，最终返回，他记录了一条线路上所有的 record，辅助后面的渲染工作。

## 导航守卫

当切换路由时，便会执行到 `history.transitionTo`

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
    } catch (e) {
      this.errorCbs.forEach(cb => {
        cb(e)
      })
      // Exception should still be thrown
      throw e
    }
    const prev = this.current
    this.confirmTransition(
      route,
      () => {
        this.updateRoute(route)
        onComplete && onComplete(route)
        this.ensureURL()
        this.router.afterHooks.forEach(hook => {
          hook && hook(route, prev)
        })

        // fire ready cbs once
        if (!this.ready) {
          this.ready = true
          this.readyCbs.forEach(cb => {
            cb(route)
          })
        }
      },
      err => {
        if (onAbort) {
          onAbort(err)
        }
        if (err && !this.ready) {
          // Initial redirection should not mark the history as ready yet
          // because it's triggered by the redirection instead
          // https://github.com/vuejs/vue-router/issues/3225
          // https://github.com/vuejs/vue-router/issues/3331
          if (!isNavigationFailure(err, NavigationFailureType.redirected) || prev !== START) {
            this.ready = true
            this.readyErrorCbs.forEach(cb => {
              cb(err)
            })
          }
        }
      }
    )
  }
```

首先根据方法 `location` 和当前路径 `current` 执行 `this.router.match` 方法去匹配目标路径，这里 `this.current` 是 `history` 维护的当前路径，它的初始值是在 `history` 的构造函数中初始化的

```javascript
this.current = START;

export const START = createRoute(null, {
 path: "/",
});
```

`TransitionTo` 其实就是在切换 `current`，拿到新的路径后，会调用 `confirmTransition` 方法去做真正的切换，由于过程中可能会有异步组件，所以会带有成功回调与失败回调

```javascript
 confirmTransition (route: Route, onComplete: Function, onAbort?: Function) {
    const current = this.current
    this.pending = route
    const abort = err => {
      // changed after adding errors with
      // https://github.com/vuejs/vue-router/pull/3047 before that change,
      // redirect and aborted navigation would produce an err == null
      if (!isNavigationFailure(err) && isError(err)) {
        if (this.errorCbs.length) {
          this.errorCbs.forEach(cb => {
            cb(err)
          })
        } else {
          if (process.env.NODE_ENV !== 'production') {
            warn(false, 'uncaught error during route navigation:')
          }
          console.error(err)
        }
      }
      onAbort && onAbort(err)
    }
    const lastRouteIndex = route.matched.length - 1
    const lastCurrentIndex = current.matched.length - 1
    if (
      isSameRoute(route, current) &&
      // in the case the route map has been dynamically appended to
      lastRouteIndex === lastCurrentIndex &&
      route.matched[lastRouteIndex] === current.matched[lastCurrentIndex]
    ) {
      this.ensureURL()
      if (route.hash) {
        handleScroll(this.router, current, route, false)
      }
      return abort(createNavigationDuplicatedError(current, route))
    }

    const { updated, deactivated, activated } = resolveQueue(
      this.current.matched,
      route.matched
    )

    const queue: Array<?NavigationGuard> = [].concat(
      // in-component leave guards
      extractLeaveGuards(deactivated),
      // global before hooks
      this.router.beforeHooks,
      // in-component update hooks
      extractUpdateHooks(updated),
      // in-config enter guards
      activated.map(m => m.beforeEnter),
      // async components
      resolveAsyncComponents(activated)
    )

    const iterator = (hook: NavigationGuard, next) => {
      if (this.pending !== route) {
        return abort(createNavigationCancelledError(current, route))
      }
      try {
        hook(route, current, (to: any) => {
          if (to === false) {
            // next(false) -> abort navigation, ensure current URL
            this.ensureURL(true)
            abort(createNavigationAbortedError(current, route))
          } else if (isError(to)) {
            this.ensureURL(true)
            abort(to)
          } else if (
            typeof to === 'string' ||
            (typeof to === 'object' &&
              (typeof to.path === 'string' || typeof to.name === 'string'))
          ) {
            // next('/') or next({ path: '/' }) -> redirect
            abort(createNavigationRedirectedError(current, route))
            if (typeof to === 'object' && to.replace) {
              this.replace(to)
            } else {
              this.push(to)
            }
          } else {
            // confirm transition and pass on the value
            next(to)
          }
        })
      } catch (e) {
        abort(e)
      }
    }

    runQueue(queue, iterator, () => {
      // wait until async components are resolved before
      // extracting in-component enter guards
      const enterGuards = extractEnterGuards(activated)
      const queue = enterGuards.concat(this.router.resolveHooks)
      runQueue(queue, iterator, () => {
        if (this.pending !== route) {
          return abort(createNavigationCancelledError(current, route))
        }
        this.pending = null
        onComplete(route)
        if (this.router.app) {
          this.router.app.$nextTick(() => {
            handleRouteEntered(route)
          })
        }
      })
    })
  }
```

首先去定义去定义 `abort` 方法，然后判断如果满足计算后的 `route` 和 `current` 是相同路径，则直接调用 `ensureURL` 和 `abort` 方法。接着通过 `resolveQueue` 解析三个队列

```javascript
function resolveQueue(
 current: Array<RouteRecord>,
 next: Array<RouteRecord>
): {
 updated: Array<RouteRecord>,
 activated: Array<RouteRecord>,
 deactivated: Array<RouteRecord>,
} {
 let i;
 const max = Math.max(current.length, next.length);
 for (i = 0; i < max; i++) {
  if (current[i] !== next[i]) {
   break;
  }
 }
 return {
  updated: next.slice(0, i),
  activated: next.slice(i),
  deactivated: current.slice(i),
 };
}
```

因为 `route.matched` 是个 `RouteRecord` 数组，`current` 是 `route`，那么遍历对比两边的 `RouteRecord`，找到不一样的位置 `i`，那么 `next` 中从 0 到 `i` 的 `RouteRecord` 是两边都是一样的，则为 `updated` 部分；从 `i` 到最后的 `RouteRecord` 是 `next` 独有的，为 `activated` 部分；而 `current` 中从 `i` 到最后的 `RouteRecord` 则没有了，为 `deactivated` 部分。拿到三个数组后，就会执行一系列的钩子函数，所谓的导航守卫就是发生在路由路径切换的时候，执行的 `hooks`。
这些钩子的执行逻辑是从定义 `queue` 数组开始，在定义一个迭代器函数 `iterator`；最后执行 `runQueue` 方法来执行数组，定义在`src\util\async.js`

```javascript
export function runQueue(
 queue: Array<?NavigationGuard>,
 fn: Function,
 cb: Function
) {
 const step = (index) => {
  if (index >= queue.length) {
   cb();
  } else {
   if (queue[index]) {
    fn(queue[index], () => {
     step(index + 1);
    });
   } else {
    step(index + 1);
   }
  }
 };
 step(0);
}
```

**异步函数队列化执行模式**
<br/>

`queue` 是一个 `NavigationGuard` 类型的数组，定义的 `step` 函数，每次根据 `index` 在 `queue` 中取出一个 `guard`，然后执行 `fn` 函数，并且把 `guard` 作为参数传入，第二个参数是一个函数，当这个函数执行的时候在递归执行 `step` 函数，前进到下一个函数，这里的 `fn` 是迭代器函数 `iterator`,他就是去执行每一个导航守卫的 `hook`，并传入 `route`，`current`，和匿名函数，就是对应的 `to，from，next`，当执行匿名函数时会根据一些条件执行 `abort` 或 `next`，只要执行 `next` 方法的时候，才会前进到下一个导航守卫钩子中，这也就是为什么需要调用 `next` 方法才能继续下去。

<br/>

**queue 的构造顺序**

1. 在失活的组件调用离开守卫
2. 调用全局的 beforeEach 守卫
3. 在重用的组件调用 beforeRouteUpdate 守卫
4. 在激活的路由里调用 beforeEnter 守卫
5. 解析异步路由组件

```javascript
// in-component leave guards
extractLeaveGuards(deactivated),
 // global before hooks
 this.router.beforeHooks,
 // in-component update hooks
 extractUpdateHooks(updated),
 // in-config enter guards
 activated.map((m) => m.beforeEnter),
 // async components
 resolveAsyncComponents(activated);
```

**第一步**：执行 `extractLeaveGuards`

```javascript
function extractLeaveGuards(deactivated: Array<RouteRecord>): Array<?Function> {
 return extractGuards(deactivated, "beforeRouteLeave", bindGuard, true);
}
```

内部调用 `extractGuards` 可以从 `RouteRecord` 数组中提取各个阶段的守卫

```javascript
function extractGuards(
 records: Array<RouteRecord>,
 name: string,
 bind: Function,
 reverse?: boolean
): Array<?Function> {
 const guards = flatMapComponents(records, (def, instance, match, key) => {
  const guard = extractGuard(def, name);
  if (guard) {
   return Array.isArray(guard)
    ? guard.map((guard) => bind(guard, instance, match, key))
    : bind(guard, instance, match, key);
  }
 });
 return flatten(reverse ? guards.reverse() : guards);
}
```

这里用到了 `flatMapComponents` 方法从 `records` 中获取所有的导航，定义在`src\util\resolve-components.js`

```javascript
export function flatMapComponents(
 matched: Array<RouteRecord>,
 fn: Function
): Array<?Function> {
 return flatten(
  matched.map((m) => {
   return Object.keys(m.components).map((key) =>
    fn(m.components[key], m.instances[key], m, key)
   );
  })
 );
}

export function flatten(arr: Array<any>): Array<any> {
 return Array.prototype.concat.apply([], arr);
}
```

方法的作用是返回一个数组，数组的元素是从 `matched` 里获取到的所有组件的 `key`，然后返回 `fn` 函数的执行结果，`flatten` 作用是将二维数组拍平成一维数组。`flatMapComponents` 的调用会执行每个 `fn`，通过 `extractGuard` 获取到组件对应 `name` 的导航守卫

```javascript
function extractGuard(
 def: Object | Function,
 key: string
): NavigationGuard | Array<NavigationGuard> {
 if (typeof def !== "function") {
  // extend now so that global mixins are applied.
  def = _Vue.extend(def);
 }
 return def.options[key];
}
```

获取到 `guard` 后，在调用 `bindGuard`

```javascript
function bindGuard(guard: NavigationGuard, instance: ?_Vue): ?NavigationGuard {
 if (instance) {
  return function boundRouteGuard() {
   return guard.apply(instance, arguments);
  };
 }
}
```

把组件的实例 `instance` 作为函数执行的上下文绑定到 `guard` 上，那么对于 `extractLeaveGuards` 函数而言，获取到的就是所有失活组件中定义的 `beforeRouteLeave` 钩子
