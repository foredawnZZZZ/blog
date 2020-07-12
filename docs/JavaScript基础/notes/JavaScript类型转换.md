## JavaScript类型转换

因为js是门弱类型语言,类型转换非常频繁,装箱和拆箱的过程就是转换过程
 - **隐式转换**:就是js引擎给你在后台做的转换
 - **强制转换**:就是自己手动进行类型转换

<img :src="$withBase('/类型转换.jpg')" width="666px" alt="图">

#### if语句和逻辑语句
在if语句和逻辑语句中，如果只有单个变量，会先将变量转为Boolean
```javascript
null,undefined,0,"",false //其余的都是true
```

#### 各种数学运算符
非Number类型的运算，会先将非Number转为Number类型
加法运算符（+）特殊：
 - 当一侧为number，另一侧为原始类型，则将原始类型转为number
 - 当一侧为number，另一侧为引用类型，则将引用类型转和number转为字符串进行拼接
 - 当一侧为string，被识别字符串拼接

#### ==运算符
 - NaN和任何类型作比较都是false（包括自己）
 - Boolean和其他类型比较会被转为Number
 - String和Number相比较，就是值的比较（string转化number）
 - null和undefined，和任何相比都是false，他们俩自己相比是true
 - 原始类型和引用类型相比，引用类型会先转化为原始类型
```javascript
  '[object Object]' == {} // true
  '1,2,3' == [1, 2, 3] // true
   [] == ![] // true
   [null] == false // true
   [undefined] == false // true

//!非运算符的优先级会高于== 会先进行转换，然后布尔在去转number；
//数组元素为null和undefined时，该元素被当做空字符串处理，就是0；
//一般判断就用===
```