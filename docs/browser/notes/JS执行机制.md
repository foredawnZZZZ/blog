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

#### 函数调用

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

#### 栈

一条单车道中的单行线，一端被堵住了，而另一边入口没有提示信息，堵住之后后进去的车辆先出来，这时这个堵住的单车道就是一个栈容器，车子开进入的操作就是入栈，倒出去就是出栈。特点就是**后进先出**

#### js的调用栈

js引擎就是利用栈的结构来管理执行上下文，在执行上下文创建好后，js引擎就会将执行上下文压入栈中，叫做调用栈

```javascript
var a = 2
function add(b,c){
  console.trace() //可以顺便打印出call stack的内容
  return b+c
}
function addAll(b,c){
var d = 10
result = add(b,c)
return  a+result+d
}
addAll(3,6)

整个代码的一个执行流程：
  - 创建全局的执行上下文，并将其压入栈的底部 之后开始执行全局可执行代码，先执行a = 2的赋值 修改了a的内容
  - 接下来开始调用addAll函数 js引擎会编译该函数，并为其创建一个函数执行上下文，压入栈中，然后开始执行里面的
    可执行的代码 将d赋值成了10
  - 当执行到add函数调用时，会为他也创建一个函数执行上下文并压入栈中 当add函数的return语句执行时就弹栈了，并把
    返回值给了result
  - 紧接addAll函数执行了最后一个return语句后，addAll函数也会弹栈，之后就只有全局执行上下文了。
```

从上可以看出：调用栈就是js引擎追踪函数执行的一个机制，当一次有多个函数被调用时，通过调用栈就能够追踪到哪个函数正在被执行以及各个函数之间的调用关系

- 栈是有容量限制的，超出最大数量就会出现栈溢出（递归函数如果没有一个出口的话就会栈溢出）
- 每调用一个函数，js引擎就会为他创建一个执行上下文，然后执行函数体中可执行的代码
- 但函数体内的代码执行完毕时，就会弹出栈



## 块级作用域

由于js存在预解析这种特性，从而导致了很多与直觉不符的代码（变量污染）也算是一个语言的设计缺陷，ES6已经引入了关键字let和const创建块级作用域来去避开这种缺陷，但是由于js需要保持向下兼容。所以两套体制运行在一个系统里（var和letconst）

- 全局作用域中的对象在代码中的任何地方都能访问，其生命周期伴随着页面的生命周期
- 函数作用域就是在函数内部定义的变量和函数，并且定义的变量和函数只能在函数内部被访问。函数执行结束后，函数内部定义的变量会被销毁

```javascript
//if 块
if(1){}
 
//while 块
while(1){}
 
// 函数块
function foo(){
 
//for 循环块
for(let i = 0; i<100; i++){}
 
// 单独一个块
{}
    
据说初设计这门语言的时候，并没有想到 JavaScript 会火起来，所以只是按照最简单的方式来设计。没有了块级作用域，再把作用域内部的变量统一提升无疑是最快速、最简单的设计，不过这也直接导致了函数中的变量无论是在哪里声明的，在编译阶段都会被提取到执行上下文的变量环境中，所以这些变量在整个函数体内部的任何地方都是能被访问的，这也就是 JavaScript 中的变量提升。
```

#### 变量提升所带来的问题

- 变量容易在不被察觉的情况下被覆盖掉

```js
var myname = " Fore "
function showName(){
  console.log(myname);
  if(0){
   var myname = " Dawm "
  }
  console.log(myname);
}
showName()

先使用函数执行上下文里面的变量，js会优先从当前的执行上下文中查找变量，由于存在预解析，当前执行上下文就包含了myname值为undefined
如果存在块级作用域那么log的可能就是全局变量了
```

- 本应该被销毁的变量没有被销毁

```javascript
function foo(){
  for (var i = 0; i < 7; i++) {
  }
  console.log(i); 
}
foo()
在创建foo函数执行上下文时 变量就已经被提升了所以当for结束后log出结果为7
如果存在块级作用域for循环之后i就应该已经被销毁了
```

#### ES6中如何解决变量提升所带来的缺陷

```javascript
function varTest() {
  var x = 1;
  if (true) {
    var x = 2;  // 同样的变量!
    console.log(x);  // 2
  }
  console.log(x);  // 2
}
varTest函数执行上下文最终在变量环境内只会有一个属性x

function letTest() {
  let x = 1;
  if (true) {
    let x = 2;  // 不同的变量
    console.log(x);  // 2
  }
  console.log(x);  // 1
}

let关键字支持块级作用域的，所以在编译阶段，js引擎不会把if块中变量放到变量环境中（放到词法环境了）这样作用块内声明的变量就不会影响到外面的变量了
```

