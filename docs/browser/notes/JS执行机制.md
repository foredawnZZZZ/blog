## 执行上下文

1. 当js执行全局代码时，会编译全局代码并创建全局执行上下文，而且在整个页面的生命周期中，全局执行上下文只有一份（**变量环境**）
2. 当调用一个函数时，函数体内的代码会被编译，并创建函数执行上下文，一般情况，函数执行结束，创建的函数执行上下文销毁（**词法环境**）
3. 当使用 eval 函数的时候，eval 的代码也会被编译，并创建执行上下文。

#### 变量提升（预解析）

1. 在执行过程当中，若使用了为声明的变量，那么js执行就会报错
2. 在一个变量定义之前去使用它，不会出错，但是该变量会为undefind，而不是定义时的值
3. 在一个函数定义之前使用它，不会出错，而且函数也会正常执行

**所谓的变量提升，是指在 JavaScript 代码执行过程中，JavaScript 引擎把变量的声明部分和函数的声明部分提升到代码开头的“行为”。变量被提升后，会给变量设置默认值，这个默认值就是我们熟悉的 undefined。**

```javascript
var a = b = c = 10; 相当于var一个a其他是隐式全局变量
showName()
console.log(myname)
var myname = 'foreDawn'
function showName() {
    console.log('函数 showName 被执行');
}

执行结果 函数 showName 被执行 和undefined
如果删除第三行对myname的声明
js引擎就会抛出error

第三行相当于 var myname; myname = "foreDawn";
第四行相当于 function showName = function () { console.log('函数 showName 被执行'); };
如果时函数表达式 var showName = function () { console.log('函数 showName 被执行'); };
相当于 var showName = undefined; showName = function () { console.log('函数 showName 被执行'); };

预解析后：
/*
* 变量提升部分
*/
// 把变量 myname 提升到开头，
// 同时给 myname 赋值为 undefined
var myname = undefined
// 把函数 showName 提升到开头
function showName() {
    console.log('showName 被调用');
}
 
/*
* 可执行代码部分
*/
showName()
console.log(myname)
// 去掉 var 声明部分，保留赋值语句
myname = 'foreDawn'
```

#### JS代码的执行流程

**实际上变量和函数声明在代码里的位置是不会改变的，而且是在编译阶段被 JavaScript 引擎放入内存中**。也就是js代码在执行之前需要被js引擎编译，编译完成之后，才会进入执行阶段。（一段js代码 ----》 编译阶段 ----》 执行阶段）

**编译阶段**（编译阶段其实就是把代码生成两部分内容：执行上下文和可执行代码）

```javascript
/*变量提升部分的代码*/
var myname = undefined
function showName() {
    console.log('函数 showName 被执行');
}
/*执行部分的代码*/
showName()
console.log(myname)
myname = 'foreDawn'

在执行上下文中存在一个变量环境的对象，该对象中保存了变量提升的内容
VariableEnvironment:
     myname -> undefined, 
     showName ->function : {console.log(myname)
```

如何生成变量环境对象

- 如果不是声明操作，j引擎不会做处理
- 发现声明操作，js引擎在环境对象中创建一个名为myname的属性，并对它进行初始化
- 发现一个function定义的函数，将函数定义储存在**堆**里，并在环境对象里创建一个showName的属性然后指向**堆**中函数的位置

**执行阶段**

- 当执行到showName时，js引擎开始在变量环境对象中查找该函数，由于存在函数引用，所以直接执行并且输出结果

- 接下来打印myName信息，js引擎继续在变量环境对象中查找 由于存在并且值为undefined，所以输出undefined

- 接下来就是把foredawn字符串赋值给myName 执行后变量环境中的myName就变为foredawn

  ```javascript
  VariableEnvironment:
       myname -> " 极客时间 ", 
       showName ->function : {console.log(myname)
  ```

#### 代码中出现相同的变量或者函数怎么办？

- **首先是编译阶段**。遇到第一个相同的函数名，会将该函数体放在变量环境中，遇到第二个相同函数名的函数时，会继续存放，但是变量环境已经存在一个相同的函数名了，**第二个 showName 函数会将第一个 showName 函数覆盖掉**。这样变量环境中就只存在第二个 showName 函数了。
- **执行阶段**。先执行第一个函数，去变量环境查找，而只保存了第二个函数，所以调用的时第二个函数，第二次执行还是走同样的流程
- **一段代码如果定义了两个相同名字的函数，那么最终生效的是最后一个函数**。

<u>预解析其实就是js引擎在执行代码之前所要去做的编译阶段，而之所以需要实现变量提升，是因为 JavaScript 代码在执行之前需要先**编译；在**编译阶段**，变量和函数会被存放到**变量环境**中，变量的默认值会被设置为 undefined；在代码**执行阶段，JavaScript 引擎会从变量环境中去查找自定义的变量和函数。</u>



## 调用栈

调用栈就是管理函数调用关系的数据结构。（函数调用和栈结构）

- **函数调用**

```javascript
var a = 2
function add(){
var b = 10
return  a+b
}
add()
创建了全局执行上下文 包含声明的函数和变量；
执行上下文准备好之后，开始执行全局代码，执行到add时，js判断是函数调用
  - 首先从全局执行上下文中，取出add函数代码。
  - 其次，对add函数进行编译，创建函数的执行上下文。和可执行代码
  - 最后输出结果
```

- **栈**