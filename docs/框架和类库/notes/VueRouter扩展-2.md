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

把组件的实例 `instance` 作为函数执行的上下文绑定到 `guard` 上，那么对于 `extractLeaveGuards` 函数而言，获取到的就是所有失活组件中定义的 `beforeRouteLeave` 钩子;
第二步是 `this.router.beforeHooks`,在我们的 `VueRouter` 类中定义 `beforeEach` 方法，定义在`src\index.js`中：

```javascript
beforeEach (fn: Function): Function {
  return registerHook(this.beforeHooks, fn)
}

function registerHook (list: Array<any>, fn: Function): Function {
  list.push(fn)
  return () => {
    const i = list.indexOf(fn)
    if (i > -1) list.splice(i, 1)
  }
}
```

当使用 `beforeEach` 时就会向 `beforeHooks` 里面添加一个钩子函数，这样 `this.router.beforeHooks` 获取的就是用户注册的全局 `beforeEach` 守卫;第三步执行 `extractUpdateHooks`

```javascript
function extractUpdateHooks(updated: Array<RouteRecord>): Array<?Function> {
 return extractGuards(updated, "beforeRouteUpdate", bindGuard);
}
```

获取所有重用组件中定义的 `beforeRouteUpdate` 钩子函数;
第四步是执行 `activated` 中存储的 `beforeEnter` 函数，获取激活路由配置中定义的钩子;
第五步是执行 `resolveAsyncComponents`，解析异步组件`src\util\resolve-components.js`

```javascript
export function resolveAsyncComponents(matched: Array<RouteRecord>): Function {
 return (to, from, next) => {
  let hasAsync = false;
  let pending = 0;
  let error = null;

  flatMapComponents(matched, (def, _, match, key) => {
   // if it's a function and doesn't have cid attached,
   // assume it's an async component resolve function.
   // we are not using Vue's default async resolving mechanism because
   // we want to halt the navigation until the incoming component has been
   // resolved.
   if (typeof def === "function" && def.cid === undefined) {
    hasAsync = true;
    pending++;

    const resolve = once((resolvedDef) => {
     if (isESModule(resolvedDef)) {
      resolvedDef = resolvedDef.default;
     }
     // save resolved on async factory in case it's used elsewhere
     def.resolved =
      typeof resolvedDef === "function"
       ? resolvedDef
       : _Vue.extend(resolvedDef);
     match.components[key] = resolvedDef;
     pending--;
     if (pending <= 0) {
      next();
     }
    });

    const reject = once((reason) => {
     const msg = `Failed to resolve async component ${key}: ${reason}`;
     process.env.NODE_ENV !== "production" && warn(false, msg);
     if (!error) {
      error = isError(reason) ? reason : new Error(msg);
      next(error);
     }
    });

    let res;
    try {
     res = def(resolve, reject);
    } catch (e) {
     reject(e);
    }
    if (res) {
     if (typeof res.then === "function") {
      res.then(resolve, reject);
     } else {
      // new syntax in Vue 2.3
      const comp = res.component;
      if (comp && typeof comp.then === "function") {
       comp.then(resolve, reject);
      }
     }
    }
   }
  });

  if (!hasAsync) next();
 };
}
```

返回一个带有标准参数的导航钩子，利用 `flatMapComponents` 方法从 `matched` 中获取到每个组件，如果是异步组件执行异步逻辑，加载成功后放到对应的 `components` 上，在执行 `next` 函数;
当执行到 `runQueue` 方法时，第六步：在激活组件里调用 `beforeRouteEnter`

```javascript
runQueue(queue, iterator, () => {
  const enterGuards = extractEnterGuar(activated)
}
function extractEnterGuards (
  activated: Array<RouteRecord>
): Array<?Function> {
  return extractGuards(
    activated,
    'beforeRouteEnter',
    (guard, _, match, key) => {
      return bindEnterGuard(guard, match, key)
    }
  )
}
function bindEnterGuard (
  guard: NavigationGuard,
  match: RouteRecord,
  key: string
): NavigationGuard {
  return function routeEnterGuard (to, from, next) {
    return guard(to, from, cb => {
      if (typeof cb === 'function') {
        if (!match.enteredCbs[key]) {
          match.enteredCbs[key] = []
        }
        match.enteredCbs[key].push(cb)
      }
      next(cb)
    })
  }
}
```

`extractEnterGuards` 同样利用 `extractGuards` 方法获取组件中的 `beforeRouteEnter` 钩子，注意当守卫执行前，组件实例没有创建，所以拿不到组件实例，要通过传递一个回调給 next 方法访问组件实例；
第七步:执行全局的 `beforeResolve` 守卫

```javascript
const queue = enterGuards.concat(this.router.resolveHooks)

beforeResolve (fn: Function): Function {
  return registerHook(this.resolveHooks, fn)
}
```

使用 `router.beoforeResolve` 注册一个全局守卫，就会向 `resloveHooks` 添加一个钩子函数;
第八步是在最后执行 onComplete,它是传入得到的匿名函数，

```javascript
this.confirmTransition(
  route,
  () => {
    this.updateRoute(route)
    onComplete && onComplete(route)
    this.ensureURL()
    this.router.afterHooks.forEach(hook => {
      hook && hook(route, prev)
    })
  },
)

afterEach (fn: Function): Function {
  return registerHook(this.afterHooks, fn)
}
```

当使用 router.afterEnter 注册一个全局守卫，就会往 router.afterHooks 添加一个钩子函数。**至此所有的导航守卫执行完毕，是伴随着路由切换完成的，从表面现象来看 url 会发生变化，组件也会发生变化**

## url 变化

当点击 `router-link` 时最终会执行 `router.push` 方法，定义在`src\index.js`

```javascript
push (location: RawLocation, onComplete?: Function,onAbort?: Function) {
  // $flow-disable-line
  if (!onComplete && !onAbort && typeof Promise !=='undefined') {
    return new Promise((resolve, reject) => {
      this.history.push(location, resolve, reject)
    })
  } else {
    this.history.push(location, onComplete, onAbort)
  }
}
```

`this.history` 是基于子类实现的，在不同的 `mode` 下实现不同，以 `hash` 为类，`push` 方法定义在`src\history\hash.js`

```javascript
push (location: RawLocation, onComplete?: Function,onAbort?: Function) {
  const { current: fromRoute } = this
  this.transitionTo(
    location,
    route => {
      pushHash(route.fullPath)
      handleScroll(this.router, route, fromRoute, false)
      onComplete && onComplete(route)
    },
    onAbort
  )
}
```

`push` 函数会先执行 `this.transtionTo` 做路径切换，在切换完成的回调函数中，执行 `pushHash` 函数：

```javascript
function pushHash(path) {
 if (supportsPushState) {
  pushState(getUrl(path));
 } else {
  window.location.hash = path;
 }
}
```

`supportsPushState` 的定义`src\util\push-state.js`

```javascript
export const supportsPushState =
 inBrowser &&
 (function () {
  const ua = window.navigator.userAgent;

  if (
   (ua.indexOf("Android 2.") !== -1 || ua.indexOf("Android 4.0") !== -1) &&
   ua.indexOf("Mobile Safari") !== -1 &&
   ua.indexOf("Chrome") === -1 &&
   ua.indexOf("Windows Phone") === -1
  ) {
   return false;
  }

  return window.history && typeof window.history.pushState === "function";
 })();
```

处理兼容性，获取当前完整的 `url`，执行 `pushState` 方法

```javascript
export function pushState(url?: string, replace?: boolean) {
 saveScrollPosition();
 // try...catch the pushState call to get around Safari
 // DOM Exception 18 where it limits to 100 pushState calls
 const history = window.history;
 try {
  if (replace) {
   // preserve existing history state as it could be overriden by the user
   const stateCopy = extend({}, history.state);
   stateCopy.key = getStateKey();
   history.replaceState(stateCopy, "", url);
  } else {
   history.pushState({ key: setStateKey(genStateKey()) }, "", url);
  }
 } catch (e) {
  window.location[replace ? "replace" : "assign"](url);
 }
}
```

`pushState` 会调用浏览器原生的 `history` 的 `pushState` 接口或者 `replaceState` 接口，更新浏览器的 `url` 地址并且把当前的 `url` 压入历史记录中，然后再 `history` 的初始化中，会设置一个监听器，监听历史栈的变化

```javascript
  setupListeners () {
    if (this.listeners.length > 0) {
      return
    }

    const router = this.router
    const expectScroll = router.options.scrollBehavior
    const supportsScroll = supportsPushState && expectScroll

    if (supportsScroll) {
      this.listeners.push(setupScroll())
    }

    const handleRoutingEvent = () => {
      const current = this.current
      if (!ensureSlash()) {
        return
      }
      this.transitionTo(getHash(), route => {
        if (supportsScroll) {
          handleScroll(this.router, route, current, true)
        }
        if (!supportsPushState) {
          replaceHash(route.fullPath)
        }
      })
    }
    const eventType = supportsPushState ? 'popstate' : 'hashchange'
    window.addEventListener(
      eventType,
      handleRoutingEvent
    )
    this.listeners.push(() => {
      window.removeEventListener(eventType, handleRoutingEvent)
    })
  }
```

当点击浏览器返回按钮时，如果已经有 `url` 被压入历史栈当中，则会触发 `popstate` 事件，然后拿到当前要跳转的 `hash`，执行 `transitionTo` 方法做路径切换。

## 组件渲染

Vue-Router 提供了内置组件 routerView，用它来完成最终的视图出口定义在`src\components\view.js`

```javascript
export default {
 name: "RouterView",
 functional: true,
 props: {
  name: {
   type: String,
   default: "default",
  },
 },
 render(_, { props, children, parent, data }) {
  // used by devtools to display a router-view badge
  data.routerView = true;

  // directly use parent context's createElement() function
  // so that components rendered by router-view can resolve named slots
  const h = parent.$createElement;
  const name = props.name;
  const route = parent.$route;
  const cache = parent._routerViewCache || (parent._routerViewCache = {});

  // determine current view depth, also check to see if the tree
  // has been toggled inactive but kept-alive.
  let depth = 0;
  let inactive = false;
  while (parent && parent._routerRoot !== parent) {
   const vnodeData = parent.$vnode ? parent.$vnode.data : {};
   if (vnodeData.routerView) {
    depth++;
   }
   if (vnodeData.keepAlive && parent._directInactive && parent._inactive) {
    inactive = true;
   }
   parent = parent.$parent;
  }
  data.routerViewDepth = depth;

  // render previous view if the tree is inactive and kept-alive
  if (inactive) {
   const cachedData = cache[name];
   const cachedComponent = cachedData && cachedData.component;
   if (cachedComponent) {
    // #2301
    // pass props
    if (cachedData.configProps) {
     fillPropsinData(
      cachedComponent,
      data,
      cachedData.route,
      cachedData.configProps
     );
    }
    return h(cachedComponent, data, children);
   } else {
    // render previous empty view
    return h();
   }
  }

  const matched = route.matched[depth];
  const component = matched && matched.components[name];

  // render empty node if no matched route or no config component
  if (!matched || !component) {
   cache[name] = null;
   return h();
  }

  // cache component
  cache[name] = { component };

  // attach instance registration hook
  // this will be called in the instance's injected lifecycle hooks
  data.registerRouteInstance = (vm, val) => {
   // val could be undefined for unregistration
   const current = matched.instances[name];
   if ((val && current !== vm) || (!val && current === vm)) {
    matched.instances[name] = val;
   }
  };

  // also register instance in prepatch hook
  // in case the same component instance is reused across different routes
  (data.hook || (data.hook = {})).prepatch = (_, vnode) => {
   matched.instances[name] = vnode.componentInstance;
  };

  // register instance in init hook
  // in case kept-alive component be actived when routes changed
  data.hook.init = (vnode) => {
   if (
    vnode.data.keepAlive &&
    vnode.componentInstance &&
    vnode.componentInstance !== matched.instances[name]
   ) {
    matched.instances[name] = vnode.componentInstance;
   }

   // if the route transition has already been confirmed then we weren't
   // able to call the cbs during confirmation as the component was not
   // registered yet, so we call it here.
   handleRouteEntered(route);
  };

  const configProps = matched.props && matched.props[name];
  // save route and configProps in cache
  if (configProps) {
   extend(cache[name], {
    route,
    configProps,
   });
   fillPropsinData(component, data, route, configProps);
  }

  return h(component, data, children);
 },
};
```

定义为一个函数组件，渲染依赖于 `render` 函数，它首先获取当前组件的路径`const route = parent.$route`;

```javascript
Object.defineProperty(Vue.prototype, "$route", {
 get() {
  return this._routerRoot._route;
 },
});

history.listen(route => {
  this.apps.forEach((app) => {
    app._route = route
  })
})

listen (cb: Function) {
  this.cb = cb
}

updateRoute (route: Route) {
  this.current = route
  this.cb && this.cb(route)
}
```

也就是 `transitionTo` 方法最后会执行 `updateRoute` 更新 `this.apps` 里面保存的组件实例的`_route` 的值，`this.apps` 数组保存的实例特点是在初始化的时期传入的 `router` 配置项，一般场景下数组只会保存根实例，因为在 `new Vue` 配置对象中传入 `router` 实例。`$route`是定义在`Vue.prototype`上，每个实例访问`$route` 属性实际上访问根实例的`_route`，也就是当前的路由线路。
另外 `routerView` 是支持嵌套的 `depth` 表示嵌套的深度，`parent._routerRoot` 表示的是根实例，这个 `while` 循环就是从当前的 `routerView` 的父实例上向上找直到找到根实例为止，在这个过程如果碰到父实例也是 `routerView` 的时候，说明存在嵌套 `depth++`，然后根据当前匹配的路径和 `depth` 找到响应的 `RouteRecord`，再去找到需要渲染的组件；之后会去定义一个 `registerRouteInstance` 方法，提供路由注册实例的方法，给 `vnode` 的 `data` 绑定上

```javascript
const registerInstance = (vm, callVal) => {
 let i = vm.$options._parentVnode;
 if (isDef(i) && isDef((i = i.data)) && isDef((i = i.registerRouteInstance))) {
  i(vm, callVal);
 }
};

Vue.mixin({
 beforeCreate() {
  // ... ...
  registerInstance();
 },
});
```

在混入的 `beforeCreate` 钩子函数中，会执行 `registerInstance` 方法，进而执行 `render` 函数中定义的 `registerRouteInstance` 给 `matched.instances[name]`赋值当前组件实例，最后根据 `component` 渲染对应的组件 `vndoe`.
当重新切换路径时会再次调用 `transitionTo` 方法，在混入时调用过`util.defineReactive`

```javascript
Vue.mixin({
 beforeCreate() {
  // ... ...
  Vue.util.defineReactive(this, "_route", this._router.history.current);
 },
});
```

这个方法会把`_route` 转换为响应式的，在每个 `routerView` 执行 `render` 函数时，都会访问 `parent.$route`,便会触发他的 `getter`，当执行完 `transitionTo` 后，修改当前的 `app._route` 的时候又会触发他的 `setter`，因为 `routeView` 的渲染 `wathcer` 就会重新渲染组件。
