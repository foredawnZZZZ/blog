## 执行上下文

1. 当js执行全局代码时，会编译全局代码并创建全局执行上下文，而且在整个页面的生命周期中，全局执行上下文只有一份
2. 当调用一个函数时，函数体内的代码会被编译，并创建函数执行上下文，一般情况，函数执行结束，创建的函数执行上下文销毁
3. 当使用 eval 函数的时候，eval 的代码也会被编译，并创建执行上下文。

#### 变量提升（预解析）

1. 在执行过程当中，若使用了未声明的变量，那么js执行就会报错
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
       myname -> " foreDawn ", 
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

#### JavaScript如何支持块级作用域的

```javascript
function foo(){
    var a = 1
    let b = 2
    {
      let b = 3
      var c = 4
      let d = 5
      console.log(a)
      console.log(b)
    }
    console.log(b)
    console.log(c)
    console.log(d)
}   
foo()
如果添加了let或者const关键字,就会影响之前创建执行上下文的方式
1.先编译并创建执行上下文
  - 在编译阶段函数内部通过var声明的变量放入到了变量环境中,let声明的放到了词法环境中
  - 函数作用内部的代码块 里面的let声明变量没有放入词法环境中
2.继续执行代码,执行到代码块时,量环境中 a 的值已经被设置成了 1，词法环境中 b 的值已经被设置成了 2,作用域块也被存储到词法环境当中,并且是一个单独的区域 词法环境的内部可以理解成为一个栈的结构,最外面的变量在栈底(值为2的b),当前作用域执行完毕就会弹出 当执行到块内的log(a)时,先沿着词法环境的栈顶向下找,如果在词法中找到就返回如果没找到就去变量环境中找
3.当作用域块执行结束后,内部定义的变量就会从词法环境的栈顶弹出

let myname= 'Fore'
{
  console.log(myname) 
  let myname= 'Dawn'
}
ERROR: Uncaught ReferenceError: Cannot access 'myname' before initialization(初始化之前无法访问)
强调下"暂时性死区":
函数在被调用时被js引擎编译而且也只会被编译一次,此时执行上下文的变量环境与词法环境的数据已经定下来了当
执行词法环境中的作用域块时,let和const声明的变量是被追加进去的,这个块执行结束后,里面的变量也就跟着销毁了
暂时性死区是语法规定,即使是let声明的变量已经存在词法环境当中,但是在没有赋值之前访问,js引擎就会抛出异常
(还是有一个疑惑 let声明变量为什么会是undefined????)
```

## 作用域链与闭包

**词法作用域（函数局部作用域）**就是指作用域由代码中函数声明的位置决定的，所以词法作用域是静态的作用域，通过它就能够预测代码在执行过程中如何查找标识符

```javascript
let count = 1;
function main() {
    let count = 2;
    function bar() {
        let count = 3;
        function foo() {
            let count = 4;
        }
    }
}
词法作用域是根据代码位置决定的，整个词法作用域链的顺序是：foo 函数作用域—>bar 函数作用域—>main 函数作用域—> 全局作用域。
重要的是词法作用域就是在写代码的时候就已经决定好了，和函数怎么调用没有关系
```

#### 闭包

根据词法作用域的规则内部函数访问了外部函数声明的变量,当通过调用一个外部函数返回一个内部函数后,即使外部函数的执行上下文已结束,但是内部函数引用外部函数的变量依然存在内存中,这些变量的集合就是闭包.

```javascript
function foo() {
    var myName = " Fore "
    let test1 = 1
    const test2 = 2
    var innerBar = {
        getName:function(){
            console.log(test1)
            return myName
        },
        setName:function(newName){
            myName = newName
        }
    }
    return innerBar
}
var bar = foo()
bar.setName(" Dawn ")
bar.getName()
console.log(bar.getName())
根据词法作用域的规则,内部函数getName和setName两个函数都访问了外部foo函数内的变量所以当foo函数的返回值给了bar变量后,也就是foo执行完毕,getName和setName方法依然能够访问foo内部test1和myName两个变量,所以当foo函数执行上下文完成后,还是在位置上的是foo函数的closure,换句话说就是执行上下文弹栈了,但是由于getName和setName两个方法访问了函数内部的变量,所以test1和myName还是保存在内存
```

#### 闭包的回收

见V8引擎的垃圾回收机制....

## this指向

在对象内部使用对象内部中的属性是一个非常普遍的需求,最开始js引擎是不支持的,所以出现this机制

this和作用域链式不用的机制,基本没多大联系

#### javascript中的this是什么?

执行上下文包括变量环境,词法环境和外部环境,this四大部分;this是和执行上下文绑定的,也就是说每个执行上下文中都有一个 this 

执行上下文主要分为三种——全局执行上下文、函数执行上下文和 eval 执行上下文，所以对应的 this 也只有这三种——全局执行上下文中的 this、函数中的 this 和 eval 中的 this。 (eval用的比较少)

- 全局执行上下文中的this指向的是window对象
- 函数执行上下文中的this
  - 函数调用模式,指向的是window对象,在全局环境中调用这个函数,内部指向的是window
  - 借用模式,通过call,apply,bind方式修改this指向
  - 对象调用模式,使用对象内部来调用其内部的一个方法,this指向这个对象
  - 构造函数中设置,其实是new操作符改变的 this指向(new的四个步骤)
  - 特殊的this指向1:注册事件中的事件处理函数.this指向的是事件源(那个DOM)
  - 特殊的this指向2:定时器延时器中this指向的window

#### this的缺陷和解决办法

- 嵌套函数中的this不会从外部函数中继承

```javascript
var myObj = {
  name : " foredawn ", 
  showThis: function(){
    console.log(this)
    var _this = this;
    function bar(){console.log(_this)}
    bar()
  }
}
myObj.showThis()
函数 bar 中的 this 指向的是全局 window 对象，而函数 showThis 中的 this 指向的是 myObj 对象

解决办法:
1.在外部函数中声明一个变量去存储this,在内部函数去使用这个变量
2.使用ES6箭头函数,箭头函数不会去创建自己的执行上下文,箭头函数指向取决于外部函数
```

- 普通函数中的this默认指向全局对象window

因为在实际工作中，我们并不希望函数执行上下文中的 this 默认指向全局对象，因为这样会打破数据的边界，造成一些误操作。如果要让函数执行上下文中的 this 指向某个对象，最好的方式是通过 call 方法来显示调用。

这个问题可以通过设置 JavaScript 的“严格模式”来解决。在严格模式下，默认执行一个函数，其函数的执行上下文中的 this 值是 undefined，这就解决上面的问题了。