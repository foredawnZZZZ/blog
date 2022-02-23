## 响应式对象

传递需求监听事件，修改数据，手动修改 DOM 重新渲染；
修改哪部分 DOM，修改的性能是否是最优，对数据的修改是否每次都去修改 dom,是否重复去写修改 dom 的逻辑
Vue 的响应式系统是基于`Object.defineProperty`的（ie8 以下不兼容）他会在一个对象上新增一个属性或者对一个已经存在的属性进行修改，对属性添加 getter 和 setter 当访问时触发 getter，当设置修改时会触发 setter，在 vue 的初始化过程中，会在`init`方法中执行`ininState`方法，该方法会对`props，methods，data,computed`等属性进行初始化操作

```javascript
function initProps(vm: Component, propsOptions: Object) {
 const propsData = vm.$options.propsData || {};
 const props = (vm._props = {});
 // cache prop keys so that future props updates can iterate using Array
 // instead of dynamic object key enumeration.
 const keys = (vm.$options._propKeys = []);
 const isRoot = !vm.$parent;
 // root instance props should be converted
 if (!isRoot) {
  toggleObserving(false);
 }
 for (const key in propsOptions) {
  keys.push(key);
  const value = validateProp(key, propsOptions, propsData, vm);
  /* istanbul ignore else */
  if (process.env.NODE_ENV !== "production") {
   const hyphenatedKey = hyphenate(key);
   if (
    isReservedAttribute(hyphenatedKey) ||
    config.isReservedAttr(hyphenatedKey)
   ) {
    warn(
     `"${hyphenatedKey}" is a reserved attribute and cannot be used as component prop.`,
     vm
    );
   }
   defineReactive(props, key, value, () => {
    if (!isRoot && !isUpdatingChildComponent) {
     warn(
      `Avoid mutating a prop directly since the value will be ` +
       `overwritten whenever the parent component re-renders. ` +
       `Instead, use a data or computed property based on the prop's ` +
       `value. Prop being mutated: "${key}"`,
      vm
     );
    }
   });
  } else {
   defineReactive(props, key, value);
  }
  // static props are already proxied on the component's prototype
  // during Vue.extend(). We only need to proxy props defined at
  // instantiation here.
  if (!(key in vm)) {
   proxy(vm, `_props`, key);
  }
 }
 toggleObserving(true);
}
function initData(vm: Component) {
 let data = vm.$options.data;
 data = vm._data = typeof data === "function" ? getData(data, vm) : data || {};
 if (!isPlainObject(data)) {
  data = {};
  process.env.NODE_ENV !== "production" &&
   warn(
    "data functions should return an object:\n" +
     "https://vuejs.org/v2/guide/components.html#data-Must-Be-a-Function",
    vm
   );
 }
 // proxy data on instance
 const keys = Object.keys(data);
 const props = vm.$options.props;
 const methods = vm.$options.methods;
 let i = keys.length;
 while (i--) {
  const key = keys[i];
  if (process.env.NODE_ENV !== "production") {
   if (methods && hasOwn(methods, key)) {
    warn(`Method "${key}" has already been defined as a data property.`, vm);
   }
  }
  if (props && hasOwn(props, key)) {
   process.env.NODE_ENV !== "production" &&
    warn(
     `The data property "${key}" is already declared as a prop. ` +
      `Use prop default value instead.`,
     vm
    );
  } else if (!isReserved(key)) {
   proxy(vm, `_data`, key);
  }
 }
 // observe data
 observe(data, true /* asRootData */);
}
```

其中，`initProps`主要过程是`defineReactive`转换为响应式数据，然后通过`proxy`代理到实例上，`initData`的主要过程是对于 data 选项的类型进行判断，然后遍历通过`proxy`代理，调用`observe`转换为响应式数据

```javaScript
export function proxy (target: Object, sourceKey: string, key: string) {
  sharedPropertyDefinition.get = function proxyGetter () {
    return this[sourceKey][key]
  }
  sharedPropertyDefinition.set = function proxySetter (val) {
    this[sourceKey][key] = val
  }
  Object.defineProperty(target, key, sharedPropertyDefinition)
}
```

`proxy`方法内部通过`Object.defineProperty`把`this[sourceKey][key]`的读写变成`target[key]`的读写所以`vm.xxx`等同于`vm._data.xxx,observe`方法定义在 src\core\observer\index.js

```javascript
export function observe(value: any, asRootData: ?boolean): Observer | void {
 if (!isObject(value) || value instanceof VNode) {
  return;
 }
 let ob: Observer | void;
 if (hasOwn(value, "__ob__") && value.__ob__ instanceof Observer) {
  ob = value.__ob__;
 } else if (
  shouldObserve &&
  !isServerRendering() &&
  (Array.isArray(value) || isPlainObject(value)) &&
  Object.isExtensible(value) &&
  !value._isVue
 ) {
  ob = new Observer(value);
 }
 if (asRootData && ob) {
  ob.vmCount++;
 }
 return ob;
}
```

他的主要作用是给一个非 vNode 类型的对象数据类型添加一个`Observer`，这个 OB 负责给对象属性添加一个`getter`和`setter`用于收集依赖与派发更新

```javascript
export class Observer {
 value: any;
 dep: Dep;
 vmCount: number; // number of vms that have this object as root $data

 constructor(value: any) {
  this.value = value;
  this.dep = new Dep();
  this.vmCount = 0;
  def(value, "__ob__", this);
  if (Array.isArray(value)) {
   if (hasProto) {
    protoAugment(value, arrayMethods);
   } else {
    copyAugment(value, arrayMethods, arrayKeys);
   }
   this.observeArray(value);
  } else {
   this.walk(value);
  }
 }

 /**
  * Walk through all properties and convert them into
  * getter/setters. This method should only be called when
  * value type is Object.
  */
 walk(obj: Object) {
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
   defineReactive(obj, keys[i]);
  }
 }

 /**
  * Observe a list of Array items.
  */
 observeArray(items: Array<any>) {
  for (let i = 0, l = items.length; i < l; i++) {
   observe(items[i]);
  }
 }
}
```

`Observer`的构造函数中首先实例化一个 dep 对象，然后通过`def`函数把对象中添加一个`__ob__`属性所有的响应式对象上都会带有一个属性，接着他会对`value`的数据类型做判断如果是纯对象直接走`walk`方法是数组就走`observeArray`方法

```javascript
export function defineReactive(
 obj: Object,
 key: string,
 val: any,
 customSetter?: ?Function,
 shallow?: boolean
) {
 const dep = new Dep();

 const property = Object.getOwnPropertyDescriptor(obj, key);
 if (property && property.configurable === false) {
  return;
 }

 // cater for pre-defined getter/setters
 const getter = property && property.get;
 const setter = property && property.set;
 if ((!getter || setter) && arguments.length === 2) {
  val = obj[key];
 }

 let childOb = !shallow && observe(val);
 Object.defineProperty(obj, key, {
  enumerable: true,
  configurable: true,
  get: function reactiveGetter() {
   const value = getter ? getter.call(obj) : val;
   if (Dep.target) {
    dep.depend();
    if (childOb) {
     childOb.dep.depend();
     if (Array.isArray(value)) {
      dependArray(value);
     }
    }
   }
   return value;
  },
  set: function reactiveSetter(newVal) {
   const value = getter ? getter.call(obj) : val;
   /* eslint-disable no-self-compare */
   if (newVal === value || (newVal !== newVal && value !== value)) {
    return;
   }
   /* eslint-enable no-self-compare */
   if (process.env.NODE_ENV !== "production" && customSetter) {
    customSetter();
   }
   // #7981: for accessor properties without setter
   if (getter && !setter) return;
   if (setter) {
    setter.call(obj, newVal);
   } else {
    val = newVal;
   }
   childOb = !shallow && observe(newVal);
   dep.notify();
  },
 });
}
```

`defineReactive`就是定义响应式对象，给对象添加`getter`和`setter`，在最开始会创建一个 dep 对象的实例，然后对子对象递归调用`observe`方法确保所有的数据内部结构多么复杂所有的数据只要有读写操作都会有对应的`getter`和`setter`，而且`getter`做的事情就是收集依赖`setter`做的是派发更新

## 收集依赖

`getter`函数做了两个事，一个是实例化一个`Dep`实例，另一个是在`get`函数中通过`dep.depend`收集依赖，`Dep`是整个`getter`的核心，它定义在 src\core\observer\dep.js

```javascript
export default class Dep {
 static target: ?Watcher;
 id: number;
 subs: Array<Watcher>;

 constructor() {
  this.id = uid++;
  this.subs = [];
 }

 addSub(sub: Watcher) {
  this.subs.push(sub);
 }

 removeSub(sub: Watcher) {
  remove(this.subs, sub);
 }

 depend() {
  if (Dep.target) {
   Dep.target.addDep(this);
  }
 }

 notify() {
  // stabilize the subscriber list first
  const subs = this.subs.slice();
  if (process.env.NODE_ENV !== "production" && !config.async) {
   // subs aren't sorted in scheduler if not running async
   // we need to sort them now to make sure they fire in correct
   // order
   subs.sort((a, b) => a.id - b.id);
  }
  for (let i = 0, l = subs.length; i < l; i++) {
   subs[i].update();
  }
 }
}
Dep.target = null;
const targetStack = [];

export function pushTarget(target: ?Watcher) {
 targetStack.push(target);
 Dep.target = target;
}

export function popTarget() {
 targetStack.pop();
 Dep.target = targetStack[targetStack.length - 1];
}
```

`Dep`是一个`Class`，它定义了一些方法和属性，其中是静态属性`target`是全局的`watcher`，而且在同一时间只能有一个`watcher`被计算，`Dep`实际就是对`watcher`的一种管理，`Dep`脱离于`wathcer`毫无意义 `watcher`定义在 src\core\observer\watcher.js

```javascript
export default class Watcher {
 vm: Component;
 expression: string;
 cb: Function;
 id: number;
 deep: boolean;
 user: boolean;
 lazy: boolean;
 sync: boolean;
 dirty: boolean;
 active: boolean;
 deps: Array<Dep>;
 newDeps: Array<Dep>;
 depIds: SimpleSet;
 newDepIds: SimpleSet;
 before: ?Function;
 getter: Function;
 value: any;

 constructor(
  vm: Component,
  expOrFn: string | Function,
  cb: Function,
  options?: ?Object,
  isRenderWatcher?: boolean
 ) {
  this.vm = vm;
  if (isRenderWatcher) {
   vm._watcher = this;
  }
  vm._watchers.push(this);
  // options
  if (options) {
   this.deep = !!options.deep;
   this.user = !!options.user;
   this.lazy = !!options.lazy;
   this.sync = !!options.sync;
   this.before = options.before;
  } else {
   this.deep = this.user = this.lazy = this.sync = false;
  }
  this.cb = cb;
  this.id = ++uid; // uid for batching
  this.active = true;
  this.dirty = this.lazy; // for lazy watchers
  this.deps = [];
  this.newDeps = [];
  this.depIds = new Set();
  this.newDepIds = new Set();
  this.expression =
   process.env.NODE_ENV !== "production" ? expOrFn.toString() : "";
  // parse expression for getter
  if (typeof expOrFn === "function") {
   this.getter = expOrFn;
  } else {
   this.getter = parsePath(expOrFn);
   if (!this.getter) {
    this.getter = noop;
    process.env.NODE_ENV !== "production" &&
     warn(
      `Failed watching path: "${expOrFn}" ` +
       "Watcher only accepts simple dot-delimited paths. " +
       "For full control, use a function instead.",
      vm
     );
   }
  }
  this.value = this.lazy ? undefined : this.get();
 }

 /**
  * Evaluate the getter, and re-collect dependencies.
  */
 get() {
  pushTarget(this);
  let value;
  const vm = this.vm;
  try {
   value = this.getter.call(vm, vm);
  } catch (e) {
   if (this.user) {
    handleError(e, vm, `getter for watcher "${this.expression}"`);
   } else {
    throw e;
   }
  } finally {
   // "touch" every property so they are all tracked as
   // dependencies for deep watching
   if (this.deep) {
    traverse(value);
   }
   popTarget();
   this.cleanupDeps();
  }
  return value;
 }

 /**
  * Add a dependency to this directive.
  */
 addDep(dep: Dep) {
  const id = dep.id;
  if (!this.newDepIds.has(id)) {
   this.newDepIds.add(id);
   this.newDeps.push(dep);
   if (!this.depIds.has(id)) {
    dep.addSub(this);
   }
  }
 }

 /**
  * Clean up for dependency collection.
  */
 cleanupDeps() {
  let i = this.deps.length;
  while (i--) {
   const dep = this.deps[i];
   if (!this.newDepIds.has(dep.id)) {
    dep.removeSub(this);
   }
  }
  let tmp = this.depIds;
  this.depIds = this.newDepIds;
  this.newDepIds = tmp;
  this.newDepIds.clear();
  tmp = this.deps;
  this.deps = this.newDeps;
  this.newDeps = tmp;
  this.newDeps.length = 0;
 }

 /**
  * Subscriber interface.
  * Will be called when a dependency changes.
  */
 update() {
  /* istanbul ignore else */
  if (this.lazy) {
   this.dirty = true;
  } else if (this.sync) {
   this.run();
  } else {
   queueWatcher(this);
  }
 }

 /**
  * Scheduler job interface.
  * Will be called by the scheduler.
  */
 run() {
  if (this.active) {
   const value = this.get();
   if (
    value !== this.value ||
    // Deep watchers and watchers on Object/Arrays should fire even
    // when the value is the same, because the value may
    // have mutated.
    isObject(value) ||
    this.deep
   ) {
    // set new value
    const oldValue = this.value;
    this.value = value;
    if (this.user) {
     const info = `callback for watcher "${this.expression}"`;
     invokeWithErrorHandling(
      this.cb,
      this.vm,
      [value, oldValue],
      this.vm,
      info
     );
    } else {
     this.cb.call(this.vm, value, oldValue);
    }
   }
  }
 }

 /**
  * Evaluate the value of the watcher.
  * This only gets called for lazy watchers.
  */
 evaluate() {
  this.value = this.get();
  this.dirty = false;
 }

 /**
  * Depend on all deps collected by this watcher.
  */
 depend() {
  let i = this.deps.length;
  while (i--) {
   this.deps[i].depend();
  }
 }

 /**
  * Remove self from all dependencies' subscriber list.
  */
 teardown() {
  if (this.active) {
   // remove self from vm's watcher list
   // this is a somewhat expensive operation so we skip it
   // if the vm is being destroyed.
   if (!this.vm._isBeingDestroyed) {
    remove(this.vm._watchers, this);
   }
   let i = this.deps.length;
   while (i--) {
    this.deps[i].removeSub(this);
   }
   this.active = false;
  }
 }
}
```

`watcher`也是一个`Class`在他的构造函数中定义了一些`Dep`属性，这些属性表示当前`watcher`实例持有的`dep`实例的集合，`getter`的触发时机比较关键
在`mount`的过程中通过`mountComponent`函数首次实例化了`watcher`

```javascript
let updateComponent;
/* istanbul ignore if */
if (process.env.NODE_ENV !== "production" && config.performance && mark) {
 // ... ...
} else {
 updateComponent = () => {
  vm._update(vm._render(), hydrating);
 };
}

// we set this to vm._watcher inside the watcher's constructor
// since the watcher's initial patch may call $forceUpdate (e.g. inside child
// component's mounted hook), which relies on vm._watcher being already defined
new Watcher(
 vm,
 updateComponent,
 noop,
 {
  before() {
   if (vm._isMounted && !vm._isDestroyed) {
    callHook(vm, "beforeUpdate");
   }
  },
 },
 true /* isRenderWatcher */
);
```

```javascript
 get () {
   pushTarget(this)
   // ... ...
   value = this.getter.call(vm, vm)
}
function pushTarget (target: ?Watcher) {
   targetStack.push(target)
   Dep.target = target
}
```

执行了`watcher`的构造函数时会执行他的`get`方法，进入`get`函数首先就会执行`pushTarget`函数，这个函数在`dep`中定义把`Dep.target`赋值为当前的`watcher`并压入栈中随后执行了`getter`(这个`getter`就是传入的`updateCompoent`方法) 随意对应的执行了`_update`，它会先执行`_render`方法生成`vNode`并且在这个时候读取`vm`的数据触发了`defineReactive`中的`getter`，由于每个属性的`getter`都存储了`dep`，在触发`getter`的时候会调用`dep.depend()`也就执行了`Dep.target.addDep(this)`

```javascript
  addDep (dep: Dep) {
    const id = dep.id
    if (!this.newDepIds.has(id)) {
      this.newDepIds.add(id)
      this.newDeps.push(dep)
      if (!this.depIds.has(id)) {
        dep.addSub(this)
      }
    }
  }

   addSub (sub: Watcher) {
    this.subs.push(sub)
  }
```

这个方法执行时会确保同一数据不会被多次添加然后执行`dep.addSub(this)`，把当前`watcher`订阅到持有该数据的`dep`的`subs`中，目的是为了后续的数据变化时能够通知哪些`subs`准备，所以`_render`函数执行完，就会触发数据的`getter`，完成依赖收集

```javascript
 get () {
   pushTarget(this)
   // ... ...
   if (this.deep) {
     traverse(value)
   }
   popTarget()
   this.cleanupDeps()
 }

function popTarget () {
  targetStack.pop()
  Dep.target = targetStack[targetStack.length - 1]
}
cleanupDeps () {
  let i = this.deps.length
  while (i--) {
    const dep = this.deps[i]
    if (!this.newDepIds.has(dep.id)) {
      dep.removeSub(this)
    }
  }
  let tmp = this.depIds
  this.depIds = this.newDepIds
  this.newDepIds = tmp
  this.newDepIds.clear()
  tmp = this.deps
  this.deps = this.newDeps
  this.newDeps = tmp
  this.newDeps.length = 0
}
```

收集完毕后，这三个步骤的执行很重要`popTarget`把`Dep.target`恢复成上一个状态，因为当前的`vm`数据依赖已经收集完成，对应的`Dep.target`也需要改变，最后执行`cleanupDeps`，因为`vue`是数据驱动视图，只要数据发生变化就会触发 render 而`_render`方法的每次触发都会去读取数据的`getter`，所以在`watcher`构造函数里面定义的两组 dep 实例数组就存储了上一次的 dep 和新的 dep 数组，在执行`cleanupDeps`函数的时候，他会遍历`deps`移除`deps`中`subs`存储的`watcher`订阅，然后把两组`deps`实例集合交换，并把新的集合清空。
例子：
........

## 派发更新

收集依赖的目的就是为了派发更新，`setter`函数做了两个比较主要的事，一个是`childOb`的赋值，考虑到新赋值的会是一个引用类型，那么就继续调用`observe`设置为响应式对象，另一个是`dep.notify()`,通知所有的订阅者

```javascript
export default class Dep {
 // ... ...
 notify() {
  // stabilize the subscriber list first
  const subs = this.subs.slice();
  if (process.env.NODE_ENV !== "production" && !config.async) {
   // subs aren't sorted in scheduler if not running async
   // we need to sort them now to make sure they fire in correct
   // order
   subs.sort((a, b) => a.id - b.id);
  }
  for (let i = 0, l = subs.length; i < l; i++) {
   subs[i].update();
  }
 }
}
```

这个方法遍历自身的`subs`属性，取出所有的`watcher`数组然后调用他们的`update`方法

```javascript
update () {
    /* istanbul ignore else */
    if (this.lazy) {
      this.dirty = true
    } else if (this.sync) {
      this.run()
    } else {
      queueWatcher(this)
    }
}
```

在一般的组件数据更新下，会走到最后`queueWatcher`方法，这个方法定义在 src\core\observer\scheduler.js

```javascript
export function queueWatcher(watcher: Watcher) {
 const id = watcher.id;
 if (has[id] == null) {
  has[id] = true;
  if (!flushing) {
   queue.push(watcher);
  } else {
   // if already flushing, splice the watcher based on its id
   // if already past its id, it will be run next immediately.
   let i = queue.length - 1;
   while (i > index && queue[i].id > watcher.id) {
    i--;
   }
   queue.splice(i + 1, 0, watcher);
  }
  // queue the flush
  if (!waiting) {
   waiting = true;

   if (process.env.NODE_ENV !== "production" && !config.async) {
    flushSchedulerQueue();
    return;
   }
   nextTick(flushSchedulerQueue);
  }
 }
}
```

这里引入一个队列的概念，这是他派发更新时的优化，不会在每次触发变更时都会触发`watcher`的回调，而是把他的回调存放在一个队列里，在`nextTick`下一个`tick`时执行`flushSchedulerQueue`，这里面首先对 has 进行判断确保同一个 wathcer 只进入一次队列

```javascript
function flushSchedulerQueue() {
 currentFlushTimestamp = getNow();
 flushing = true;
 let watcher, id;

 // Sort queue before flush.
 // This ensures that:
 // 1. Components are updated from parent to child. (because parent is always
 //    created before the child)
 // 2. A component's user watchers are run before its render watcher (because
 //    user watchers are created before the render watcher)
 // 3. If a component is destroyed during a parent component's watcher run,
 //    its watchers can be skipped.
 queue.sort((a, b) => a.id - b.id);

 // do not cache length because more watchers might be pushed
 // as we run existing watchers
 for (index = 0; index < queue.length; index++) {
  watcher = queue[index];
  if (watcher.before) {
   watcher.before();
  }
  id = watcher.id;
  has[id] = null;
  watcher.run();
  // in dev build, check and stop circular updates.
  if (process.env.NODE_ENV !== "production" && has[id] != null) {
   circular[id] = (circular[id] || 0) + 1;
   if (circular[id] > MAX_UPDATE_COUNT) {
    warn(
     "You may have an infinite update loop " +
      (watcher.user
       ? `in watcher with expression "${watcher.expression}"`
       : `in a component render function.`),
     watcher.vm
    );
    break;
   }
  }
 }

 // keep copies of post queues before resetting state
 const activatedQueue = activatedChildren.slice();
 const updatedQueue = queue.slice();

 resetSchedulerState();

 // call component updated and activated hooks
 callActivatedHooks(activatedQueue);
 callUpdatedHooks(updatedQueue);

 // devtool hook
 /* istanbul ignore if */
 if (devtools && config.devtools) {
  devtools.emit("flush");
 }
}
```

这个方法执行步骤如下：

- 队列排序：
  `queue.sort((a, b) => a.id - b.id)`对整个队列进行了从小到大的排序，来确保组件的更新应该是由父到子（父组件先于子组件创建，所以`watcher`的创建顺序也是先父在子，执行顺序也应该保持一致）;用户定义的`watcher`应该优先于`watcher`，（用户`watcher`是在渲染`watcher`之前创建的）;如果一个父组件的`watcher`执行期间销毁，那么他对应的`watcher`都可以被跳过，所以父组件的`watcher`先执行
- 队列遍历
  依次执行`watcher.run()`，在遍历时每次会对`length`进行求值，（考虑在执行`watcher.run`时用户会再次添加新的`watcher`，这样会再次执行到`queueWatcher`）

```javascript
  run () {
    if (this.active) {
      const value = this.get()
      if (
        value !== this.value ||
        // Deep watchers and watchers on Object/Arrays should fire even
        // when the value is the same, because the value may
        // have mutated.
        isObject(value) ||
        this.deep
      ) {
        // set new value
        const oldValue = this.value
        this.value = value
        if (this.user) {
          const info = `callback for watcher "${this.expression}"`
          invokeWithErrorHandling(this.cb, this.vm, [value, oldValue], this.vm, info)
        } else {
          this.cb.call(this.vm, value, oldValue)
        }
      }
    }
  }
```

`run`函数执行，会执行`this.get()`再次触发他自己的`getter`方法就是`updateComponent`

- 状态恢复
  这个过程就是执行`resetSchedulerState`,将一些流程控制的变量赋为初始值，把队列清空

```javascript
function resetSchedulerState() {
 index = queue.length = activatedChildren.length = 0;
 has = {};
 if (process.env.NODE_ENV !== "production") {
  circular = {};
 }
 waiting = flushing = false;
}
```

所以派发更新就是当我们修改组件数据时，会触发组件渲染，就是再次调用了`updateComponent`进而让虚拟`dom`在次`patch`的过程

## nextTick

`nextTick`是`vue`派发更新通知渲染的一个核心，（js 执行机制）因为 js 的执行顺序是同步执行，主线程的执行就是一个`tick`，读取下一次`tick`就是根据事件循环去任务队列调度，在同步执行异步代码获取执行结果
。。。 。。。

```javascript
/* @flow */
/* globals MutationObserver */

import { noop } from "shared/util";
import { handleError } from "./error";
import { isIE, isIOS, isNative } from "./env";

export let isUsingMicroTask = false;

const callbacks = [];
let pending = false;

function flushCallbacks() {
 pending = false;
 const copies = callbacks.slice(0);
 callbacks.length = 0;
 for (let i = 0; i < copies.length; i++) {
  copies[i]();
 }
}

// Here we have async deferring wrappers using microtasks.
// In 2.5 we used (macro) tasks (in combination with microtasks).
// However, it has subtle problems when state is changed right before repaint
// (e.g. #6813, out-in transitions).
// Also, using (macro) tasks in event handler would cause some weird behaviors
// that cannot be circumvented (e.g. #7109, #7153, #7546, #7834, #8109).
// So we now use microtasks everywhere, again.
// A major drawback of this tradeoff is that there are some scenarios
// where microtasks have too high a priority and fire in between supposedly
// sequential events (e.g. #4521, #6690, which have workarounds)
// or even between bubbling of the same event (#6566).
let timerFunc;

// The nextTick behavior leverages the microtask queue, which can be accessed
// via either native Promise.then or MutationObserver.
// MutationObserver has wider support, however it is seriously bugged in
// UIWebView in iOS >= 9.3.3 when triggered in touch event handlers. It
// completely stops working after triggering a few times... so, if native
// Promise is available, we will use it:
/* istanbul ignore next, $flow-disable-line */
if (typeof Promise !== "undefined" && isNative(Promise)) {
 const p = Promise.resolve();
 timerFunc = () => {
  p.then(flushCallbacks);
  // In problematic UIWebViews, Promise.then doesn't completely break, but
  // it can get stuck in a weird state where callbacks are pushed into the
  // microtask queue but the queue isn't being flushed, until the browser
  // needs to do some other work, e.g. handle a timer. Therefore we can
  // "force" the microtask queue to be flushed by adding an empty timer.
  if (isIOS) setTimeout(noop);
 };
 isUsingMicroTask = true;
} else if (
 !isIE &&
 typeof MutationObserver !== "undefined" &&
 (isNative(MutationObserver) ||
  // PhantomJS and iOS 7.x
  MutationObserver.toString() === "[object MutationObserverConstructor]")
) {
 // Use MutationObserver where native Promise is not available,
 // e.g. PhantomJS, iOS7, Android 4.4
 // (#6466 MutationObserver is unreliable in IE11)
 let counter = 1;
 const observer = new MutationObserver(flushCallbacks);
 const textNode = document.createTextNode(String(counter));
 observer.observe(textNode, {
  characterData: true,
 });
 timerFunc = () => {
  counter = (counter + 1) % 2;
  textNode.data = String(counter);
 };
 isUsingMicroTask = true;
} else if (typeof setImmediate !== "undefined" && isNative(setImmediate)) {
 // Fallback to setImmediate.
 // Technically it leverages the (macro) task queue,
 // but it is still a better choice than setTimeout.
 timerFunc = () => {
  setImmediate(flushCallbacks);
 };
} else {
 // Fallback to setTimeout.
 timerFunc = () => {
  setTimeout(flushCallbacks, 0);
 };
}

export function nextTick(cb?: Function, ctx?: Object) {
 let _resolve;
 callbacks.push(() => {
  if (cb) {
   try {
    cb.call(ctx);
   } catch (e) {
    handleError(e, ctx, "nextTick");
   }
  } else if (_resolve) {
   _resolve(ctx);
  }
 });
 if (!pending) {
  pending = true;
  timerFunc();
 }
 // $flow-disable-line
 if (!cb && typeof Promise !== "undefined") {
  return new Promise((resolve) => {
   _resolve = resolve;
  });
 }
}
```

这里面优先选择微任务执行，如果有兼容问题选择宏任务，（考虑到微任务与事件渲染当中的渲染时机所以优先选择微任务）使用`callbacks`并且进行遍历的原因是确保不会开启多个异步任务，把这些异步任务都压成一个同步任务在下一次`tick`当中全部执行完毕。Vue 提供了 2 种使用`nextTick`的方式全局的`Vue.nextTick`，`this.$nextTick`都是调用这个`nextTick`函数

## 无法检测变化

由于 js 的限制（`defineProperty`的缺陷）对象新增属性和删除属性（`.`语法`delete`删除）以及数组的修改（索引`length`长度的修改，变更方法 pushpop 等）无法被劫持，所以`vue`提供了`set`方法，在定义在`src\core\observer\index.js`

```javascript
export function set(target: Array<any> | Object, key: any, val: any): any {
 if (
  process.env.NODE_ENV !== "production" &&
  (isUndef(target) || isPrimitive(target))
 ) {
  warn(
   `Cannot set reactive property on undefined, null, or primitive value: ${(target: any)}`
  );
 }
 if (Array.isArray(target) && isValidArrayIndex(key)) {
  target.length = Math.max(target.length, key);
  target.splice(key, 1, val);
  return val;
 }
 if (key in target && !(key in Object.prototype)) {
  target[key] = val;
  return val;
 }
 const ob = (target: any).__ob__;
 if (target._isVue || (ob && ob.vmCount)) {
  process.env.NODE_ENV !== "production" &&
   warn(
    "Avoid adding reactive properties to a Vue instance or its root $data " +
     "at runtime - declare it upfront in the data option."
   );
  return val;
 }
 if (!ob) {
  target[key] = val;
  return val;
 }
 defineReactive(ob.value, key, val);
 ob.dep.notify();
 return val;
}
```

`set`方法会对目标进行类型上的判断，如果是数组并且`key`是一个合法的下标，就通过`splice`方法添加进数组，然后判断`key`是否存在于目标对象当孩当中，存在直接赋值返回并且可以直接观测了，接着获取目标对象的`__ob__`这个`ob`就是初始化时期实例化的`observer`，如果他不存在说明他不是一个响应式对象，直接赋值然后返回，最后调用`defineReactive`他新添加的属性变成响应式对象，然后通过`ob.dep.notify()`手动通知更新

```javascript
export function defineReactive(
 obj: Object,
 key: string,
 val: any,
 customSetter?: ?Function,
 shallow?: boolean
) {
 let childOb = !shallow && observe(val);
 Object.defineProperty(obj, key, {
  enumerable: true,
  configurable: true,
  get: function reactiveGetter() {
   const value = getter ? getter.call(obj) : val;
   if (Dep.target) {
    dep.depend();
    if (childOb) {
     childOb.dep.depend();
     if (Array.isArray(value)) {
      dependArray(value);
     }
    }
   }
   return value;
  },
 });
}
```

因为在`getter`的时候判断了`childOb`，并调用了`childOb.dep.depend()`收集了依赖，所以`set`方法调用时能够手动更新通知到对应的`watcher`检测新增属性的更新，如果是数组就通过`dependArray`把数组的每个元素也去做依赖收集

```javascript
export class Observer {
 constructor(value: any) {
  if (Array.isArray(value)) {
   const augment = hasProto ? protoAugment : copyAugment;
   augment(value, arrayMethods, arrayKeys);
   this.observeArray(value);
  } else {
   // ...
  }
 }
}

function protoAugment(target, src: Object) {
 /* eslint-disable no-proto */
 target.__proto__ = src;
 /* eslint-enable no-proto */
}

/**
 * Augment a target Object or Array by defining
 * hidden properties.
 */
/* istanbul ignore next */
function copyAugment(target: Object, src: Object, keys: Array<string>) {
 for (let i = 0, l = keys.length; i < l; i++) {
  const key = keys[i];
  def(target, key, src[key]);
 }
}
```

数组情况，可以直接使用 set 或者使用 7 个变异方法，所以 vue 重写了数组原型，在`observer`的构造函数中就对数据类型进行了判断，在数组条件下`hasProto`判断了对象中是否存在`__proto__`这个属性，存在指向`protoAugment`不存在指向`copyAugment`，
`protoAugment`是直接把原型修改成`src`，`copyAugment`会遍历`keys`通过`def（Object.defineProperty）`定义他的属性把原型指向了`arrayMethods`

```javascript
/*
 * not type checking this file because flow doesn't play well with
 * dynamically accessing methods on Array prototype
 */

import { def } from "../util/index";

const arrayProto = Array.prototype;
export const arrayMethods = Object.create(arrayProto);

const methodsToPatch = [
 "push",
 "pop",
 "shift",
 "unshift",
 "splice",
 "sort",
 "reverse",
];

/**
 * Intercept mutating methods and emit events
 */
methodsToPatch.forEach(function (method) {
 // cache original method
 const original = arrayProto[method];
 def(arrayMethods, method, function mutator(...args) {
  const result = original.apply(this, args);
  const ob = this.__ob__;
  let inserted;
  switch (method) {
   case "push":
   case "unshift":
    inserted = args;
    break;
   case "splice":
    inserted = args.slice(2);
    break;
  }
  if (inserted) ob.observeArray(inserted);
  // notify change
  ob.dep.notify();
  return result;
 });
});
```

`arrayMethods`继承了`Array`，然后对数组中能够改变原数组的 7 个方法进行了重写，先执行他们的原有逻辑，并对能够增加数组长度的三个方法进行处理，获取新增项并转为响应式对象，最后调用`ob.dep.notify()`手动派发更新，所以数组类型使用`set`方法时就是在调用`splice`

## 计算属性与侦听器

计算属性使用于模板渲染中，某个值依赖了其他响应式对象甚至是计算属性，侦听器使用于观测某个响应式属性发生变化去完成一段复杂的逻辑，首先计算属性的初始化工作是在 inState 函数中

```javascript
function initComputed(vm: Component, computed: Object) {
 // $flow-disable-line
 const watchers = (vm._computedWatchers = Object.create(null));
 // computed properties are just getters during SSR
 const isSSR = isServerRendering();

 for (const key in computed) {
  const userDef = computed[key];
  const getter = typeof userDef === "function" ? userDef : userDef.get;
  if (process.env.NODE_ENV !== "production" && getter == null) {
   warn(`Getter is missing for computed property "${key}".`, vm);
  }

  if (!isSSR) {
   // create internal watcher for the computed property.
   watchers[key] = new Watcher(
    vm,
    getter || noop,
    noop,
    computedWatcherOptions
   );
  }

  // component-defined computed properties are already defined on the
  // component prototype. We only need to define computed properties defined
  // at instantiation here.
  if (!(key in vm)) {
   defineComputed(vm, key, userDef);
  } else if (process.env.NODE_ENV !== "production") {
   if (key in vm.$data) {
    warn(`The computed property "${key}" is already defined in data.`, vm);
   } else if (vm.$options.props && key in vm.$options.props) {
    warn(`The computed property "${key}" is already defined as a prop.`, vm);
   } else if (vm.$options.methods && key in vm.$options.methods) {
    warn(`The computed property "${key}" is already defined as a method.`, vm);
   }
  }
 }
}
```

获取用户传入的 `userDef`（函数形式就是对应的函数，对象就要获取他的 `get`），给每个 `userDef` 创建一个 `computed watcher`，添加到`_computedWatchers`数组中，最后判断是否在 `data，props` 重名

```javascript
export function defineComputed(
 target: any,
 key: string,
 userDef: Object | Function
) {
 const shouldCache = !isServerRendering();
 if (typeof userDef === "function") {
  sharedPropertyDefinition.get = shouldCache
   ? createComputedGetter(key)
   : createGetterInvoker(userDef);
  sharedPropertyDefinition.set = noop;
 } else {
  sharedPropertyDefinition.get = userDef.get
   ? shouldCache && userDef.cache !== false
     ? createComputedGetter(key)
     : createGetterInvoker(userDef.get)
   : noop;
  sharedPropertyDefinition.set = userDef.set || noop;
 }
 if (
  process.env.NODE_ENV !== "production" &&
  sharedPropertyDefinition.set === noop
 ) {
  sharedPropertyDefinition.set = function () {
   warn(
    `Computed property "${key}" was assigned to but it has no setter.`,
    this
   );
  };
 }
 Object.defineProperty(target, key, sharedPropertyDefinition);
}
```

利用 `defineProperty` 将计算属性的 `key` 添加到实例上，并转换 `getter` 和 `setter`，如果是函数形式 `setter` 只是一个空函数,`getter`最后对应的值就是`createComputedGetter`的返回值

```javascript
function createComputedGetter(key) {
 return function computedGetter() {
  const watcher = this._computedWatchers && this._computedWatchers[key];
  if (watcher) {
   if (watcher.dirty) {
    watcher.evaluate();
   }
   if (Dep.target) {
    watcher.depend();
   }
   return watcher.value;
  }
 };
}
class Watcher {
 constructor(
  vm: Component,
  expOrFn: string | Function,
  cb: Function,
  options?: ?Object,
  isRenderWatcher?: boolean
 ) {
  // ...
  this.value = this.lazy ? undefined : this.get();
 }
}
```

在计算属性初始化过程过实例化一个 `watcher`，构造函数执行时会跟 `render watcher` 有所不同,默认并不会去执行`get`而是一个`undefined`,计算属性本身就是一个属性出现在模板中，但执行`render`函数时就会触发到计算属性的`getter`，对他进行计算，计算过程中又访问到内部的响应式属性，就会在触发它们的`getter`,它们会把自身持有的 dep 添加到当前计算的`watcher`,就是`computed watcher`，整个求值过程就完毕了，当计算属性依赖的被修改时，会触发对应的 setter，就会通知所有的订阅者做出更新`watcher.update()`

```javascript
  update () {
    if (this.lazy) {
      this.dirty = true
    } else if (this.sync) {
      this.run()
    } else {
      queueWatcher(this)
    }
  }
```

派发更新时因为有订阅`computed watcher`，所以会把`this.dirty = true`，只有当再次使用到这个计算属性的时候才会重新求值，最后当计算属性的值发生变化后，`render watcher`才会去做更新，考虑到重新计算的开销和重新渲染的开销代价会更小，所以是一种优化。

```javascript
function initWatch(vm: Component, watch: Object) {
 for (const key in watch) {
  const handler = watch[key];
  if (Array.isArray(handler)) {
   for (let i = 0; i < handler.length; i++) {
    createWatcher(vm, key, handler[i]);
   }
  } else {
   createWatcher(vm, key, handler);
  }
 }
}

function createWatcher(
 vm: Component,
 expOrFn: string | Function,
 handler: any,
 options?: Object
) {
 if (isPlainObject(handler)) {
  options = handler;
  handler = handler.handler;
 }
 if (typeof handler === "string") {
  handler = vm[handler];
 }
 return vm.$watch(expOrFn, handler, options);
}
```

侦听器与计算属性的初始化放在定义在相同文件下，`initWatch`对其做遍历然后取出对应的函数调用`createWatcher`,最终返回调用`$watch`,

```javascript
Vue.prototype.$watch = function (
 expOrFn: string | Function,
 cb: any,
 options?: Object
): Function {
 const vm: Component = this;
 if (isPlainObject(cb)) {
  return createWatcher(vm, expOrFn, cb, options);
 }
 options = options || {};
 options.user = true;
 const watcher = new Watcher(vm, expOrFn, cb, options);
 if (options.immediate) {
  try {
   cb.call(vm, watcher.value);
  } catch (error) {
   handleError(
    error,
    vm,
    `callback for immediate watcher "${watcher.expression}"`
   );
  }
 }
 return function unwatchFn() {
  watcher.teardown();
 };
};
```

`$watch`是原型方法定义在`src\core\instance\state.js`，这个方法先对`cb`做了判断因为`$watch`用户可以直接调用，也可以传递对象或者函数，在实例化`watcher`的时候配置对象中的`user`为`true`，表示为一个`user watcher`,如果侦听的属性发生变化就会执行 run 方法，执行回调 cb，如果设置了 immediate 就会立即执行一次 cb，最后返回 unwatchFn，会调用 teardown 移除这个 watcher

```javascript
class Watcher {
 constructor(
  vm: Component,
  expOrFn: string | Function,
  cb: Function,
  options?: ?Object,
  isRenderWatcher?: boolean
 ) {
  // options
  if (options) {
   this.deep = !!options.deep;
   this.user = !!options.user;
   this.lazy = !!options.lazy;
   this.sync = !!options.sync;
   this.before = options.before;
  } else {
   this.deep = this.user = this.lazy = this.sync = false;
  }
 }
}
```

`watcher options`的判断逻辑区分了 wathcer 的类型，`deep watcher`代表侦听器内的配置 deep 为 true（侦听外部属性，只会触发外部属性的 getter，但是外部属性内部的属性发生变化，并没有订阅它的变化，所以即使内部属性触发 setter 也没有可以通知的对象，所以不会触发 watch 的回调）当为`deep watcher`时每次 get 方法调用都会执行`traverse`方法，定义在`src\core\observer\traverse.js`

```javascript
export function traverse(val: any) {
 _traverse(val, seenObjects);
 seenObjects.clear();
}

function _traverse(val: any, seen: SimpleSet) {
 let i, keys;
 const isA = Array.isArray(val);
 if ((!isA && !isObject(val)) || Object.isFrozen(val) || val instanceof VNode) {
  return;
 }
 if (val.__ob__) {
  const depId = val.__ob__.dep.id;
  if (seen.has(depId)) {
   return;
  }
  seen.add(depId);
 }
 if (isA) {
  i = val.length;
  while (i--) _traverse(val[i], seen);
 } else {
  keys = Object.keys(val);
  i = keys.length;
  while (i--) _traverse(val[keys[i]], seen);
 }
}
```

`traverse`函数会递归调用在对这个对象进行遍历时，会触发子属性的`getter`，这样就完成了依赖收集，保证了所有的子属性都订阅了`deep watcher`遍历过程中会把子响应式对象通过它们的 `dep id` 记录到 `seenObjects`，避免以后重复访问，这样就完成内部属性变化也会触发 cb 执行（要根据应用场景权衡是否要开启这个配置）
`scync watcher`因为派发更新的是把`watcher`放入一个队列然后再`nextTick`后真正去执行`watcher`的回调，设置了`sync`，就可以在当前的 Tick 中同步执行

## 组件更新

当组件更新时会调用`vm._update()`方法，最终执行 `patch` 函数

```javascript
return function patch(oldVnode, vnode, hydrating, removeOnly) {
 // 新的 VNode 不存在
 if (isUndef(vnode)) {
  // 老的 VNode 存在，执行 Destroy 钩子函数
  if (isDef(oldVnode)) invokeDestroyHook(oldVnode);
  return;
 }

 let isInitialPatch = false;
 const insertedVnodeQueue = [];

 // 老的 VNode 不存在
 if (isUndef(oldVnode)) {
  // empty mount (likely as component), create new root element
  isInitialPatch = true;
  // 创建新的 VNode
  createElm(vnode, insertedVnodeQueue);
 } else {
  // 新的和老的 VNode 都存在，更新
  const isRealElement = isDef(oldVnode.nodeType);
  // 判断参数1是否是真实 DOM，不是真实 DOM
  if (!isRealElement && sameVnode(oldVnode, vnode)) {
   // 更新操作，diff 算法
   // patch existing root node
   patchVnode(oldVnode, vnode, insertedVnodeQueue, null, null, removeOnly);
  } else {
   // 第一个参数是真实 DOM，创建 VNode
   // 初始化
   if (isRealElement) {
    // mounting to a real element
    // check if this is server-rendered content and if we can perform
    // a successful hydration.
    if (oldVnode.nodeType === 1 && oldVnode.hasAttribute(SSR_ATTR)) {
     oldVnode.removeAttribute(SSR_ATTR);
     hydrating = true;
    }
    if (isTrue(hydrating)) {
     if (hydrate(oldVnode, vnode, insertedVnodeQueue)) {
      invokeInsertHook(vnode, insertedVnodeQueue, true);
      return oldVnode;
     } else if (process.env.NODE_ENV !== "production") {
      warn(
       "The client-side rendered virtual DOM tree is not matching " +
        "server-rendered content. This is likely caused by incorrect " +
        "HTML markup, for example nesting block-level elements inside " +
        "<p>, or missing <tbody>. Bailing hydration and performing " +
        "full client-side render."
      );
     }
    }
    // either not server-rendered, or hydration failed.
    // create an empty node and replace it
    oldVnode = emptyNodeAt(oldVnode);
   }

   // replacing existing element
   const oldElm = oldVnode.elm;
   const parentElm = nodeOps.parentNode(oldElm);

   // create new node
   // 创建 DOM 节点
   createElm(
    vnode,
    insertedVnodeQueue,
    // extremely rare edge case: do not insert if old element is in a
    // leaving transition. Only happens when combining transition +
    // keep-alive + HOCs. (#4590)
    oldElm._leaveCb ? null : parentElm,
    nodeOps.nextSibling(oldElm)
   );

   // update parent placeholder node element, recursively
   if (isDef(vnode.parent)) {
    let ancestor = vnode.parent;
    const patchable = isPatchable(vnode);
    while (ancestor) {
     for (let i = 0; i < cbs.destroy.length; ++i) {
      cbs.destroy[i](ancestor);
     }
     ancestor.elm = vnode.elm;
     if (patchable) {
      for (let i = 0; i < cbs.create.length; ++i) {
       cbs.create[i](emptyNode, ancestor);
      }
      // #6513
      // invoke insert hooks that may have been merged by create hooks.
      // e.g. for directives that uses the "inserted" hook.
      const insert = ancestor.data.hook.insert;
      if (insert.merged) {
       // start at index 1 to avoid re-invoking component mounted hook
       for (let i = 1; i < insert.fns.length; i++) {
        insert.fns[i]();
       }
      }
     } else {
      registerRef(ancestor);
     }
     ancestor = ancestor.parent;
    }
   }

   // destroy old node
   if (isDef(parentElm)) {
    removeVnodes([oldVnode], 0, 0);
   } else if (isDef(oldVnode.tag)) {
    invokeDestroyHook(oldVnode);
   }
  }
 }

 invokeInsertHook(vnode, insertedVnodeQueue, isInitialPatch);
 return vnode.elm;
};
```

这个时候 `oldVnode` 不为空并且 `vnode` 是并不是真实节点，所以接下来会通过 `sameVnode` 来决定走不同的更新逻辑

```javascript
function sameVnode(a, b) {
 return (
  a.key === b.key &&
  ((a.tag === b.tag &&
   a.isComment === b.isComment &&
   isDef(a.data) === isDef(b.data) &&
   sameInputType(a, b)) ||
   (isTrue(a.isAsyncPlaceholder) &&
    a.asyncFactory === b.asyncFactory &&
    isUndef(b.asyncFactory.error)))
 );
}
```

**新旧节点不相同**

- 创建一个新的节点

```javascript
const oldElm = oldVnode.elm;
const parentElm = nodeOps.parentNode(oldElm);

// create new node
// 创建 DOM 节点
createElm(
 vnode,
 insertedVnodeQueue,
 // extremely rare edge case: do not insert if old element is in a
 // leaving transition. Only happens when combining transition +
 // keep-alive + HOCs. (#4590)
 oldElm._leaveCb ? null : parentElm,
 nodeOps.nextSibling(oldElm)
);
```

旧节点为参考节点，创建的新的节点并插入到 `dom` 中

- 更新父的占位符节点

```javascript
if (isDef(vnode.parent)) {
 let ancestor = vnode.parent;
 const patchable = isPatchable(vnode);
 while (ancestor) {
  for (let i = 0; i < cbs.destroy.length; ++i) {
   cbs.destroy[i](ancestor);
  }
  ancestor.elm = vnode.elm;
  if (patchable) {
   for (let i = 0; i < cbs.create.length; ++i) {
    cbs.create[i](emptyNode, ancestor);
   }
   // #6513
   // invoke insert hooks that may have been merged by create hooks.
   // e.g. for directives that uses the "inserted" hook.
   const insert = ancestor.data.hook.insert;
   if (insert.merged) {
    // start at index 1 to avoid re-invoking component mounted hook
    for (let i = 1; i < insert.fns.length; i++) {
     insert.fns[i]();
    }
   }
  } else {
   registerRef(ancestor);
  }
  ancestor = ancestor.parent;
 }
}
```

- 删除旧节点

```javascript
if (isDef(parentElm)) {
 removeVnodes([oldVnode], 0, 0);
} else if (isDef(oldVnode.tag)) {
 invokeDestroyHook(oldVnode);
}
```

**新旧节点相同**
当节点相同时会执行 `patchVnode` 方法

```javascript
function patchVnode(
 oldVnode,
 vnode,
 insertedVnodeQueue,
 ownerArray,
 index,
 removeOnly
) {
 if (oldVnode === vnode) {
  return;
 }

 if (isDef(vnode.elm) && isDef(ownerArray)) {
  // clone reused vnode
  vnode = ownerArray[index] = cloneVNode(vnode);
 }

 const elm = (vnode.elm = oldVnode.elm);

 if (isTrue(oldVnode.isAsyncPlaceholder)) {
  if (isDef(vnode.asyncFactory.resolved)) {
   hydrate(oldVnode.elm, vnode, insertedVnodeQueue);
  } else {
   vnode.isAsyncPlaceholder = true;
  }
  return;
 }

 // reuse element for static trees.
 // note we only do this if the vnode is cloned -
 // if the new node is not cloned it means the render functions have been
 // reset by the hot-reload-api and we need to do a proper re-render.
 // 如果新旧 VNode 都是静态的，那么只需要替换componentInstance
 if (
  isTrue(vnode.isStatic) &&
  isTrue(oldVnode.isStatic) &&
  vnode.key === oldVnode.key &&
  (isTrue(vnode.isCloned) || isTrue(vnode.isOnce))
 ) {
  vnode.componentInstance = oldVnode.componentInstance;
  return;
 }

 let i;
 const data = vnode.data;
 if (isDef(data) && isDef((i = data.hook)) && isDef((i = i.prepatch))) {
  i(oldVnode, vnode);
 }

 const oldCh = oldVnode.children;
 const ch = vnode.children;
 if (isDef(data) && isPatchable(vnode)) {
  // 调用 cbs 中的钩子函数，操作节点的属性/样式/事件....
  for (i = 0; i < cbs.update.length; ++i) cbs.update[i](oldVnode, vnode);
  // 用户的自定义钩子
  if (isDef((i = data.hook)) && isDef((i = i.update))) i(oldVnode, vnode);
 }

 // 新节点没有文本
 if (isUndef(vnode.text)) {
  // 老节点和老节点都有有子节点
  // 对子节点进行 diff 操作，调用 updateChildren
  if (isDef(oldCh) && isDef(ch)) {
   if (oldCh !== ch)
    updateChildren(elm, oldCh, ch, insertedVnodeQueue, removeOnly);
  } else if (isDef(ch)) {
   // 新的有子节点，老的没有子节点
   if (process.env.NODE_ENV !== "production") {
    checkDuplicateKeys(ch);
   }
   // 先清空老节点 DOM 的文本内容，然后为当前 DOM 节点加入子节点
   if (isDef(oldVnode.text)) nodeOps.setTextContent(elm, "");
   addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue);
  } else if (isDef(oldCh)) {
   // 老节点有子节点，新的没有子节点
   // 删除老节点中的子节点
   removeVnodes(oldCh, 0, oldCh.length - 1);
  } else if (isDef(oldVnode.text)) {
   // 老节点有文本，新节点没有文本
   // 清空老节点的文本内容
   nodeOps.setTextContent(elm, "");
  }
 } else if (oldVnode.text !== vnode.text) {
  // 新老节点都有文本节点
  // 修改文本
  nodeOps.setTextContent(elm, vnode.text);
 }
 if (isDef(data)) {
  if (isDef((i = data.hook)) && isDef((i = i.postpatch))) i(oldVnode, vnode);
 }
}
```

当更新的节点是组件`vnode`的时候，会执行`prepatch`方法它定义在`src\core\vdom\create-component.js`

```javascript
  prepatch (oldVnode: MountedComponentVNode, vnode: MountedComponentVNode) {
    const options = vnode.componentOptions
    const child = vnode.componentInstance = oldVnode.componentInstance
    updateChildComponent(
      child,
      options.propsData, // updated props
      options.listeners, // updated listeners
      vnode, // new parent vnode
      options.children // new children
    )
  },
```

这个方法会获取到组件的 `vnode` 的组件配置以及实例，最终执行`updateChildComponent`,方法定义在`src\core\instance\lifecycle.js`

```javascript
export function updateChildComponent(
 vm: Component,
 propsData: ?Object,
 listeners: ?Object,
 parentVnode: MountedComponentVNode,
 renderChildren: ?Array<VNode>
) {
 if (process.env.NODE_ENV !== "production") {
  isUpdatingChildComponent = true;
 }

 // determine whether component has slot children
 // we need to do this before overwriting $options._renderChildren.

 // check if there are dynamic scopedSlots (hand-written or compiled but with
 // dynamic slot names). Static scoped slots compiled from template has the
 // "$stable" marker.
 const newScopedSlots = parentVnode.data.scopedSlots;
 const oldScopedSlots = vm.$scopedSlots;
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

 vm.$options._parentVnode = parentVnode;
 vm.$vnode = parentVnode; // update vm's placeholder node without re-render

 if (vm._vnode) {
  // update child tree's parent
  vm._vnode.parent = parentVnode;
 }
 vm.$options._renderChildren = renderChildren;

 // update $attrs and $listeners hash
 // these are also reactive so they may trigger child update if the child
 // used them during render
 vm.$attrs = parentVnode.data.attrs || emptyObject;
 vm.$listeners = listeners || emptyObject;

 // update props
 if (propsData && vm.$options.props) {
  toggleObserving(false);
  const props = vm._props;
  const propKeys = vm.$options._propKeys || [];
  for (let i = 0; i < propKeys.length; i++) {
   const key = propKeys[i];
   const propOptions: any = vm.$options.props; // wtf flow?
   props[key] = validateProp(key, propOptions, propsData, vm);
  }
  toggleObserving(true);
  // keep a copy of raw propsData
  vm.$options.propsData = propsData;
 }

 // update listeners
 listeners = listeners || emptyObject;
 const oldListeners = vm.$options._parentListeners;
 vm.$options._parentListeners = listeners;
 updateComponentListeners(vm, listeners, oldListeners);

 // resolve slots + force update if has children
 if (needsForceUpdate) {
  vm.$slots = resolveSlots(renderChildren, parentVnode.context);
  vm.$forceUpdate();
 }

 if (process.env.NODE_ENV !== "production") {
  isUpdatingChildComponent = false;
 }
}
```

由于组件 `vnode` 发生变化，组件实例的配置属性也会更新`占位符$vnode,slot,$attrs,$listeners,props`等

```javascript
// 新节点没有文本
if (isUndef(vnode.text)) {
 // 老节点和老节点都有有子节点
 // 对子节点进行 diff 操作，调用 updateChildren
 if (isDef(oldCh) && isDef(ch)) {
  if (oldCh !== ch)
   updateChildren(elm, oldCh, ch, insertedVnodeQueue, removeOnly);
 } else if (isDef(ch)) {
  // 新的有子节点，老的没有子节点
  if (process.env.NODE_ENV !== "production") {
   checkDuplicateKeys(ch);
  }
  // 先清空老节点 DOM 的文本内容，然后为当前 DOM 节点加入子节点
  if (isDef(oldVnode.text)) nodeOps.setTextContent(elm, "");
  addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue);
 } else if (isDef(oldCh)) {
  // 老节点有子节点，新的没有子节点
  // 删除老节点中的子节点
  removeVnodes(oldCh, 0, oldCh.length - 1);
 } else if (isDef(oldVnode.text)) {
  // 老节点有文本，新节点没有文本
  // 清空老节点的文本内容
  nodeOps.setTextContent(elm, "");
 }
} else if (oldVnode.text !== vnode.text) {
 // 新老节点都有文本节点
 // 修改文本
 nodeOps.setTextContent(elm, vnode.text);
}
```

接着完成 `patch` 过程，

1. `vnode` 是文本节点且新旧文本节点不相同，则直接替换文本内容
2. 如果不是文本节点，则判断它们的子节点
   - `oldCh,ch` 存在且不同，调用 `updateChildren` 方法
   - 如果只有 `ch` 存在，表示旧节点不需要，如果旧节点是文本节点就先把节点文本内容清空，然后将 `ch` 插入到新节点下
   - 如果只有 `oldCh` 存在，表示更新的是空节点，就把旧节点中的子节点清除
   - 当旧节点有文本，新节点没有，直接设置文本内容
   - 当新旧节点都有文本时，替换文本内容

**updateChildren ---- diff 算法**

```javascript
function updateChildren(
 parentElm,
 oldCh,
 newCh,
 insertedVnodeQueue,
 removeOnly
) {
 let oldStartIdx = 0;
 let newStartIdx = 0;
 let oldEndIdx = oldCh.length - 1;
 let oldStartVnode = oldCh[0];
 let oldEndVnode = oldCh[oldEndIdx];
 let newEndIdx = newCh.length - 1;
 let newStartVnode = newCh[0];
 let newEndVnode = newCh[newEndIdx];
 let oldKeyToIdx, idxInOld, vnodeToMove, refElm;

 // removeOnly is a special flag used only by <transition-group>
 // to ensure removed elements stay in correct relative positions
 // during leaving transitions
 const canMove = !removeOnly;

 if (process.env.NODE_ENV !== "production") {
  checkDuplicateKeys(newCh);
 }
 // diff 算法
 // 当新节点和旧节点都没有遍历完成
 while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
  if (isUndef(oldStartVnode)) {
   oldStartVnode = oldCh[++oldStartIdx]; // Vnode has been moved left
  } else if (isUndef(oldEndVnode)) {
   oldEndVnode = oldCh[--oldEndIdx];
  } else if (sameVnode(oldStartVnode, newStartVnode)) {
   // oldStartVnode 和 newStartVnode 相同(sameVnode)
   // 直接将该 VNode 节点进行 patchVnode
   patchVnode(
    oldStartVnode,
    newStartVnode,
    insertedVnodeQueue,
    newCh,
    newStartIdx
   );
   // 获取下一组开始节点
   oldStartVnode = oldCh[++oldStartIdx];
   newStartVnode = newCh[++newStartIdx];
  } else if (sameVnode(oldEndVnode, newEndVnode)) {
   // 直接将该 VNode 节点进行 patchVnode
   patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue, newCh, newEndIdx);
   // 获取下一组结束节点
   oldEndVnode = oldCh[--oldEndIdx];
   newEndVnode = newCh[--newEndIdx];
  } else if (sameVnode(oldStartVnode, newEndVnode)) {
   // Vnode moved right
   // oldStartVnode 和 newEndVnode 相同(sameVnode)
   // 进行 patchVnode，把 oldStartVnode 移动到最后
   patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue, newCh, newEndIdx);
   canMove &&
    nodeOps.insertBefore(
     parentElm,
     oldStartVnode.elm,
     nodeOps.nextSibling(oldEndVnode.elm)
    );
   // 移动游标，获取下一组节点
   oldStartVnode = oldCh[++oldStartIdx];
   newEndVnode = newCh[--newEndIdx];
  } else if (sameVnode(oldEndVnode, newStartVnode)) {
   // Vnode moved left
   // oldEndVnode 和 newStartVnode 相同(sameVnode)
   // 进行 patchVnode，把 oldEndVnode 移动到最前面
   patchVnode(
    oldEndVnode,
    newStartVnode,
    insertedVnodeQueue,
    newCh,
    newStartIdx
   );
   canMove &&
    nodeOps.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm);
   oldEndVnode = oldCh[--oldEndIdx];
   newStartVnode = newCh[++newStartIdx];
  } else {
   // 以上四种情况都不满足
   // newStartNode 依次和旧的节点比较

   // 从新的节点开头获取一个，去老节点中查找相同节点
   // 先找新开始节点的key和老节点相同的索引，如果没找到再通过sameVnode找
   if (isUndef(oldKeyToIdx))
    oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx);
   idxInOld = isDef(newStartVnode.key)
    ? oldKeyToIdx[newStartVnode.key]
    : findIdxInOld(newStartVnode, oldCh, oldStartIdx, oldEndIdx);
   // 如果没有找到
   if (isUndef(idxInOld)) {
    // New element
    // 创建节点并插入到最前面
    createElm(
     newStartVnode,
     insertedVnodeQueue,
     parentElm,
     oldStartVnode.elm,
     false,
     newCh,
     newStartIdx
    );
   } else {
    // 获取要移动的老节点
    vnodeToMove = oldCh[idxInOld];
    // 如果使用 newStartNode 找到相同的老节点
    if (sameVnode(vnodeToMove, newStartVnode)) {
     // 执行 patchVnode，并且将找到的旧节点移动到最前面
     patchVnode(
      vnodeToMove,
      newStartVnode,
      insertedVnodeQueue,
      newCh,
      newStartIdx
     );
     oldCh[idxInOld] = undefined;
     canMove &&
      nodeOps.insertBefore(parentElm, vnodeToMove.elm, oldStartVnode.elm);
    } else {
     // 如果key相同，但是是不同的元素，创建新元素
     // same key but different element. treat as new element
     createElm(
      newStartVnode,
      insertedVnodeQueue,
      parentElm,
      oldStartVnode.elm,
      false,
      newCh,
      newStartIdx
     );
    }
   }
   newStartVnode = newCh[++newStartIdx];
  }
 }
 // 当结束时 oldStartIdx > oldEndIdx，旧节点遍历完，但是新节点还没有
 if (oldStartIdx > oldEndIdx) {
  // 说明新节点比老节点多，把剩下的新节点插入到老的节点后面
  refElm = isUndef(newCh[newEndIdx + 1]) ? null : newCh[newEndIdx + 1].elm;
  addVnodes(
   parentElm,
   refElm,
   newCh,
   newStartIdx,
   newEndIdx,
   insertedVnodeQueue
  );
 } else if (newStartIdx > newEndIdx) {
  // 当结束时 newStartIdx > newEndIdx，新节点遍历完，但是旧节点还没有
  removeVnodes(oldCh, oldStartIdx, oldEndIdx);
 }
}
```

- DOM 操作过程很少跨层级比对，所以只对同层级进行对比
- 在对开始与结束节点进行比较时，会做四种情况判断
  - oldStartVnode / newStartVnode （旧开始节点与新开始节点）
    - 调用 patchVnode 对比内部的子节点
    - 新旧节点索引向后移动（oldStartIdx++ / newStartIdx++）
  - oldEndVnode / newEndVnode （旧结束节点与新结束节点）
    - 调用 patchVnode 对比内部的子节点
    - 新旧节点索引向前移动（oldEndIdx-- / newEndIdx--）
  - oldStartVnode / newEndVnode （旧开始节点与新结束节点）
    - 调用 patchVnode 对比内部的子节点
    - 把旧节点插入到最后面 （oldStartIdx++ / newEndIdx--）
  - oldEndVnode / newStartVnode （旧结束节点与新开始节点）
    - 调用 patchVnode 对比内部的子节点
    - 把旧节点插入到最前面 （oldEndIdx-- / newStartIdx++）
  - 非四种情况：获取一个新节点的开始节点，依次与旧节点进行对比
    - 如果没找到，创建一个新节点
    - 如果找到了，sameVnode 是否满足，满足继续 patchVnode 插入 dom，不满足创建一个新的元素插入 dom
- 最后的收尾工作（while 循环结束）
  - 当 oldStartIdx > oldEndIdx 说明老节点数组先遍历完了但是新节点数组有剩余，把剩余节点批量插入到最后面
  - 当 newStartIdx > newEndIdx 说明新节点数组先遍历完了但是旧节点数组有剩余，把剩余节点直接删除
