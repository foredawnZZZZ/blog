## Vue组件注册
在vue中组件是可复用的Vue实例，所以他们有`new Vue`相同的选项，hooks，data，computed，watch，methods等，除了el只有根实例的选项

可以将组件任意次数的复用：每一个组件都会独自维护它的数据，每用一次就会有一个新的实例被创建
组件注册：
 - 全局注册，直接通过`Vue.component`来创建组件，这样创建的组件在注册后任何新创建的Vue根实例都可以使用它
 - 局部注册，直接通过js对象来定义组件`var ComponentA = {}`，然后再实例中，`components`中去定义
 - 模块系统中局部注册，`import XXX from XXX`

## data必须是一个函数
一个组件的data选项必须是一个函数，每个实例可以维护一份被返回对象的独立的拷贝以免相互影响

## Prop向子组件传递数据
**传递静态或动态Prop**
 - 如果是直接以属性的方式传递，就是一个静态的值
 - 如果是添加`v-bind`就是再告诉Vue这是js表达式，不是字符串

**单向数据流**
父级prop的更新会向下流动到子组件中，但是反过来不行，防止意外变更父级组件的状态。每次父级组件发生变化时，子组件中所有的prop都将刷新为最新值，也意味着你不该再子组件内部修改prop
 - 这个prop用来传递一个初始值，但是子组件需要将他作为一个本地的prop数据来使用 （可以存放自己的data当中）
 - 这个prop以一种原始值传入需要进行转换。（定义一个计算属性 尤其是数组对象它们时按引用来传入的）

**prop验证**
 - type：单个类型，多个类型用`[]` (它是构造函数)
 - default: 设置默认值,也可以写个函数
 - validator: 具体的匹配校验规则

## 自定义事件
自定义的事件名称必须的一致，不存在大小写转换
自定义v-model中组件内部的input的使用的是model下面的prop而不是v-model，change和model下的event相对应
<!-- <a href="https://codepen.io/foredawnzzzz/pen/gOPjRGj?editors=1011">Vue-Computed实践</a> -->
Vue是异步渲染的，data发生改变之后，dom不会立刻渲染（我一个方法调用修改一万次data全部会整合到一次）this.$nextTick() 会在dom渲染之后被触发，以获取最新的DOM节点
