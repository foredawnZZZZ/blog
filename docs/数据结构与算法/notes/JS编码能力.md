## JS编码能力
#### 深拷贝与浅拷贝的区别
深浅拷贝都是针对引用数据类型的，引用类型是按引用传递的，引用相同的话会有副作用。
 - 浅拷贝是只复制对象的第一层属性(Object.assign()和Array.protytype.slice())
 - 深拷贝是对象内部属性层层递归复制

1.判断数据类型
<!-- https://codepen.io/foredawnzzzz/pen/VwedoQO?editors=0012 -->
2.使用内置对象JSON
<!-- https://codepen.io/foredawnzzzz/pen/gOPKVaN?editors=0011 -->
3.递归拷贝