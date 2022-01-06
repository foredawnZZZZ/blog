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
实际调用`mountComponent`定义在`vue\src\core\instance\lifecycle.js`
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
`mountComponent` 触发`beforemount`钩子，在定义`updateComponent`方法`vm.__render__`用来生成虚拟vnode，在实例化一个渲染`watcher` 触发`watcher`内部中的`get`方法在执行`updateComponent`，最终调用`vm._update`更新DOM，`watcher`的作用一个是初始化时候执行回调，一个是vm实例中的数据发生变化的时候执行回调 最后判断`vm.$vnode`表示实例的父vnode为null说明是根实例`vm._isMounted = true`表示挂载完毕，触发`mounted`钩子