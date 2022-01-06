## Vue Router
路由的作用是根据不同的路径映射不同的视图，vue-router支持`hash` `history`两种模式，提供`router-view`和`router-link`两个全局的组件
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
import Vue from 'vue'
import VueRouter from 'vue-router'
import App from './App'

Vue.use(VueRouter)

// 1. 定义（路由）组件。
// 可以从其他文件 import 进来
const Foo = { template: '<div>foo</div>' }
const Bar = { template: '<div>bar</div>' }

// 2. 定义路由
// 每个路由应该映射一个组件。 其中"component" 可以是 ue.extend() 创建的组件构造器 组件配置对象
const routes = [
  { path: '/foo', component: Foo },
  { path: '/bar', component: Bar }
]

// 3. 创建 router 实例，然后传 `routes` 配置
const router = new VueRouter({
  routes
})

// 4. 创建和挂载根实例。 router 配置参数注入路由,让整个应用都有路由功能
const app = new Vue({
  el: '#app',
  render(h) {
    return h(App)
  },
  router
})

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
