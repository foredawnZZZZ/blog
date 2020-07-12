## Vue基础
### Vue实例
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

### 实例的生命周期
<img :src="$withBase('/lifecycle.png')" width="500px" alt="图">
