## keep-alive

`<keep-alive>`是 `vue` 提供的内置组件，用来缓存组件,定义在`src\core\components\keep-alive.js`

```javascript
export default {
 name: "keep-alive",
 abstract: true,

 props: {
  include: patternTypes,
  exclude: patternTypes,
  max: [String, Number],
 },

 created() {
  this.cache = Object.create(null);
  this.keys = [];
 },

 destroyed() {
  for (const key in this.cache) {
   pruneCacheEntry(this.cache, key, this.keys);
  }
 },

 mounted() {
  this.$watch("include", (val) => {
   pruneCache(this, (name) => matches(val, name));
  });
  this.$watch("exclude", (val) => {
   pruneCache(this, (name) => !matches(val, name));
  });
 },

 render() {
  const slot = this.$slots.default;
  const vnode: VNode = getFirstComponentChild(slot);
  const componentOptions: ?VNodeComponentOptions =
   vnode && vnode.componentOptions;
  if (componentOptions) {
   // check pattern
   const name: ?string = getComponentName(componentOptions);
   const { include, exclude } = this;
   if (
    // not included
    (include && (!name || !matches(include, name))) ||
    // excluded
    (exclude && name && matches(exclude, name))
   ) {
    return vnode;
   }

   const { cache, keys } = this;
   const key: ?string =
    vnode.key == null
     ? // same constructor may get registered as different local components
       // so cid alone is not enough (#3269)
       componentOptions.Ctor.cid +
       (componentOptions.tag ? `::${componentOptions.tag}` : "")
     : vnode.key;
   if (cache[key]) {
    vnode.componentInstance = cache[key].componentInstance;
    // make current key freshest
    remove(keys, key);
    keys.push(key);
   } else {
    cache[key] = vnode;
    keys.push(key);
    // prune oldest entry
    if (this.max && keys.length > parseInt(this.max)) {
     pruneCacheEntry(cache, keys[0], keys, this._vnode);
    }
   }

   vnode.data.keepAlive = true;
  }
  return vnode || (slot && slot[0]);
 },
};
```

`<keep-alive>`的实现是一个对象，他有一个 `abstract` 属性，以表示一个抽象组件，在构建组件实例父子关系时会被忽略

```javascript
if (parent && !options.abstract) {
 while (parent.$options.abstract && parent.$parent) {
  parent = parent.$parent;
 }
 parent.$children.push(vm);
}
```

他在 `created` 钩子执行时会定义 `keys` 和 `cache` 两个属性，用来缓存已经创建过的 `vnode`，它的 props 定义了 `include` 和 `exclude`，`include` 表示只有匹配的组件会被缓存，`exclude` 表示匹配的都不采用缓存。`max` 表示缓存的大小，因为是缓存的是 `vnode` 对象，会持有 `dom`，当缓存过多时会占用内存
当执行组件渲染时，会执行到 `render` 函数

```javascript
const slot = this.$slots.default;
const vnode: VNode = getFirstComponentChild(slot);
```

由于在`<keep-alive>`既可以写 dom 也可以组件，所以先获取他的默认插槽，然后再获取它第一个子节点。他只处理第一个子元素，所以一般都是配合动态组件和路由出口组件。

```javascript
  const componentOptions: ?VNodeComponentOptions =
   vnode && vnode.componentOptions;
  if (componentOptions) {
   // check pattern
   const name: ?string = getComponentName(componentOptions);
   const { include, exclude } = this;
   if (
    // not included
    (include && (!name || !matches(include, name))) ||
    // excluded
    (exclude && name && matches(exclude, name))
   ) {
    return vnode;
   }

function matches (pattern: string | RegExp | Array<string>, name: string): boolean {
  if (Array.isArray(pattern)) {
    return pattern.indexOf(name) > -1
  } else if (typeof pattern === 'string') {
    return pattern.split(',').indexOf(name) > -1
  } else if (isRegExp(pattern)) {
    return pattern.test(name)
  }
  /* istanbul ignore next */
  return false
}
```

判断组件和 `include，exclude` 的关系，`matches` 处理接受参数是否符合条件,如果 `include` 不匹配或者 `exclude` 匹配直接返回 `vnode`，否则进入缓存

```javascript
const { cache, keys } = this;
const key: ?string =
 vnode.key == null
  ? // same constructor may get registered as different local components
    // so cid alone is not enough (#3269)
    componentOptions.Ctor.cid +
    (componentOptions.tag ? `::${componentOptions.tag}` : "")
  : vnode.key;
if (cache[key]) {
 vnode.componentInstance = cache[key].componentInstance;
 // make current key freshest
 remove(keys, key);
 keys.push(key);
} else {
 cache[key] = vnode;
 keys.push(key);
 // prune oldest entry
 if (this.max && keys.length > parseInt(this.max)) {
  pruneCacheEntry(cache, keys[0], keys, this._vnode);
 }
}
```

如果命中缓存直接在缓存中获取 `vnode` 对应的组件实例，并重新调整 `keys` 的顺序，放在最后一个，否则把 `vnode` 放进缓存，最后如果设置 `max` 并且缓存的长度超过 `this.max`，还要从缓存中删除第一个

```javascript
function pruneCacheEntry(
 cache: VNodeCache,
 key: string,
 keys: Array<string>,
 current?: VNode
) {
 const cached = cache[key];
 if (cached && (!current || cached.tag !== current.tag)) {
  cached.componentInstance.$destroy();
 }
 cache[key] = null;
 remove(keys, key);
}
```

除了要删除缓存内的 `vnode` 外，还要执行组件的`$destroy` 方法，最后设置`vnode.data.keepAlive = true`，其中会对`include，exclude`进行观测，观察变化发现规则发生变化，从缓存中解除

```javascript
mounted () {
  this.$watch('include', val => {
    pruneCache(this, name => matches(val, name))
  })
  this.$watch('exclude', val => {
    pruneCache(this, name => !matches(val, name))
  })
}

function pruneCache (keepAliveInstance: any, filter: Function) {
  const { cache, keys, _vnode } = keepAliveInstance
  for (const key in cache) {
    const cachedNode: ?VNode = cache[key]
    if (cachedNode) {
      const name: ?string = getComponentName(cachedNode.componentOptions)
      if (name && !filter(name)) {
        pruneCacheEntry(cache, key, keys, _vnode)
      }
    }
  }
}
```

**组件渲染**
组件渲染会走到 `patch` 过程，而组件的 `patch` 过程会执行 `createComponent` 方法，定义在`src\core\vdom\patch.js`

```javascript
function createComponent(vnode, insertedVnodeQueue, parentElm, refElm) {
 let i = vnode.data;
 if (isDef(i)) {
  const isReactivated = isDef(vnode.componentInstance) && i.keepAlive;
  if (isDef((i = i.hook)) && isDef((i = i.init))) {
   // 调用 init() 方法，创建和挂载组件实例
   // init() 的过程中创建好了组件的真实 DOM,挂载到了 vnode.elm 上
   i(vnode, false /* hydrating */);
  }
  // after calling the init hook, if the vnode is a child component
  // it should've created a child instance and mounted it. the child
  // component also has set the placeholder vnode's elm.
  // in that case we can just return the element and be done.
  if (isDef(vnode.componentInstance)) {
   // 调用钩子函数（VNode的钩子函数初始化属性/事件/样式等，组件的钩子函数）
   initComponent(vnode, insertedVnodeQueue);
   // 把组件对应的 DOM 插入到父元素中
   insert(parentElm, vnode.elm, refElm);
   if (isTrue(isReactivated)) {
    reactivateComponent(vnode, insertedVnodeQueue, parentElm, refElm);
   }
   return true;
  }
 }
}
```

`isReactivated` 是根据 `vnode.componentInstance` 和 `vnode.data.keepAlive` 判断的，因为 `keepalive` 的 `render` 函数会先执行，所以 `keepAlive` 为 `true`，`vnode` 会被设置为缓存，`componentInstance` 为 `undefined`，所以 `isReactivated` 变量为 `false` 会正常 `init` 方法执行 `child.$mount`，当 `patch` 结束后，执行 `initComponent` 函数,这里对 `vnode.elm` 做了保存，对于首次渲染，会被添加到缓存。

**缓存渲染**
在存在派发更新场景时会执行 `patchVnode`，会对新旧节点做对比更新，对于组件 `vnode` 而言没有 `children`，在 `patchVnode` 过程中，`diff` 执行之前会触发 `prepatch` 钩子函数 定义在`src\core\vdom\create-component.js`

```javascript
const componentVNodeHooks = {
 // ... ...
 prepatch(oldVnode: MountedComponentVNode, vnode: MountedComponentVNode) {
  const options = vnode.componentOptions;
  const child = (vnode.componentInstance = oldVnode.componentInstance);
  updateChildComponent(
   child,
   options.propsData, // updated props
   options.listeners, // updated listeners
   vnode, // new parent vnode
   options.children // new children
  );
 },
 // ... ...
};
```

核心就是执行 `updateChildComponent`，定义在`src\core\instance\lifecycle.js`

```javascript
export function updateChildComponent(
 vm: Component,
 propsData: ?Object,
 listeners: ?Object,
 parentVnode: MountedComponentVNode,
 renderChildren: ?Array<VNode>
) {
 // ... ...
 const hasDynamicScopedSlot = !!(
  (newScopedSlots && !newScopedSlots.$stable) ||
  (oldScopedSlots !== emptyObject && !oldScopedSlots.$stable) ||
  (newScopedSlots && vm.$scopedSlots.$key !== newScopedSlots.$key)
 );
 // Any static slot children from the parent may have changed during parent's
 // update. Dynamic scoped slots may also have changed. In such cases, a forced
 // update is necessary to ensure correctness.
 const needsForceUpdate = !!(
  renderChildren || // has new static slots
  vm.$options._renderChildren || // has old static slots
  hasDynamicScopedSlot
 );
 if (needsForceUpdate) {
  vm.$slots = resolveSlots(renderChildren, parentVnode.context);
  vm.$forceUpdate();
 }
 // ... ...
}
```

方法主要是更新组件实例上的属性，由于 `keepAlive` 本身支持插槽，在执行 `prepatch` 时需要对 `slots` 重新解析，并触发 `keepAlive` 的 `forceUpdate` 方法也就是重新执行 `keepAlive` 的 `render` 函数，如果第一个组件 `vnode` 命中了缓存，则直接返回缓存中的 `componentInstance`，接着继续执行 `createComponent` 此时 `isReactivated` 为 `true`,在执行 init 方法时不会在执行组件的`$mount` 方法，所以在有缓存的情况下不会执行 `created，mounted` 钩子了，最后去执行 `reactivateComponent`

```javascript
function reactivateComponent(vnode, insertedVnodeQueue, parentElm, refElm) {
 let i;
 // hack for #4339: a reactivated component with inner transition
 // does not trigger because the inner node's created hooks are not called
 // again. It's not ideal to involve module-specific logic in here but
 // there doesn't seem to be a better way to do it.
 let innerNode = vnode;
 while (innerNode.componentInstance) {
  innerNode = innerNode.componentInstance._vnode;
  if (isDef((i = innerNode.data)) && isDef((i = i.transition))) {
   for (i = 0; i < cbs.activate.length; ++i) {
    cbs.activate[i](emptyNode, innerNode);
   }
   insertedVnodeQueue.push(innerNode);
   break;
  }
 }
 // unlike a newly created component,
 // a reactivated keep-alive component doesn't insert itself
 insert(parentElm, vnode.elm, refElm);
}
```

通过执行 `insert` 函数把缓存的 `dom` 对象插入到目标元素中，完成数据更新下的渲染过程。

**生命周期**
Vue 提供在 `keepAlive` 包裹的组件渲染时去执行的钩子 `activated` 在渲染的最后一步，会执行

```javascript
const componentVNodeHooks = {
 insert(vnode: MountedComponentVNode) {
  const { context, componentInstance } = vnode;
  if (!componentInstance._isMounted) {
   componentInstance._isMounted = true;
   callHook(componentInstance, "mounted");
  }
  if (vnode.data.keepAlive) {
   if (context._isMounted) {
    // vue-router#1212
    // During updates, a kept-alive component's child components may
    // change, so directly walking the tree here may call activated hooks
    // on incorrect children. Instead we push them into a queue which will
    // be processed after the whole patch process ended.
    queueActivatedComponent(componentInstance);
   } else {
    activateChildComponent(componentInstance, true /* direct */);
   }
  }
 },
};
```

这里判断如果组件已经 `mounted` 过了，就执行 `queueActivatedComponent` 反之执行 `activateChildComponent` 分别定义在`src\core\instance\lifecycle.js`

```javascript
export function activateChildComponent(vm: Component, direct?: boolean) {
 if (direct) {
  vm._directInactive = false;
  if (isInInactiveTree(vm)) {
   return;
  }
 } else if (vm._directInactive) {
  return;
 }
 if (vm._inactive || vm._inactive === null) {
  vm._inactive = false;
  for (let i = 0; i < vm.$children.length; i++) {
   activateChildComponent(vm.$children[i]);
  }
  callHook(vm, "activated");
 }
}
```

递归执行所有子组件的 `activated` 钩子，`queueActivatedComponen`t 定义在`src\core\observer\scheduler.js`

```javascript
export function queueActivatedComponent(vm: Component) {
 // setting _inactive to false here so that a render function can
 // rely on checking whether it's in an inactive tree (e.g. router-view)
 vm._inactive = false;
 activatedChildren.push(vm);
}
```

把当前的 `vm` 实例添加到 `activatedChildren` 中，在 `nextTick` 后执行 `flushSchedulerQueue`

```javascript
function flushSchedulerQueue() {
 // ... ...
 // keep copies of post queues before resetting state
 const activatedQueue = activatedChildren.slice();
 const updatedQueue = queue.slice();

 resetSchedulerState();

 // call component updated and activated hooks
 callActivatedHooks(activatedQueue);
 callUpdatedHooks(updatedQueue);

 // ... ...
}

function callActivatedHooks(queue) {
 for (let i = 0; i < queue.length; i++) {
  queue[i]._inactive = true;
  activateChildComponent(queue[i], true /* true */);
 }
}
```

也就是遍历所有的 `activatedChildren` 执行 `activateChildComponent` 方法，通过队列方式将整个 `activated` `调用时机延后，deactivated` 发生在 `vnode` 中的 `destory` 钩子函数，定义在`src\core\vdom\create-component.js`

```javascript
const componentVNodeHooks = {
 destroy(vnode: MountedComponentVNode) {
  const { componentInstance } = vnode;
  if (!componentInstance._isDestroyed) {
   if (!vnode.data.keepAlive) {
    componentInstance.$destroy();
   } else {
    deactivateChildComponent(componentInstance, true /* direct */);
   }
  }
 },
};
```

对于 keepAlive 包裹的组件而言，会执行`deactivateChildComponent`定义在`src\core\instance\lifecycle.js`

```javascript
export function deactivateChildComponent(vm: Component, direct?: boolean) {
 if (direct) {
  vm._directInactive = true;
  if (isInInactiveTree(vm)) {
   return;
  }
 }
 if (!vm._inactive) {
  vm._inactive = true;
  for (let i = 0; i < vm.$children.length; i++) {
   deactivateChildComponent(vm.$children[i]);
  }
  callHook(vm, "deactivated");
 }
}
```
递归执行子组件的deactivated钩子