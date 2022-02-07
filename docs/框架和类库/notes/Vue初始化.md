## 目录
```
src
├── compiler        # 编译相关 模板解析成AST等
├── core            # 核心代码 内置组件，全局API，Vue实例化，观察者模式，虚拟DOM，工具函数
├── platforms       # 不同平台的支持 web与weex
├── server          # 服务端渲染 2.0开始支持的 跑在node.js上的
├── sfc             # 借助webpack将.vue 文件解析成js对象
├── shared          # 共享代码???? 公共方法
```

## 构建
源码是基于Rollup构建的，相比webpakc会更轻量；webpack会把所有类型的文件都当作模块，rullup只会处理js文件文件 更适合vue.js
- Runtime Only
  借助webpack的vue-loader把.vue文件编译成js，编译阶段做的，它只包含运行时的 Vue.js 代码体积轻
- Runtime + Compiler
  如果没有做预编译，就不能识别template中的字符串（无法得到render函数）那么这个编译过程会发生运行时，所以需要带有编译器的版本 耗费一些性能

## 入口
Runtime + Compiler构建的vue.js入口：
- `src/platforms/web/entry-runtime-with-compiler.js`
  - web平台相关的入口
  - 重写平台相关的$mount方法
  - 注册Vue.complie()方法，传递一个html字符串转为render函数
- `src/platforms/web/runtime/index.js`
  - 注册平台相关的全局组件与指令（Transition，v-show，v-model）
  - 全局方法（$mount，__ patch __）
- `src/core/index.js`
  - <strong>initGlobalAPI给Vue对象本身添加全局的静态方法</strong>
  - 文件位置`src/core/global-api/index.js`
- `src/core/instance/index.js`
  - 定义构造函数，调用this._init()方法
  - 混入常用的实例成员
  - 通过Function实现的类，把Vue当作参数去传递给其他函数使用，为自己的原型上扩展方法
```javascript
import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

function Vue (options) {
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  this._init(options)
}

initMixin(Vue)
stateMixin(Vue)
eventsMixin(Vue)
lifecycleMixin(Vue)
renderMixin(Vue)

export default Vue
```

## 首次渲染过程
1. newVue()会调用this._init()方法（通过initMixin函数调用添加到原型上）`src\core\instance\init.js`
总体流程：将不同的逻辑拆分成各种单独的函数（事件，数据状态，钩子函数的调用，渲染），主线逻辑清晰，最后判断el选项
是否存在，存在则调用$mount方法把模板渲染成最终的DOM
```javascript
Vue.prototype._init = function (options?: Object) {
   const vm: Component = this
   // a uid
   vm._uid = uid++
   let startTag, endTag
   /* istanbul ignore if */
   if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
     startTag = `vue-perf-start:${vm._uid}`
     endTag = `vue-perf-end:${vm._uid}`
     mark(startTag)
   }
   // a flag to avoid this being observed
   // 如果是 Vue 实例不需要被 observe
   vm._isVue = true
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
   /* istanbul ignore else */
   if (process.env.NODE_ENV !== 'production') {
     initProxy(vm)
   } else {
     vm._renderProxy = vm
   }
   // expose real self
   vm._self = vm
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
   /* istanbul ignore if */
   if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
     vm._name = formatComponentName(vm, false)
     mark(endTag)
     measure(`vue ${vm._name} init`, startTag, endTag)
   }
   // 调用 $mount() 挂载
   if (vm.$options.el) {
     vm.$mount(vm.$options.el)
   }
}
```

2. 实例挂载，`$mount`方法与平台和构建方式相关，`src/platforms/web/entry-runtime-with-compiler.js`
```javascript
// 保留 Vue 实例的 $mount 方法
const mount = Vue.prototype.$mount
Vue.prototype.$mount = function (
  el?: string | Element,
  // 非ssr情况下为 false，ssr 时候为true
  hydrating?: boolean
): Component {
  // 获取 el 对象
  el = el && query(el)

  /* istanbul ignore if */
  // el 不能是 body 或者 html
  if (el === document.body || el === document.documentElement) {
    process.env.NODE_ENV !== 'production' && warn(
      `Do not mount Vue to <html> or <body> - mount to normal elements instead.`
    )
    return this
  }

  const options = this.$options
  // resolve template/el and convert to render function
  // 把 template/el 转换成 render 函数
  if (!options.render) {
    let template = options.template
    // 如果模板存在
    if (template) {
      if (typeof template === 'string') {
        // 如果模板是 id 选择器
        if (template.charAt(0) === '#') {
          // 获取对应的 DOM 对象的 innerHTML
          template = idToTemplate(template)
          /* istanbul ignore if */
          if (process.env.NODE_ENV !== 'production' && !template) {
            warn(
              `Template element not found or is empty: ${options.template}`,
              this
            )
          }
        }
      } else if (template.nodeType) {
        // 如果模板是元素，返回元素的 innerHTML
        template = template.innerHTML
      } else {
        if (process.env.NODE_ENV !== 'production') {
          warn('invalid template option:' + template, this)
        }
        // 否则返回当前实例
        return this
      }
    } else if (el) {
      // 如果没有 template，获取el的 outerHTML 作为模板
      template = getOuterHTML(el)
    }
    if (template) {
      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile')
      }
      // 把 template 转换成 render 函数
      const { render, staticRenderFns } = compileToFunctions(template, {
        outputSourceRange: process.env.NODE_ENV !== 'production',
        shouldDecodeNewlines,
        shouldDecodeNewlinesForHref,
        delimiters: options.delimiters,
        comments: options.comments
      }, this)
      options.render = render
      options.staticRenderFns = staticRenderFns

      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile end')
        measure(`vue ${this._name} compile`, 'compile', 'compile end')
      }
    }
  }
  // 调用 mount 方法，渲染 DOM
  return mount.call(this, el, hydrating)
}
```
纯前端浏览器运行环境下的工作原理,缓存了原型上的`$mount`方法，首先会对`el`进行限制，不能挂载到`body`或者`html`这样的根上，`render`的优先级大于`template`大于`el`的`dom`结构，在`vue2`版本中，所有的组件渲染都是要先转换为`render`方法，无论是`.vue`文件还是`el`，`template`属性，最终都转换为`render`函数 如果没有`render`选项会通过`compileToFunctions`函数转换，最后调用缓存原型上的`$mount`方法 `src\platforms\web\runtime\index.js`
```javascript
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  el = el && inBrowser ? query(el) : undefined
  return mountComponent(this, el, hydrating)
}
```
实际调用`mountComponent`定义在`src\core\instance\lifecycle.js`
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
`mountComponent` 触发`beforemount`钩子，在定义`updateComponent`方法`vm.__render`用来生成虚拟vnode，在实例化一个渲染`watcher` 触发`watcher`内部中的`get`方法在执行`updateComponent`，最终调用`vm._update`更新DOM，`watcher`的作用一个是初始化时候执行回调，一个是vm实例中的数据发生变化的时候执行回调 最后判断`vm.$vnode`表示实例的父vnode为null说明是根实例`vm._isMounted = true`表示挂载完毕，触发`mounted`钩子

3. render函数
`vm.__render`方法定义在`src\core\instance\render.js`，把实例渲染成vnode
```javascript
  Vue.prototype._render = function (): VNode {
    const vm: Component = this
    const { render, _parentVnode } = vm.$options

    if (_parentVnode) {
      vm.$scopedSlots = normalizeScopedSlots(
        _parentVnode.data.scopedSlots,
        vm.$slots,
        vm.$scopedSlots
      )
    }

    // set parent vnode. this allows render functions to have access
    // to the data on the placeholder node.
    vm.$vnode = _parentVnode
    // render self
    let vnode
    try {
      // There's no need to maintain a stack because all render fns are called
      // separately from one another. Nested component's render fns are called
      // when parent component is patched.
      currentRenderingInstance = vm
      // 这里的render 第一个参数是实例的上下文，第二个是用户传递的h函数
      vnode = render.call(vm._renderProxy, vm.$createElement)
    } catch (e) {
      handleError(e, vm, `render`)
      // return error render result,
      // or previous vnode to prevent render error causing blank component
      /* istanbul ignore else */
      if (process.env.NODE_ENV !== 'production' && vm.$options.renderError) {
        try {
          vnode = vm.$options.renderError.call(vm._renderProxy, vm.$createElement, e)
        } catch (e) {
          handleError(e, vm, `renderError`)
          vnode = vm._vnode
        }
      } else {
        vnode = vm._vnode
      }
    } finally {
      currentRenderingInstance = null
    }
    // if the returned array contains only a single node, allow it
    if (Array.isArray(vnode) && vnode.length === 1) {
      vnode = vnode[0]
    }
    // return empty vnode in case the render function errored out
    if (!(vnode instanceof VNode)) {
      if (process.env.NODE_ENV !== 'production' && Array.isArray(vnode)) {
        warn(
          'Multiple root nodes returned from render function. Render function ' +
          'should return a single root node.',
          vm
        )
      }
      vnode = createEmptyVNode()
    }
    // set parent
    vnode.parent = _parentVnode
    return vnode
  }
```
正常编写render函数
```javascript
render (h) {
  // h(tag, data, children)
  // return h('h1', this.msg)
  // return h('h1', { domProps: { innerHTML: this.msg } })
  // return h('h1', { attrs: { id: 'title' } }, this.msg)
  const vnode = h(
    'h1', 
    {
      attrs: { id: 'title' } 
    },
    this.msg
  )
  return vnode
},
```
源码位置 `vnode = render.call(vm._renderProxy, vm.$createElement)`,h函数就是`vm.$createElement`
```javascript
export function initRender (vm: Component) {
  vm._vnode = null // the root of the child tree
  vm._staticTrees = null // v-once cached trees
  const options = vm.$options
  const parentVnode = vm.$vnode = options._parentVnode // the placeholder node in parent tree
  const renderContext = parentVnode && parentVnode.context
  vm.$slots = resolveSlots(options._renderChildren, renderContext)
  vm.$scopedSlots = emptyObject
  // bind the createElement fn to this instance
  // so that we get proper render context inside it.
  // args order: tag, data, children, normalizationType, alwaysNormalize
  // internal version is used by render functions compiled from templates
  // 对编译生成的 render 进行渲染的方法
  vm._c = (a, b, c, d) => createElement(vm, a, b, c, d, false)
  // normalization is always applied for the public version, used in
  // user-written render functions.
  // 对手写 render 函数进行渲染的方法
  vm.$createElement = (a, b, c, d) => createElement(vm, a, b, c, d, true)

  // $attrs & $listeners are exposed for easier HOC creation.
  // they need to be reactive so that HOCs using them are always updated
  const parentData = parentVnode && parentVnode.data

  /* istanbul ignore else */
  if (process.env.NODE_ENV !== 'production') {
    defineReactive(vm, '$attrs', parentData && parentData.attrs || emptyObject, () => {
      !isUpdatingChildComponent && warn(`$attrs is readonly.`, vm)
    }, true)
    defineReactive(vm, '$listeners', options._parentListeners || emptyObject, () => {
      !isUpdatingChildComponent && warn(`$listeners is readonly.`, vm)
    }, true)
  } else {
    defineReactive(vm, '$attrs', parentData && parentData.attrs || emptyObject, null, true)
    defineReactive(vm, '$listeners', options._parentListeners || emptyObject, null, true)
  }
}
```
在`initRender`方法调用的时候定义的，`_c`方法是为编译成render函数使用的，`$createElement`是为用户手写的render函数准备的，内部都调用了`createElement` 该方法定义在`src\core\vdom\create-element.js`他最终会执行 `new VNode()` 返回一个虚拟dom节点

4. 私有的_update方法 它的调用时机一个是首次渲染一个是数据变更，_update方法的作用是将vnode渲染成一个真实的dom,他定义在
`src\core\instance\lifecycle.js`
```javascript
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
这个方法核心就是根据`prevVnode`是否存在来分时机调用`__patch__`方法，这个方法定义在`src\platforms\web\runtime\index.js`,根据是否需要SSR传递函数（noop一般代表空函数） web平台中的patch方法定义在`src\platforms\web\runtime\patch.js`
```javascript
/* @flow */
import * as nodeOps from 'web/runtime/node-ops'
import { createPatchFunction } from 'core/vdom/patch'
import baseModules from 'core/vdom/modules/index'
import platformModules from 'web/runtime/modules/index'

// the directive module should be applied last, after all
// built-in modules have been applied.
const modules = platformModules.concat(baseModules)

export const patch: Function = createPatchFunction({ nodeOps, modules })
```
这个方法调用了`createPatchFunction`的返回值 该方法定义在`src\core\vdom\patch.js` `nodeOps`是一系列的`dom`操作的方法，`modules`是模块的钩子函数 
```javascript
export function createPatchFunction (backend) {
  // ...... 省略一系列辅助函数的定义
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
      // 新的和老的 VNode 都存在，更新
      const isRealElement = isDef(oldVnode.nodeType)
      // 判断参数1是否是真实 DOM，不是真实 DOM
      if (!isRealElement && sameVnode(oldVnode, vnode)) {
        // 更新操作，diff 算法
        // patch existing root node
        patchVnode(oldVnode, vnode, insertedVnodeQueue, null, null, removeOnly)
      } else {
        // 第一个参数是真实 DOM，创建 VNode
        // 初始化
        if (isRealElement) {
          // mounting to a real element
          // check if this is server-rendered content and if we can perform
          // a successful hydration.
          if (oldVnode.nodeType === 1 && oldVnode.hasAttribute(SSR_ATTR)) {
            oldVnode.removeAttribute(SSR_ATTR)
            hydrating = true
          }
          if (isTrue(hydrating)) {
            if (hydrate(oldVnode, vnode, insertedVnodeQueue)) {
              invokeInsertHook(vnode, insertedVnodeQueue, true)
              return oldVnode
            } else if (process.env.NODE_ENV !== 'production') {
              warn(
                'The client-side rendered virtual DOM tree is not matching ' +
                'server-rendered content. This is likely caused by incorrect ' +
                'HTML markup, for example nesting block-level elements inside ' +
                '<p>, or missing <tbody>. Bailing hydration and performing ' +
                'full client-side render.'
              )
            }
          }
          // either not server-rendered, or hydration failed.
          // create an empty node and replace it
          oldVnode = emptyNodeAt(oldVnode)
        }

        // replacing existing element
        const oldElm = oldVnode.elm
        const parentElm = nodeOps.parentNode(oldElm)

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
        )

        // update parent placeholder node element, recursively
        if (isDef(vnode.parent)) {
          let ancestor = vnode.parent
          const patchable = isPatchable(vnode)
          while (ancestor) {
            for (let i = 0; i < cbs.destroy.length; ++i) {
              cbs.destroy[i](ancestor)
            }
            ancestor.elm = vnode.elm
            if (patchable) {
              for (let i = 0; i < cbs.create.length; ++i) {
                cbs.create[i](emptyNode, ancestor)
              }
              // #6513
              // invoke insert hooks that may have been merged by create hooks.
              // e.g. for directives that uses the "inserted" hook.
              const insert = ancestor.data.hook.insert
              if (insert.merged) {
                // start at index 1 to avoid re-invoking component mounted hook
                for (let i = 1; i < insert.fns.length; i++) {
                  insert.fns[i]()
                }
              }
            } else {
              registerRef(ancestor)
            }
            ancestor = ancestor.parent
          }
        }

        // destroy old node
        if (isDef(parentElm)) {
          removeVnodes([oldVnode], 0, 0)
        } else if (isDef(oldVnode.tag)) {
          invokeDestroyHook(oldVnode)
        }
      }
    }

    invokeInsertHook(vnode, insertedVnodeQueue, isInitialPatch)
    return vnode.elm
  }
}
```
最终返回的`patch`方法 通过函数柯里化让参数固定 `oldVnode`是一个真实的dom，当`isRealElement`为`true`时调用`emptyNodeAt`把他转为`vnode`然后在调用`createElm`方法 是其中的一个辅助函数
```javascript
  function createElm (
    vnode,
    insertedVnodeQueue,
    parentElm,
    refElm,
    nested,
    ownerArray,
    index
  ) {
    if (isDef(vnode.elm) && isDef(ownerArray)) {
      // This vnode was used in a previous render!
      // now it's used as a new node, overwriting its elm would cause
      // potential patch errors down the road when it's used as an insertion
      // reference node. Instead, we clone the node on-demand before creating
      // associated DOM element for it.
      vnode = ownerArray[index] = cloneVNode(vnode)
    }

    vnode.isRootInsert = !nested // for transition enter check
    if (createComponent(vnode, insertedVnodeQueue, parentElm, refElm)) {
      return
    }

    const data = vnode.data
    const children = vnode.children
    const tag = vnode.tag
    if (isDef(tag)) {
      if (process.env.NODE_ENV !== 'production') {
        if (data && data.pre) {
          creatingElmInVPre++
        }
        if (isUnknownElement(vnode, creatingElmInVPre)) {
          warn(
            'Unknown custom element: <' + tag + '> - did you ' +
            'register the component correctly? For recursive components, ' +
            'make sure to provide the "name" option.',
            vnode.context
          )
        }
      }

      vnode.elm = vnode.ns
        ? nodeOps.createElementNS(vnode.ns, tag)
        : nodeOps.createElement(tag, vnode)
      setScope(vnode)

      /* istanbul ignore if */
      if (__WEEX__) {
        // in Weex, the default insertion order is parent-first.
        // List items can be optimized to use children-first insertion
        // with append="tree".
        const appendAsTree = isDef(data) && isTrue(data.appendAsTree)
        if (!appendAsTree) {
          if (isDef(data)) {
            invokeCreateHooks(vnode, insertedVnodeQueue)
          }
          insert(parentElm, vnode.elm, refElm)
        }
        createChildren(vnode, children, insertedVnodeQueue)
        if (appendAsTree) {
          if (isDef(data)) {
            invokeCreateHooks(vnode, insertedVnodeQueue)
          }
          insert(parentElm, vnode.elm, refElm)
        }
      } else {
        createChildren(vnode, children, insertedVnodeQueue)
        if (isDef(data)) {
          invokeCreateHooks(vnode, insertedVnodeQueue)
        }
        insert(parentElm, vnode.elm, refElm)
      }

      if (process.env.NODE_ENV !== 'production' && data && data.pre) {
        creatingElmInVPre--
      }
    } else if (isTrue(vnode.isComment)) {
      vnode.elm = nodeOps.createComment(vnode.text)
      insert(parentElm, vnode.elm, refElm)
    } else {
      vnode.elm = nodeOps.createTextNode(vnode.text)
      insert(parentElm, vnode.elm, refElm)
    }
  }
```
`createElm`的作用是将`vnode`创建成一个真实`dom`并插入到他的父元素中，`createChildren`方法来创建子元素
遍历虚拟节点中的子虚拟节点，`insert`方法就是调用原生`DOM`的`API`把`dom`插入到父元素中 首次渲染就是递归创建`dom`树并且插入到`body`的过程 



