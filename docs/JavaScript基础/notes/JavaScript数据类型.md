## JavaScript 数据类型

ECMA262 规定了 8 种数据结构,把这 7 种数据分为两种:原始类型和引用类型
原始类型:
 - `Null`:空对象
 - `Undefined`:变量初始化的值
 - `Boolean`:布尔值
 - `Number`: 整数与浮点数
 - `String`: 文本值字符串
 - `Symbol`: 一种实例,唯一的数据类型
 - `BigInt`: (ES10)比number支持更大的整数值
 - `Object`: 除了常用的object,`Array`和`Function`都是特殊对象

**原始类型具有`不可变性`,引用类型不具有,比如数组就有很多方法修改自己本身**
**原始类型进行比较时==比较值,===比较类型 引用类型之间的比较无论是的==还是===比较的都是引用地址**
```javascript
 // 不可变性就是说其他所有的方法操作都不会修改他(赋值是相当于给了个新的值覆盖原有的值),只会返回一个新的结果
 var str = "foreDawn";
 str.length = 0;
 str.substr(1);
 console.log(str) // foredawn

 var arr = [1,2,3,4];
 arr.length = 0; // []
 arr.pop() // [1,2,3]
```

#### 引用类型和包装类型
实际开发中,还可以使用很多引用类型,他们并不是Object构造的,而是他们的原型链的终点都是Object
 - `Array`
 - `Function`
 - `Date`
 - `RegExp`

包装类型是为了操作基本类型值准备的,提供三个特殊引用
 - `Boolean`
 - `Number`
 - `String`
```javascript
true === new Boolean(true); // false
123 === new Number(123); // false
'ForeDawn' === new String('ForeDawn'); // false
console.log(typeof new String('ForeDawn')); // object
console.log(typeof 'ForeDawn'); // string
```
**基本类型和包装类型的区别就是生命周期,new操作符创建的实例,会始终保存在内存中**
**基本类型在执行完成时,会被立即销毁,也就是运行后不能够给他添加属性和方法**
```javascript
var name1 = 'ForeDawn'
name1.color = 'red';
console.log(name1.color);//undefined
var name2 = new String('ForeDawn')
name2.color = 'red'
console.log(name2.color)//red
```

#### 装箱和拆箱
 - 装箱: 把基本类型转换为对应的包装类型
 - 拆箱: 把引用类型转换为基本类型
前面证明原始类型不能扩展属性和方法，那是如何使用原始类型调用方法的呢？
每操作一个基础类型js引擎就会自动创建一个包装类型,让我们去调用一些属性和方法
```javascript
var name = "ForeDawn";
var name2 = name.substring(2);
// 创建一个String的包装类型实例,在实例上调用substring方法,销毁实例
```
整个拆箱过程中如果是Number就调用valueOf是String就调用toString

#### 特殊对象
 - 宿主对象（指运行环境下的：操作系统，浏览器BOM,DOM）ECMA262未通过创建的
 - 内置对象 个人理解就是能被new的和不能被new的
 - Math对象 是一个内置对象 不是函数式对象（理解就是不能new）只能操作Number类型的BigInt不可以
 - JSON MDN定义他就是一个语法
 - Global （encodeURI，parenInt，eval（））