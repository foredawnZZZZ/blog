## JavaScript判断类型
#### typeof
适用场景：
 - 判断原始类型时，会返回对应的原始类型（除了`null`）
 - 判断所有的引用类型和`null`时都会返回`object`（除了函数返回`Function`）
```javascript
 typeof [] // object
 typeof {} // object
 typeof new Date() // object
 typeof /^\d*$/; // object
 typeof Math // object
 typeof JSON // object
```
#### instanceof
instanceof操作符主要是判断数据是引用类型的那种
```javascript
[] instanceof Array // true
new Date() instanceof Date // true
new RegExp() instanceof RegExp // true
new RegExp() instanceof RegExp // true
123 instanceof Number //false
new Number(123) instanceof Number //true

//像内置对象就不行 ERROR:（Right-hand side of 'instanceof' is not callable）告诉你右侧不可调用
Math instanceof Math
JSON instanceof JSON
```
**首先要是回顾原型链的规则（就是判断XXX的prototype是否在原型链上，这是它的初衷），另外它也不能检测原始类型，除非是包装类型的创建变量的方式**

#### toString
在拆箱操作中每一个引用类型都会有一个有toString的方法，默认他会被每个object对象继承下来的，如果它
没有被自定义覆盖掉，就会返回`"[object,type]"` type就是它的类型(DOM集合是`"[object NodeList]"`)
<img :src="$withBase('/toString.png')" width="666px" alt="图">

因为它可以被重写像Array和Date，RegExp都重写了toString方法，借助call改变this指向
```javascript
var class2type = {};
jQuery.each( "Boolean Number String Function Array Date RegExp Object Error Symbol".split( " " ),
function( i, name ) {
	class2type[ "[object " + name + "]" ] = name.toLowerCase();
} );

type: function( obj ) {
	if ( obj == null ) {
		return obj + "";
	}
	return typeof obj === "object" || typeof obj === "function" ?
		class2type[Object.prototype.toString.call(obj) ] || "object" :
		typeof obj;
}

isFunction: function( obj ) {
		return jQuery.type(obj) === "function";
}
```