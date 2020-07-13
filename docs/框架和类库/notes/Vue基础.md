# Vue基础
## Vue实例
一个Vue应用通过`new Vue`来创建根实例。一个应用其实就是一颗组件树
```javascript
根实例
└─ TodoList
   ├─ TodoItem
   │  ├─ DeleteTodoButton
   │  └─ EditTodoButton
   └─ TodoListFooter
      ├─ ClearTodosButton
      └─ TodoListStatistics
```
当一个Vue实例被创建时，就可以就将data对象所有的属性加入到Vue响应式系统中（底层自动给你添加getter和setter来和DOM做数据绑定）
切记：只有存于data中的数据才是响应式的，唯一的例外是使用<a href="../../JavaScript基础/notes/ECMA262标准">Object.freeze()</a>

<a href="https://cn.vuejs.org/v2/api/#%E5%AE%9E%E4%BE%8B-property">官方API文档--实例方法</a>

## 实例的生命周期
<img :src="$withBase('/lifecycle.png')" width="500px" alt="图">

hooks就是实例在初始化时,某一时刻自动执行的函数,`this`就指向它的实例(不要把hooks写成箭头函数!)
初始化阶段 --> 挂载模板阶段 --> 运行阶段 --> 销毁阶段
```javascript
beforeCreate() {} //实例初始化后 数据观测和事件配置之前
created() {} // 实例创建完毕了 数据观测和事件配置已完成(发送ajax)
Has 'el' options? 判断是否有el选项 有就继续向下执行 没有就等待实例执行$mount方法
Has 'template' options? 判断是否有template选项 有进入渲染 没有就把el的HTML结构当做模板
beforeMount() {} // 模板挂载之前,render函数首次触发 (模板和数据也尚未结合)
create 实例.$el and replace el width it 虚拟DOM代替真实DOM
mounted() {} // 实例被挂载完 但是他不会保证所有的子组件都会挂载,可以$nextTick保证整个视图渲染完毕 (ref访问)
1.when data changes
beforeUpdate() {} // 虚拟DOM在修改,只能访问现有的DOM
updated() {} // 虚拟DOM修改和渲染完毕 (最好用计算属性和侦听器 他不会保证子组件也一起被重绘如果需要用$nextTick)
2.when 实例.$destroy()
beforeDestroy() {} // 实例销毁之前调用。在这一步，实例仍然完全可用。
拆除所有的watchers和子组件实例,以及事件绑定
destroyed() {} //表示实例完全销毁了

如果涉及到了父子组件
 - 父组件会先进行beforeCreate,created,beforeMount 然后进行子组件的beforeCreate,created,beforeMount,mounted

```
<a href="https://codepen.io/foredawnzzzz/pen/zYrLweO?editors=1011">Vue-hooks实践</a>

## 计算属性与侦听器
如果需要对插值进行大量逻辑操作,会显得模板过重,计算属性写起来像一个方法,但是用起来更像一个属性(不能跟你data里的数据重名),必须需要一个返回值;他具有缓存优势,同样的操作也可定义一个方法,但是一旦响应式的依赖属性发生变化**方法就会重新去执行**,而计算属性不会,他具有缓存的机制

**在开发时:**
 - **计算属性是,别人变了,我跟着变(返回一个新值)**
 - **侦听器是,我观察着别人变,然后我做什么**

<a href="https://codepen.io/foredawnzzzz/pen/gOPjRGj?editors=1011">Vue-Computed实践</a>

## 列表渲染与条件渲染
使用`v-for`来进行一个裂变的渲染,`item in items`其中`items`是源数据数组，而`item`则是被迭代的数组元素的别名。如果是一个对象就用`(value,name,index) in items`其中items是源对象,而`value`是值,`name`是键,`index`是下标
为了追踪每一个节点的身份,必须进提供一个**唯一的key**

通过修数组下标或长度进行添加数组项和修改是无效的 ----- 七个数组的变异方法 push pop unshift shfit splice sort reverse
或者Vue.set方法 **Vue不能检测数组和对象的变化(响应式原理)**

v-show与v-if的区别
 - v-if是真正的条件渲染,在条件内部的组件里的事件监听和子组件都被不断的创建与销毁(直接在DOM树上干掉了) 但是他是惰性的,只有在真值的时候才会去条件渲染
 - v-show,不管条件时什么,他都会渲染(设置display属性)

**在开发时:**
 - **如果想要一个过滤或者排序整合后的数组,在不动原数组的情况下,使用计算属性**
 - **用key去管理可复用的元素,添加key相当于是告诉底层这个两个元素是独立的**
 - **如果v-for与v-if一起使用,v-for的优先级是高于v-if的,每循环一次都回去执行一次v-if,当然如果是想要渲染部分节点,优先级还是重要的**
 - **如果需要频繁切换组件元素就用v-show,如果运行时条件很少去改变就用v-if**
 - **如果v-for作用于组件上,而不希望将item自动注入到组件内部,使得组件与v-for的运作紧密耦合,可以使用`is`**

<a href="https://codepen.io/foredawnzzzz/pen/eYJjEbM?editors=1011">Vue-条件与列表渲染实践</a>

