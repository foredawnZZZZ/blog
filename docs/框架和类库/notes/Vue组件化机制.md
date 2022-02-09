## 组件解析
`_createElement`方法会对参数tag进行判断，如果不是html标签就认为是一个组件，调用`createComponent`方法创建一个组件vnode`src\core\vdom\create-component.js` 项目中`export`一个单文件组件对象会执行这这个方法
（解析组件有两个时机：一个是newVue的时候配置了render函数并且传入的是组件，会进入h函数中的createComponent，一个是patch函数调用过程中createEle阶段发现符合createComponent条件的tag就认为是一个组件）
```javascript
export function createComponent (
  Ctor: Class<Component> | Function | Object | void,
  data: ?VNodeData,
  context: Component,
  children: ?Array<VNode>,
  tag?: string
): VNode | Array<VNode> | void {
  if (isUndef(Ctor)) {
    return
  }

  const baseCtor = context.$options._base //构造函数 基类

  // plain options object: turn it into a constructor
  // 如果 Ctor 不是一个构造函数，是一个对象
  // 使用 Vue.extend() 创造一个子组件的构造函数
  // render: h => h(App)  这种情况会进入
  if (isObject(Ctor)) {
    Ctor = baseCtor.extend(Ctor)
  }

  // if at this stage it's not a constructor or an async component factory,
  // reject.
  if (typeof Ctor !== 'function') {
    if (process.env.NODE_ENV !== 'production') {
      warn(`Invalid Component definition: ${String(Ctor)}`, context)
    }
    return
  }

  // async component
  let asyncFactory
  if (isUndef(Ctor.cid)) {
    asyncFactory = Ctor
    Ctor = resolveAsyncComponent(asyncFactory, baseCtor)
    if (Ctor === undefined) {
      // return a placeholder node for async component, which is rendered
      // as a comment node but preserves all the raw information for the node.
      // the information will be used for async server-rendering and hydration.
      return createAsyncPlaceholder(
        asyncFactory,
        data,
        context,
        children,
        tag
      )
    }
  }

  data = data || {}

  // resolve constructor options in case global mixins are applied after
  // component constructor creation
  resolveConstructorOptions(Ctor)

  // transform component v-model data into props & events
  // 处理组件上的 v-model
  if (isDef(data.model)) {
    transformModel(Ctor.options, data)
  }

  // extract props
  // 提取 props
  const propsData = extractPropsFromVNodeData(data, Ctor, tag)

  // functional component
  if (isTrue(Ctor.options.functional)) {
    return createFunctionalComponent(Ctor, propsData, data, context, children)
  }

  // extract listeners, since these needs to be treated as
  // child component listeners instead of DOM listeners
  const listeners = data.on
  // replace with listeners with .native modifier
  // so it gets processed during parent component patch.
  data.on = data.nativeOn

  if (isTrue(Ctor.options.abstract)) {
    // abstract components do not keep anything
    // other than props & listeners & slot

    // work around flow
    const slot = data.slot
    data = {}
    if (slot) {
      data.slot = slot
    }
  }

  // install component management hooks onto the placeholder node
  // 安装组件的钩子函数 init/prepatch/insert/destroy
  // 准备好了 data.hook 中的钩子函数
  installComponentHooks(data)

  // return a placeholder vnode
  const name = Ctor.options.name || tag
  // 创建自定义组件的 VNode，设置自定义组件的名字
  // 记录this.componentOptions = componentOptions
  const vnode = new VNode(
    `vue-component-${Ctor.cid}${name ? `-${name}` : ''}`,
    data, undefined, undefined, undefined, context,
    { Ctor, propsData, listeners, tag, children },
    asyncFactory
  )

  // Weex specific: invoke recycle-list optimized @render function for
  // extracting cell-slot template.
  // https://github.com/Hanks10100/weex-native-directive/tree/master/component
  /* istanbul ignore if */
  if (__WEEX__ && isRecyclableComponent(vnode)) {
    return renderRecyclableComponentTemplate(vnode)
  }

  return vnode
}
```
关键步骤是先获取基类大`Vue`的构造函数，根据`vue.extend`方法创建子类构造函数，安装组件钩子，实例化`vnode`  `vue.extend`定义在`src\core\global-api\extend.js`
```javascript
export function initExtend (Vue: GlobalAPI) {
  /**
   * Each instance constructor, including Vue, has a unique
   * cid. This enables us to create wrapped "child
   * constructors" for prototypal inheriance and cache them.
   */
  Vue.cid = 0
  let cid = 1

  /**
   * Class inheritance
   */
  Vue.extend = function (extendOptions: Object): Function {
    extendOptions = extendOptions || {}
    // Vue 构造函数
    const Super = this
    const SuperId = Super.cid
    // 从缓存中加载组件的构造函数 防止相同组件多次初始化
    const cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {})
    if (cachedCtors[SuperId]) {
      return cachedCtors[SuperId]
    }

    const name = extendOptions.name || Super.options.name
    if (process.env.NODE_ENV !== 'production' && name) {
      // 如果是开发环境验证组件的名称
      validateComponentName(name)
    }

    const Sub = function VueComponent (options) {
      // 调用 _init() 初始化
      this._init(options)
    }
    // 原型继承自 Vue
    Sub.prototype = Object.create(Super.prototype)
    Sub.prototype.constructor = Sub
    Sub.cid = cid++
    // 合并 options
    Sub.options = mergeOptions(
      Super.options,
      extendOptions
    )
    Sub['super'] = Super

    // For props and computed properties, we define the proxy getters on
    // the Vue instances at extension time, on the extended prototype. This
    // avoids Object.defineProperty calls for each instance created.
    if (Sub.options.props) {
      initProps(Sub)
    }
    if (Sub.options.computed) {
      initComputed(Sub)
    }

    // allow further extension/mixin/plugin usage
    Sub.extend = Super.extend
    Sub.mixin = Super.mixin
    Sub.use = Super.use

    // create asset registers, so extended classes
    // can have their private assets too.
    ASSET_TYPES.forEach(function (type) {
      Sub[type] = Super[type]
    })
    // enable recursive self-lookup
    // 把组件构造构造函数保存到 Ctor.options.components.comp = Ctor
    if (name) {
      Sub.options.components[name] = Sub
    }

    // keep a reference to the super options at extension time.
    // later at instantiation we can check if Super's options have
    // been updated.
    Sub.superOptions = Super.options
    Sub.extendOptions = extendOptions
    Sub.sealedOptions = extend({}, Sub.options)

    // cache constructor
    // 把组件的构造函数缓存到 options._Ctor
    cachedCtors[SuperId] = Sub
    return Sub
  }
}
```
它的作用就是构造出一个子类，使用原型继承的方式把一个对象继承于Vue的构造函数，并扩展它的选项，最后使用缓存避免多次的`extend`调用对同一个组件进行构造，最后会在实例化的过程中调用`_init`方法走到初始化的逻辑
在执行`createComponent`过程中会安装组件钩子，vnode在patch过程中会对外暴露一些时机的钩子函数，Vue在初始化一个 `Component` 类型的 `VNode` 的过程中实现了几个钩子函数
```javascript
const componentVNodeHooks = {
  init (vnode: VNodeWithData, hydrating: boolean): ?boolean {
    if (
      vnode.componentInstance &&
      !vnode.componentInstance._isDestroyed &&
      vnode.data.keepAlive
    ) {
      // kept-alive components, treat as a patch
      const mountedNode: any = vnode // work around flow
      componentVNodeHooks.prepatch(mountedNode, mountedNode)
    } else {
      const child = vnode.componentInstance = createComponentInstanceForVnode(
        vnode,
        activeInstance
      )
      child.$mount(hydrating ? vnode.elm : undefined, hydrating)
    }
  },

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

  insert (vnode: MountedComponentVNode) {
    const { context, componentInstance } = vnode
    if (!componentInstance._isMounted) {
      componentInstance._isMounted = true
      callHook(componentInstance, 'mounted')
    }
    if (vnode.data.keepAlive) {
      if (context._isMounted) {
        // vue-router#1212
        // During updates, a kept-alive component's child components may
        // change, so directly walking the tree here may call activated hooks
        // on incorrect children. Instead we push them into a queue which will
        // be processed after the whole patch process ended.
        queueActivatedComponent(componentInstance)
      } else {
        activateChildComponent(componentInstance, true /* direct */)
      }
    }
  },

  destroy (vnode: MountedComponentVNode) {
    const { componentInstance } = vnode
    if (!componentInstance._isDestroyed) {
      if (!vnode.data.keepAlive) {
        componentInstance.$destroy()
      } else {
        deactivateChildComponent(componentInstance, true /* direct */)
      }
    }
  }
}
const hooksToMerge = Object.keys(componentVNodeHooks)

function installComponentHooks (data: VNodeData) {
  const hooks = data.hook || (data.hook = {})
  // 用户可以传递自定义钩子函数
  // 把用户传入的自定义钩子函数和 componentVNodeHooks 中预定义的钩子函数合并
  for (let i = 0; i < hooksToMerge.length; i++) {
    const key = hooksToMerge[i]
    const existing = hooks[key]
    const toMerge = componentVNodeHooks[key]
    if (existing !== toMerge && !(existing && existing._merged)) {
      hooks[key] = existing ? mergeHook(toMerge, existing) : toMerge
    }
  }
}
function mergeHook (f1: any, f2: any): Function {
  const merged = (a, b) => {
    // flow complains about extra args which is why we use any
    f1(a, b)
    f2(a, b)
  }
  merged._merged = true
  return merged
}
```
在 `VNode` 执行 `patch` 的过程中执行相关的钩子函数，整个调用过程就是把用户传递的钩子与Vue本身定义的钩子在某些时机进行合并配置，最终在执行的时候依次执行，最后一步是实例化vnode，tag就是`vue-component-`特有的前缀做标识


## 组件挂载
生成组件vnode后会继续执行私有的`_update`方法，在执行`vm.__patch__`去把vnode渲染成真实dom节点，patch过程中会调用createEle方法创建元素，其中会对`createComponent`函数的返回值进行判断如果满足就直接return
```javascript
function createComponent (vnode, insertedVnodeQueue, parentElm, refElm) {
  let i = vnode.data
  if (isDef(i)) {
    const isReactivated = isDef(vnode.componentInstance) && i.keepAlive
    if (isDef(i = i.hook) && isDef(i = i.init)) {
      // 调用 init() 方法，创建和挂载组件实例
      // init() 的过程中创建好了组件的真实 DOM,挂载到了 vnode.elm 上
      i(vnode, false /* hydrating */)
    }
    // after calling the init hook, if the vnode is a child component
    // it should've created a child instance and mounted it. the child
    // component also has set the placeholder vnode's elm.
    // in that case we can just return the element and be done.
    if (isDef(vnode.componentInstance)) {
      // 调用钩子函数（VNode的钩子函数初始化属性/事件/样式等，组件的钩子函数）
      initComponent(vnode, insertedVnodeQueue)
      // 把组件对应的 DOM 插入到父元素中
      insert(parentElm, vnode.elm, refElm)
      if (isTrue(isReactivated)) {
        reactivateComponent(vnode, insertedVnodeQueue, parentElm, refElm)
      }
      return true
    }
  }
}
```
如果这个vnode是组件vnode条件会满足并且得到i就是init钩子
```javascript
  init (vnode: VNodeWithData, hydrating: boolean): ?boolean {
    if (
      vnode.componentInstance &&
      !vnode.componentInstance._isDestroyed &&
      vnode.data.keepAlive
    ) {
      // kept-alive components, treat as a patch
      const mountedNode: any = vnode // work around flow
      componentVNodeHooks.prepatch(mountedNode, mountedNode)
    } else {
      const child = vnode.componentInstance = createComponentInstanceForVnode(
        vnode,
        activeInstance
      )
      child.$mount(hydrating ? vnode.elm : undefined, hydrating)
    }
  },
```
它通过`createComponentInstanceForVnode`方法创建一个vue的实例用来调用$mount方法
```javascript
export function createComponentInstanceForVnode (
  vnode: any, // we know it's MountedComponentVNode but flow doesn't
  parent: any, // activeInstance in lifecycle state
): Component {
  const options: InternalComponentOptions = {
    _isComponent: true,
    _parentVnode: vnode,
    parent
  }
  // check inline-template render functions
  // 获取 inline-template
  // <comp inline-template> xxxx </comp>
  const inlineTemplate = vnode.data.inlineTemplate
  if (isDef(inlineTemplate)) {
    options.render = inlineTemplate.render
    options.staticRenderFns = inlineTemplate.staticRenderFns
  }
  // 创建组件实例
  return new vnode.componentOptions.Ctor(options)
}
```
这个函数内部创建了一个选项配置，然后创建组件的实例，这个options对象比较重要，_isComponent表示他是一个组件，parent表示点当前激活的组件实例，new vnode.componentOptions.Ctor(options)相当于extend方法中的new Sub()，所以会执行_init方法，当实例是组件时与根实例的略有不同
```javascript
Vue.prototype._init = function (options?: Object) {
  const vm: Component = this
  // ... ...
  // merge options
  // 合并 options
  if (options && options._isComponent) {
    // optimize internal component instantiation
    // since dynamic options merging is pretty slow, and none of the
    // internal component options needs special treatment.
    initInternalComponent(vm, options)
  } else {
    vm.$options = mergeOptions(
      resolveConstructorOptions(vm.constructor),
      options || {},
      vm
    )
  }
  // ... ...
  // 调用 $mount() 挂载
  if (vm.$options.el) {
    vm.$mount(vm.$options.el)
  }
}
```
因为_isComponent为true满足了条件所以触发了initInternalComponent方法
```javascript
export function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  const opts = vm.$options = Object.create(vm.constructor.options)
  // doing this because it's faster than dynamic enumeration.
  const parentVnode = options._parentVnode
  opts.parent = options.parent
  opts._parentVnode = parentVnode

  const vnodeComponentOptions = parentVnode.componentOptions
  opts.propsData = vnodeComponentOptions.propsData
  opts._parentListeners = vnodeComponentOptions.listeners
  opts._renderChildren = vnodeComponentOptions.children
  opts._componentTag = vnodeComponentOptions.tag

  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}
```
这个方法重点是把createComponentInstanceForVnode中的配置对象合并到$options，_init方法最后会对el选项的存在进行判断，由于组件的初始化是没有el选项，所以mount方法由子组件自己触发，在组件的init方法中child.$mount(hydrating ? vnode.elm : undefined, hydrating)hydrating是服务端渲染不用考虑，最终调用mountComponent，流程与初始化流程相似了，因为组件树的构成是先有父级在有子级，所以在此时调用__render方法，vm.$vnode就是当前vnode的parent,生成完vnode就需要执行渲染watcher中的get方法就是私有的_update方法，再次分析这个方法
```javascript
export let activeInstance: any = null

export function setActiveInstance(vm: Component) {
  const prevActiveInstance = activeInstance
  activeInstance = vm
  return () => {
    activeInstance = prevActiveInstance
  }
}
  Vue.prototype._update = function (vnode: VNode, hydrating?: boolean) {
    const vm: Component = this
    const prevEl = vm.$el
    const prevVnode = vm._vnode
    const restoreActiveInstance = setActiveInstance(vm)
    vm._vnode = vnode
    // Vue.prototype.__patch__ is injected in entry points
    // based on the rendering backend used.
    if (!prevVnode) {
      // initial render
      vm.$el = vm.__patch__(vm.$el, vnode, hydrating, false /* removeOnly */)
    } else {
      // updates
      vm.$el = vm.__patch__(prevVnode, vnode)
    }
    restoreActiveInstance()
    // update __vue__ reference
    if (prevEl) {
      prevEl.__vue__ = null
    }
    if (vm.$el) {
      vm.$el.__vue__ = vm
    }
    // if parent is an HOC, update its $el as well
    if (vm.$vnode && vm.$parent && vm.$vnode === vm.$parent._vnode) {
      vm.$parent.$el = vm.$el
    }
    // updated hook is called by the scheduler to ensure that children are
    // updated in a parent's updated hook.
  }
```
这个_vnode就是当前vnode那么vm._vnode 和 vm.$vnode 的关系就是一种父子关系，setActiveInstance的作用是保持当前上下文的实例，activeInstance是当前模块的全局变量，在之前调用createComponentInstanceForVnode方法时会导入这个变量并当作参数传入，js在主线程执行代码时整个初始化是深度遍历的过程，在子组件实例化过程中，需要知道当前上下文中的vue实例是什么，并且把它当作子组件的父vue实例，之前在子组件执行_init方法时会先调用initInternalComponent合并选项，把parent存在$options中，在$mount之前会调用initLifecycle方法
```javascript
export function initLifecycle (vm: Component) {
  const options = vm.$options

  // locate first non-abstract parent
  let parent = options.parent
  if (parent && !options.abstract) {
    while (parent.$options.abstract && parent.$parent) {
      parent = parent.$parent
    }
    parent.$children.push(vm)
  }

  vm.$parent = parent
  vm.$root = parent ? parent.$root : vm

  vm.$children = []
  vm.$refs = {}

  vm._watcher = null
  vm._inactive = null
  vm._directInactive = false
  vm._isMounted = false
  vm._isDestroyed = false
  vm._isBeingDestroyed = false
}
```
vm.$parent就是用来保存当前vm实例的父实例，parent.$children.push(vm)，把当前实例存储到父实例中的$children中，在_update方法中通过调用setActiveInstance来确保一个父子关系，当一个vm实例完成所有的子树的patch之后，activeInstance又会回到它的父实例，这样就完美地保证了 createComponentInstanceForVnode 整个深度遍历过程中，我们在实例化子组件的时候能传入当前子组件的父 Vue 实例，并在 _init 的过程中，通过 vm.$parent 把这个父子关系保留。
在回到patch方法中会调用负责dom渲染的createEle方法
```javascript
  vm.$el = vm.__patch__(vm.$el, vnode, hydrating, false /* removeOnly */)
export function createPatchFunction (backend) {
  function createElm (
    vnode,
    insertedVnodeQueue,
    parentElm,
    refElm,
    nested,
    ownerArray,
    index
  ) {
    // ... 
    if (createComponent(vnode, insertedVnodeQueue, parentElm, refElm)) {
      return
    }

    const data = vnode.data
    const children = vnode.children
    const tag = vnode.tag
    if (isDef(tag)) {
     // ...

      vnode.elm = vnode.ns
        ? nodeOps.createElementNS(vnode.ns, tag)
        : nodeOps.createElement(tag, vnode)
      setScope(vnode)

      /* istanbul ignore if */
      if (__WEEX__) {
          // ... 
      } else {
        createChildren(vnode, children, insertedVnodeQueue)
        if (isDef(data)) {
          invokeCreateHooks(vnode, insertedVnodeQueue)
        }
        insert(parentElm, vnode.elm, refElm)
      }

        // ...
    } else if (isTrue(vnode.isComment)) {
      vnode.elm = nodeOps.createComment(vnode.text)
      insert(parentElm, vnode.elm, refElm)
    } else {
      vnode.elm = nodeOps.createTextNode(vnode.text)
      insert(parentElm, vnode.elm, refElm)
    }
  }
  return function patch (oldVnode, vnode, hydrating, removeOnly) {
    // 新的 VNode 不存在
    if (isUndef(vnode)) {
      // 老的 VNode 存在，执行 Destroy 钩子函数
      if (isDef(oldVnode)) invokeDestroyHook(oldVnode)
      return
    }

    let isInitialPatch = false
    const insertedVnodeQueue = []

    // 老的 VNode 不存在
    if (isUndef(oldVnode)) {
      // empty mount (likely as component), create new root element
      isInitialPatch = true
      // 创建新的 VNode
      createElm(vnode, insertedVnodeQueue)
    } else {
        // ...
    }

    invokeInsertHook(vnode, insertedVnodeQueue, isInitialPatch)
    return vnode.elm
  }
}
```
此时子组件不存在$el,createElm(vnode, insertedVnodeQueue)调用，这里createComponent(vnode, insertedVnodeQueue, parentElm, refElm)返回的是false，就会先创建父节点占位，遍历所欲的子vnode递归调用createEle，如果发现子vnode是一个组件的vnode，在开始组件解析，以递归的方式创建整个组件树，在完成组件的整个 patch 过程后，最后执行 insert(parentElm, vnode.elm, refElm) 完成组件的 DOM 插入，如果组件 patch 过程中又创建了子组件，那么DOM 的插入顺序是先子后父

## 合并配置选项
mergeOptions的过程出现在两个场景中，一个是外部new Vue的过程另一个是解析组件，实例化子组件的过程；因为他们都会执行_init方法这个方法传入options，然后在去执行mergeOptions方法
```javascript
  Vue.prototype._init = function (options?: Object) {
    const vm: Component = this
    // ... 
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      initInternalComponent(vm, options)
    } else {
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }
    // ... 
  }
```
组件实例的合并逻辑与根实例的合并逻辑不一样，传入的options也不同
1. 外部逻辑
当执行外部逻辑的时候会调用resolveConstructorOptions并且传入实例的构造函数，构造器上的属性与方法在(就是我们的配置对象options和Vue构造器上的options进行合并对象)src\core\global-api\index.js中定义
```javascript
export function initGlobalAPI (Vue: GlobalAPI) {
  // config
  const configDef = {}
  configDef.get = () => config
  if (process.env.NODE_ENV !== 'production') {
    configDef.set = () => {
      warn(
        'Do not replace the Vue.config object, set individual fields instead.'
      )
    }
  }
  // 初始化 Vue.config 对象
  Object.defineProperty(Vue, 'config', configDef)

  // exposed util methods.
  // NOTE: these are not considered part of the public API - avoid relying on
  // them unless you are aware of the risk.
  // 这些工具方法不视作全局API的一部分，除非你已经意识到某些风险，否则不要去依赖他们
  Vue.util = {
    warn,
    extend,
    mergeOptions,
    defineReactive
  }
  // 静态方法 set/delete/nextTick
  Vue.set = set
  Vue.delete = del
  Vue.nextTick = nextTick

  // 2.6 explicit observable API
  // 让一个对象可响应
  // Vue.observable = <T>(obj: T): T => {
  //   observe(obj)
  //   return obj
  // }
  // 初始化 Vue.options 对象，并给其扩展
  // components/directives/filters
  Vue.options = Object.create(null)
  ASSET_TYPES.forEach(type => {
    Vue.options[type + 's'] = Object.create(null)
  })

  // this is used to identify the "base" constructor to extend all plain-object
  // components with in Weex's multi-instance scenarios.
  Vue.options._base = Vue

  // 设置 keep-alive 组件
  extend(Vue.options.components, builtInComponents)

  // 注册 Vue.use() 用来注册插件
  initUse(Vue)
  // 注册 Vue.mixin() 实现混入
  initMixin(Vue)
  // 注册 Vue.extend() 基于传入的options返回一个组件的构造函数
  initExtend(Vue)
  // 注册 Vue.directive()、 Vue.component()、Vue.filter()
  initAssetRegisters(Vue)
}
```
这个文件注入一些静态成员，创建options，mergeOptions定义在src\core\util\options.js
```javascript
export function mergeOptions (
  parent: Object,
  child: Object,
  vm?: Component
): Object {
  if (process.env.NODE_ENV !== 'production') {
    checkComponents(child)
  }

  if (typeof child === 'function') {
    child = child.options
  }

  normalizeProps(child, vm)
  normalizeInject(child, vm)
  normalizeDirectives(child)

  // Apply extends and mixins on the child options,
  // but only if it is a raw options object that isn't
  // the result of another mergeOptions call.
  // Only merged options has the _base property.
  if (!child._base) {
    if (child.extends) {
      parent = mergeOptions(parent, child.extends, vm)
    }
    if (child.mixins) {
      for (let i = 0, l = child.mixins.length; i < l; i++) {
        parent = mergeOptions(parent, child.mixins[i], vm)
      }
    }
  }

  const options = {}
  let key
  for (key in parent) {
    mergeField(key)
  }
  for (key in child) {
    if (!hasOwn(parent, key)) {
      mergeField(key)
    }
  }
  function mergeField (key) {
    const strat = strats[key] || defaultStrat
    options[key] = strat(parent[key], child[key], vm, key)
  }
  return options
}
```
这个函数的主要功能就是将parent和child这个两个对象根据一些合并的策略结合成一个新的对象，strat就是Object.create(null)创建出来的对象，他先把extends和mixins通过递归合并到parent上，在遍历parent调用mergeField，在遍历child，如果key不在parent身上就mergeField，mergeField函数表示他对于不同key有着不同的合并策略
```javascript
export const LIFECYCLE_HOOKS = [
  'beforeCreate',
  'created',
  'beforeMount',
  'mounted',
  'beforeUpdate',
  'updated',
  'beforeDestroy',
  'destroyed',
  'activated',
  'deactivated',
  'errorCaptured'
]
function mergeHook (
  parentVal: ?Array<Function>,
  childVal: ?Function | ?Array<Function>
): ?Array<Function> {
  const res = childVal
    ? parentVal
      ? parentVal.concat(childVal)
      : Array.isArray(childVal)
        ? childVal
        : [childVal]
    : parentVal
  return res
    ? dedupeHooks(res)
    : res
}
```
对于生命周期而言,他会根据多层的三元运算符判断不存在childVal就返回parentVal，parentVal不存在，就返回childval的数组，存在就把childval添加到parentVal中，返回一个新数组，所以一旦parent和child都定义了hooks的话就会返回一个2个钩子的集合，当mergeOptions执行完this.$options就生成一个新的配置对象
2. 组件场景
由于组件的构造函数是extend方法执行出来的，它继承自Vue
```javascript
  Vue.extend = function (extendOptions: Object): Function {
    extendOptions = extendOptions || {}
    // ...
    const Sub = function VueComponent (options) {
      // 调用 _init() 初始化
      this._init(options)
    }
    // 原型继承自 Vue
    Sub.prototype = Object.create(Super.prototype)
    Sub.prototype.constructor = Sub
    Sub.cid = cid++
    // 合并 options
    Sub.options = mergeOptions(
      Super.options,
      extendOptions
    )
    // ...
    // been updated.
    Sub.superOptions = Super.options
    Sub.extendOptions = extendOptions
    Sub.sealedOptions = extend({}, Sub.options)

    return Sub
  }
```
extend方法也会接收一个extendOptions参数，他会和Vue.options进行合并，给到Sub.options
```javascript
export function createComponentInstanceForVnode (
  vnode: any, // we know it's MountedComponentVNode but flow doesn't
  parent: any, // activeInstance in lifecycle state
): Component {
  const options: InternalComponentOptions = {
    _isComponent: true,
    _parentVnode: vnode,
    parent
  }
  // ...
  return new vnode.componentOptions.Ctor(options)
}
```
在组件的初始化过程中会实例化Sub，他会再次调用_init方法此时options._isComponent为true走到initInternalComponent方法中，
创建当前组件实例的$options属性，将父实例父vode等注入进去，组件的mergeOptions并没有递归处理还有关于keys的合并策略等逻辑

## 生命周期
每个Vue实例在创建之前都要经过数据劫持，编译模板，挂载DOM，数据驱动更新DOM等一系列过程，在这些过程会自动调用的函数
<img :src="$withBase('/lifeycle.png')" width="666px" alt="hooks">

执行各个名称的生命周期是通过callHook方法来调用的，它定义在`src\core\instance\lifecycle.js`
```javascript
export function callHook (vm: Component, hook: string) {
  // #7573 disable dep collection when invoking lifecycle hooks
  pushTarget()
  const handlers = vm.$options[hook]
  const info = `${hook} hook`
  if (handlers) {
    for (let i = 0, j = handlers.length; i < j; i++) {
      invokeWithErrorHandling(handlers[i], vm, null, vm, info)
    }
  }
  if (vm._hasHookEvent) {
    vm.$emit('hook:' + hook)
  }
  popTarget()
}
```
方法的核心是取出对应的集合依次执行，执行时把当前的vm当作执行上下文
1. beforeCreate & created
```javascript
  Vue.prototype._init = function (options?: Object) {
    // ...
    // vm 的生命周期相关变量初始化
    // $children/$parent/$root/$refs
    initLifecycle(vm)
    // vm 的事件监听初始化, 父组件绑定在当前组件上的事件
    initEvents(vm)
    // vm 的编译render初始化
    // $slots/$scopedSlots/_c/$createElement/$attrs/$listeners
    initRender(vm)
    // beforeCreate 生命钩子的回调
    callHook(vm, 'beforeCreate')
    // 把 inject 的成员注入到 vm 上
    initInjections(vm) // resolve injections before data/props
    // 初始化 vm 的 _props/methods/_data/computed/watch
    initState(vm)
    // 初始化 provide
    initProvide(vm) // resolve provide after data/props
    // created 生命钩子的回调
    callHook(vm, 'created')
    // ...
  }
```
这个两个钩子函数都是在实例创建阶段_init方法执行中调用的，beforeCreate和created钩子实在initState方法调用前后触发，这个方法Vue初始数据的，所以beforeCreate访问不到props,data,methods等；但是这两个钩子执行时并没有渲染DOM，所以不能访问DOM元素，如果组件的加载需要和后端做交互，放在这两个钩子里
2. beforeMount & mounted
beforeMount的调用时机在挂载之前，在mountComponent方法中
```javascript
export function mountComponent (
  vm: Component,
  el: ?Element,
  hydrating?: boolean
): Component {
  vm.$el = el
  if (!vm.$options.render) {
    vm.$options.render = createEmptyVNode
    if (process.env.NODE_ENV !== 'production') {
      /* istanbul ignore if */
      if ((vm.$options.template && vm.$options.template.charAt(0) !== '#') ||
        vm.$options.el || el) {
        warn(
          'You are using the runtime-only build of Vue where the template ' +
          'compiler is not available. Either pre-compile the templates into ' +
          'render functions, or use the compiler-included build.',
          vm
        )
      } else {
        warn(
          'Failed to mount component: template or render function not defined.',
          vm
        )
      }
    }
  }
  callHook(vm, 'beforeMount')

  let updateComponent
  /* istanbul ignore if */
  if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
    updateComponent = () => {
      const name = vm._name
      const id = vm._uid
      const startTag = `vue-perf-start:${id}`
      const endTag = `vue-perf-end:${id}`

      mark(startTag)
      const vnode = vm._render()
      mark(endTag)
      measure(`vue ${name} render`, startTag, endTag)

      mark(startTag)
      vm._update(vnode, hydrating)
      mark(endTag)
      measure(`vue ${name} patch`, startTag, endTag)
    }
  } else {
    updateComponent = () => {
      vm._update(vm._render(), hydrating)
    }
  }

  // we set this to vm._watcher inside the watcher's constructor
  // since the watcher's initial patch may call $forceUpdate (e.g. inside child
  // component's mounted hook), which relies on vm._watcher being already defined
  new Watcher(vm, updateComponent, noop, {
    before () {
      if (vm._isMounted && !vm._isDestroyed) {
        callHook(vm, 'beforeUpdate')
      }
    }
  }, true /* isRenderWatcher */)
  hydrating = false

  // manually mounted instance, call mounted on self
  // mounted is called for render-created child components in its inserted hook
  if (vm.$vnode == null) {
    vm._isMounted = true
    callHook(vm, 'mounted')
  }
  return vm
}
```
他在渲染vnode之前，执行了beforeMount，执行完私有的_update方法之后执行mounted，关键点是mounted的执行有条件控制，如果vm.$vnode为null，说明不是组件的实例化而是外部new Vue的过程！
```javascript
  function invokeInsertHook (vnode, queue, initial) {
    // delay insert hooks for component root nodes, invoke them after the
    // element is really inserted
    if (isTrue(initial) && isDef(vnode.parent)) {
      vnode.parent.data.pendingInsert = queue
    } else {
      for (let i = 0; i < queue.length; ++i) {
        queue[i].data.hook.insert(queue[i])
      }
    }
  }
```
组件的vnode在patch完毕后会执行一个invokeInsertHook函数，他会把第二个参数queue里面保存的钩子一次执行
```javascript
const componentVNodeHooks = {
    init (vnode: VNodeWithData, hydrating: boolean): ?boolean {
    if (
      vnode.componentInstance &&
      !vnode.componentInstance._isDestroyed &&
      vnode.data.keepAlive
    ) {
      // kept-alive components, treat as a patch
      const mountedNode: any = vnode // work around flow
      componentVNodeHooks.prepatch(mountedNode, mountedNode)
    } else {
      const child = vnode.componentInstance = createComponentInstanceForVnode(
        vnode,
        activeInstance
      )
      child.$mount(hydrating ? vnode.elm : undefined, hydrating)
    }
  }
  // ...
}
```
由于insertedVnodeQueue的添加顺序是先子后父，所以对于同步渲染的子组件而言mounted的执行顺序也是先子在父
3. beforeUpdate & updated
这个钩子与双向数据绑定相关，beforeUpdate在渲染watcher的before函数中调用，它的执行条件是mounted过才会执行
```javascript
function callUpdatedHooks (queue) {
  let i = queue.length
  while (i--) {
    const watcher = queue[i]
    const vm = watcher.vm
    if (vm._watcher === watcher && vm._isMounted && !vm._isDestroyed) {
      callHook(vm, 'updated')
    }
  }
}
function flushSchedulerQueue () {
  // call component updated and activated hooks
  // ...  
  callUpdatedHooks(updatedQueue)
  // ...
}
```
updated方法更新了watcher数组，对数组做遍历只要满足是渲染watcher并且mounted过两个条件就会执行
```javascript
export default class Watcher {
  constructor (
    vm: Component,
    expOrFn: string | Function,
    cb: Function,
    options?: ?Object,
    isRenderWatcher?: boolean
  ) {
    this.vm = vm
    if (isRenderWatcher) {
      vm._watcher = this
    }
    vm._watchers.push(this)
  }
}
```
mountComponent方法执行过程中会对watcher实例化，最后传递的参数时true表明是渲染watcher然后把当前watcher实例添加到_watchers，vm._watcher 是专门用来监听 vm 上数据变化然后重新渲染的，所以它是一个渲染相关的 watcher，因此在 callUpdatedHooks 函数中，只有 vm._watcher 的回调执行完毕后，才会执行 updated 钩子函数。
4. beforeDestroy & destroyed
这两个钩子的位置是在$destory方法中调用的，他定义在src\core\instance\lifecycle.js
```javascript
  Vue.prototype.$destroy = function () {
    const vm: Component = this
    if (vm._isBeingDestroyed) {
      return
    }
    callHook(vm, 'beforeDestroy')
    vm._isBeingDestroyed = true
    // remove self from parent
    const parent = vm.$parent
    if (parent && !parent._isBeingDestroyed && !vm.$options.abstract) {
      remove(parent.$children, vm)
    }
    // teardown watchers
    if (vm._watcher) {
      vm._watcher.teardown()
    }
    let i = vm._watchers.length
    while (i--) {
      vm._watchers[i].teardown()
    }
    // remove reference from data ob
    // frozen object may not have observer.
    if (vm._data.__ob__) {
      vm._data.__ob__.vmCount--
    }
    // call the last hook...
    vm._isDestroyed = true
    // invoke destroy hooks on current rendered tree
    vm.__patch__(vm._vnode, null)
    // fire destroyed hook
    callHook(vm, 'destroyed')
    // turn off all instance listeners.
    vm.$off()
    // remove __vue__ reference
    if (vm.$el) {
      vm.$el.__vue__ = null
    }
    // release circular reference (#6759)
    if (vm.$vnode) {
      vm.$vnode.parent = null
    }
  }
```
beforeDestroy是在执行的顶端就开始了，接着开始移除父实例中$children中的自身，删除watcher，然后会在调用一次patch触发它子组件的销毁钩子，递归执行，所以destroyed执行的过程也跟mounted一样先子后父的执行下去

## 组件注册
除了内置组件外，其他的自定义组件必须通过注册来使用，否则就会抛出错误
1. 全局注册
通过Vue.component(tagName, options) 这个方法定义在src\core\global-api\assets.js
```javascript
export const ASSET_TYPES = [
  'component',
  'directive',
  'filter'
]
import { ASSET_TYPES } from 'shared/constants'
import { isPlainObject, validateComponentName } from '../util/index'

export function initAssetRegisters (Vue: GlobalAPI) {
  /**
   * Create asset registration methods.
   */
  // 遍历 ASSET_TYPES 数组，为 Vue 定义相应方法
  // ASSET_TYPES 包括了directive、 component、filter
  ASSET_TYPES.forEach(type => {
    Vue[type] = function (
      id: string,
      definition: Function | Object
    ): Function | Object | void {
      if (!definition) {
        return this.options[type + 's'][id]
      } else {
        /* istanbul ignore if */
        if (process.env.NODE_ENV !== 'production' && type === 'component') {
          validateComponentName(id)
        }
        // Vue.component('comp', { template: '' })
        if (type === 'component' && isPlainObject(definition)) {
          definition.name = definition.name || id
          // 把组件配置转换为组件的构造函数
          definition = this.options._base.extend(definition)
        }
        if (type === 'directive' && typeof definition === 'function') {
          definition = { bind: definition, update: definition }
        }
        // 全局注册，存储资源并赋值
        // this.options['components']['comp'] = definition
        this.options[type + 's'][id] = definition
        return definition
      }
    }
  })
}
```
如果type是component并且definition是一个对象的话，通过extend()方法把这个对象转为一个基于Vue的构造函数最后把他注入到options.components里面，由此可知所有的组件都是通过extend继承而来的
```javascript
Sub.options = mergeOptions(
  Super.options,
  extendOptions
)
```
extend内部会执行这个选项合并把Vue.option合到Sub.options，然后在组件实例化的过程中就会执行mergeOptions逻辑把 Sub.options.components 合并到 vm.$options.components
```javascript
export function _createElement (
  context: Component,
  tag?: string | Class<Component> | Function | Object,
  data?: VNodeData,
  children?: any,
  normalizationType?: number
): VNode | Array<VNode> {
  // ...
   else if (isDef(Ctor = resolveAsset(context.$options, 'components', tag))) {
      // component
      vnode = createComponent(Ctor, data, context, children, tag)
    }
  // ...
}

export function resolveAsset (
  options: Object,
  type: string,
  id: string,
  warnMissing?: boolean
): any {
  /* istanbul ignore if */
  if (typeof id !== 'string') {
    return
  }
  const assets = options[type]
  // check local registration variations first
  if (hasOwn(assets, id)) return assets[id]
  const camelizedId = camelize(id)
  if (hasOwn(assets, camelizedId)) return assets[camelizedId]
  const PascalCaseId = capitalize(camelizedId)
  if (hasOwn(assets, PascalCaseId)) return assets[PascalCaseId]
  // fallback to prototype chain
  const res = assets[id] || assets[camelizedId] || assets[PascalCaseId]
  if (process.env.NODE_ENV !== 'production' && warnMissing && !res) {
    warn(
      'Failed to resolve ' + type.slice(0, -1) + ': ' + id,
      options
    )
  }
  return res
}
```
在创建vnode的过程当中会有一个判断逻辑 这个条件引用了resolveAsset方法它定义在src\core\util\options.js中，它先通过 const assets = options[type] 拿到 assets，然后再尝试拿 assets[id]，这里有个顺序，先直接使用 id 拿，如果不存在，则把 id 变成驼峰的形式再拿，如果仍然不存在则在驼峰的基础上把首字母再变成大写的形式再拿，如果仍然拿不到则报错。这样说明了我们在使用 Vue.component(id, definition) 全局注册组件的时候，id 可以是连字符、驼峰或首字母大写的形式。最后返回组件的构造函数作为createComponent方法的参数
2. 局部注册
局部注册的流程很清晰，在组件的实例化阶段会合并components选项合并到vm.$options.components这样也会在resolveAsset上拿到组件的构造函数，不同点在于全局注册是在大Vue的options下，在所有组件创建的过程中，都会从全局的$options.components扩展到当前实例上的$options.components这就是全局注册可以在任意地方使用的原因

## 异步组件/动态组件
为了解决主App.js体积代码减少，非首屏组件设计成异步组件，按需加载。此时Vue.component方法的第二个参数需要接受一个函数，并且需要resolve和reject两个参数，由于参数不是对象所以不会执行extend方法去获取构造函数，但是可以执行createComponent
```javascript
export function createComponent (
  Ctor: Class<Component> | Function | Object | void,
  data: ?VNodeData,
  context: Component,
  children: ?Array<VNode>,
  tag?: string
): VNode | Array<VNode> | void {
  if (isUndef(Ctor)) {
    return
  }

  const baseCtor = context.$options._base

  // plain options object: turn it into a constructor
  if (isObject(Ctor)) {
    Ctor = baseCtor.extend(Ctor)
  }
  
  // ...

  // async component
  let asyncFactory
  if (isUndef(Ctor.cid)) {
    asyncFactory = Ctor
    Ctor = resolveAsyncComponent(asyncFactory, baseCtor, context)
    if (Ctor === undefined) {
      // return a placeholder node for async component, which is rendered
      // as a comment node but preserves all the raw information for the node.
      // the information will be used for async server-rendering and hydration.
      return createAsyncPlaceholder(
        asyncFactory,
        data,
        context,
        children,
        tag
      )
    }
  }
}
```
没有生成出构造函数所以执行了resolveAsyncComponent方法它定义在`src/core/vdom/helpers/resolve-async-component.js`
```javascript
export function resolveAsyncComponent (
  factory: Function,
  baseCtor: Class<Component>,
  context: Component
): Class<Component> | void {
  if (isTrue(factory.error) && isDef(factory.errorComp)) {
    return factory.errorComp
  }

  if (isDef(factory.resolved)) {
    return factory.resolved
  }

  if (isTrue(factory.loading) && isDef(factory.loadingComp)) {
    return factory.loadingComp
  }

  if (isDef(factory.contexts)) {
    // already pending
    factory.contexts.push(context)
  } else {
    const contexts = factory.contexts = [context]
    let sync = true

    const forceRender = () => {
      for (let i = 0, l = contexts.length; i < l; i++) {
        contexts[i].$forceUpdate()
      }
    }

    const resolve = once((res: Object | Class<Component>) => {
      // cache resolved
      factory.resolved = ensureCtor(res, baseCtor)
      // invoke callbacks only if this is not a synchronous resolve
      // (async resolves are shimmed as synchronous during SSR)
      if (!sync) {
        forceRender()
      }
    })

    const reject = once(reason => {
      process.env.NODE_ENV !== 'production' && warn(
        `Failed to resolve async component: ${String(factory)}` +
        (reason ? `\nReason: ${reason}` : '')
      )
      if (isDef(factory.errorComp)) {
        factory.error = true
        forceRender()
      }
    })

    const res = factory(resolve, reject)

    if (isObject(res)) {
      if (typeof res.then === 'function') {
        // () => Promise
        if (isUndef(factory.resolved)) {
          res.then(resolve, reject)
        }
      } else if (isDef(res.component) && typeof res.component.then === 'function') {
        res.component.then(resolve, reject)

        if (isDef(res.error)) {
          factory.errorComp = ensureCtor(res.error, baseCtor)
        }

        if (isDef(res.loading)) {
          factory.loadingComp = ensureCtor(res.loading, baseCtor)
          if (res.delay === 0) {
            factory.loading = true
          } else {
            setTimeout(() => {
              if (isUndef(factory.resolved) && isUndef(factory.error)) {
                factory.loading = true
                forceRender()
              }
            }, res.delay || 200)
          }
        }

        if (isDef(res.timeout)) {
          setTimeout(() => {
            if (isUndef(factory.resolved)) {
              reject(
                process.env.NODE_ENV !== 'production'
                  ? `timeout (${res.timeout}ms)`
                  : null
              )
            }
          }, res.timeout)
        }
      }
    }

    sync = false
    // return in case resolved synchronously
    return factory.loading
      ? factory.loadingComp
      : factory.resolved
  }
}
```
这个方法同时处理了三种异步组件的创建方式，工厂函数，promise（webpack2.0+版本语法糖），高级异步组件（支持loading组件，最大请求时长，err组件等配置项）首先考虑到多个地方使用同异步组件而不需要多次加载，使用once函数做个了包装 设置了闭包与标志位确认该方法只执行一次；其次ensureCtor方法，为确保能够找到异步组件js定义的组件对象，如果是普通对象直接调用extend方法返回构造函数，最后forceRender方法执行每个异步组件实例身上的$forceUpdate方法，让对应的组件的渲染watcher执行update方法强制视图重新渲染，因为vue的数据驱动视图是根据响应式的，但是在异步组件的加载过程当中没有任何数据发生变化