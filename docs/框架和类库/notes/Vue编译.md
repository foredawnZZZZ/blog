## 编译入口

模板到真实 `DOM` 渲染的过程，中间有一个环节是把模板编译成 `render` 函数，这个过程就称为编译。
`Vue` 提供了 2 个版本一个是 `Runtime + Compiler` 一个是 `Runtime only`，前者包含编译器，在浏览器环境下运行过程中进行编译处理，后者不包含需要借助 `webpack` 中 `vue-loader` 这样的工具在离线时事先完成编译
当使用 `Runtime + Compiler` 的 vue.js 时，他的入口在`src\platforms\web\entry-runtime-with-compiler.js`,这里在`$mount` 函数内部定义中

```javascript
// ... ...
if (template) {
 /* istanbul ignore if */
 if (process.env.NODE_ENV !== "production" && config.performance && mark) {
  mark("compile");
 }
 // 把 template 转换成 render 函数
 const { render, staticRenderFns } = compileToFunctions(
  template,
  {
   outputSourceRange: process.env.NODE_ENV !== "production",
   shouldDecodeNewlines,
   shouldDecodeNewlinesForHref,
   delimiters: options.delimiters,
   comments: options.comments,
  },
  this
 );
 options.render = render;
 options.staticRenderFns = staticRenderFns;

 /* istanbul ignore if */
 if (process.env.NODE_ENV !== "production" && config.performance && mark) {
  mark("compile end");
  measure(`vue ${this._name} compile`, "compile", "compile end");
 }
}
// ... ...
```

编译的入口就是`compileToFunctions`方法，这个方法把 `template` 编译生成 `render` 以及 `staticRenderFns`这个方法定义在`src\platforms\web\compiler\index.js`

```javascript
/* @flow */

import { baseOptions } from "./options";
import { createCompiler } from "compiler/index";

const { compile, compileToFunctions } = createCompiler(baseOptions);

export { compile, compileToFunctions };
```

`compileToFunctions`实际上是`createCompiler`方法的返回值，这个方法接受一个编译配置，它定义在`src\compiler\index.js`

```javascript
export const createCompiler = createCompilerCreator(function baseCompile(
 template: string,
 options: CompilerOptions
): CompiledResult {
 // 把模板转换成 ast 抽象语法树
 // 抽象语法树，用来以树形的方式描述代码结构
 const ast = parse(template.trim(), options);
 if (options.optimize !== false) {
  // 优化抽象语法树
  optimize(ast, options);
 }
 // 把抽象语法树生成字符串形式的 js 代码
 const code = generate(ast, options);
 return {
  ast,
  // 渲染函数
  render: code.render,
  // 静态渲染函数，生成静态 VNode 树
  staticRenderFns: code.staticRenderFns,
 };
});
```

`createCompiler`方法实际是`createCompilerCreator`方法返回的，它定义在`src\compiler\create-compiler.js`，它的参数是一个函数，baseCompile 内部真正执行了编译过程

```javascript
export function createCompilerCreator(baseCompile: Function): Function {
 // baseOptions 平台相关的options
 // src\platforms\web\compiler\options.js 中定义
 return function createCompiler(baseOptions: CompilerOptions) {
  // ... ...

  return {
   compile,
   compileToFunctions: createCompileToFunctionFn(compile),
  };
 };
}
```

这个方法返回一个 `createCompiler` 的函数，他接收到一个 `baseOptions` 的参数，返回了一个对象，一个属性方法，一个 `compileToFunctions` 属性，这个属性就是`$mount` 函数调用的 `compileToFunctions`,它是调用 `createCompileToFunctionFn` 的返回值
这个方法定义在`src\compiler\to-function.js`

```javascript
export function createCompileToFunctionFn(compile: Function): Function {
 const cache = Object.create(null);

 return function compileToFunctions(
  template: string,
  options?: CompilerOptions,
  vm?: Component
 ): CompiledFunctionResult {
  options = extend({}, options);
  const warn = options.warn || baseWarn;
  delete options.warn;

  /* istanbul ignore if */
  if (process.env.NODE_ENV !== "production") {
   // detect possible CSP restriction
   try {
    new Function("return 1");
   } catch (e) {
    if (e.toString().match(/unsafe-eval|CSP/)) {
     warn(
      "It seems you are using the standalone build of Vue.js in an " +
       "environment with Content Security Policy that prohibits unsafe-eval. " +
       "The template compiler cannot work in this environment. Consider " +
       "relaxing the policy to allow unsafe-eval or pre-compiling your " +
       "templates into render functions."
     );
    }
   }
  }

  // check cache
  // 1. 读取缓存中的 CompiledFunctionResult 对象，如果有直接返回
  const key = options.delimiters
   ? String(options.delimiters) + template
   : template;
  if (cache[key]) {
   return cache[key];
  }

  // compile
  // 2. 把模板编译为编译对象(render, staticRenderFns)，字符串形式的js代码
  const compiled = compile(template, options);

  // check compilation errors/tips
  if (process.env.NODE_ENV !== "production") {
   if (compiled.errors && compiled.errors.length) {
    if (options.outputSourceRange) {
     compiled.errors.forEach((e) => {
      warn(
       `Error compiling template:\n\n${e.msg}\n\n` +
        generateCodeFrame(template, e.start, e.end),
       vm
      );
     });
    } else {
     warn(
      `Error compiling template:\n\n${template}\n\n` +
       compiled.errors.map((e) => `- ${e}`).join("\n") +
       "\n",
      vm
     );
    }
   }
   if (compiled.tips && compiled.tips.length) {
    if (options.outputSourceRange) {
     compiled.tips.forEach((e) => tip(e.msg, vm));
    } else {
     compiled.tips.forEach((msg) => tip(msg, vm));
    }
   }
  }

  // turn code into functions
  const res = {};
  const fnGenErrors = [];

  // 3. 把字符串形式的js代码转换成js方法
  res.render = createFunction(compiled.render, fnGenErrors);
  res.staticRenderFns = compiled.staticRenderFns.map((code) => {
   return createFunction(code, fnGenErrors);
  });

  // check function generation errors.
  // this should only happen if there is a bug in the compiler itself.
  // mostly for codegen development use
  /* istanbul ignore if */
  if (process.env.NODE_ENV !== "production") {
   if ((!compiled.errors || !compiled.errors.length) && fnGenErrors.length) {
    warn(
     `Failed to generate render function:\n\n` +
      fnGenErrors
       .map(({ err, code }) => `${err.toString()} in\n\n${code}\n`)
       .join("\n"),
     vm
    );
   }
  }
  // 4. 缓存并返回res对象(render, staticRenderFns方法)
  return (cache[key] = res);
 };
}
```

至此找到 `compileToFunctions` 的最终定义，他接受三个参数，`template 编译模板`，`options 编译配置`，`vm Vue实例`而核心编译过程
`const compiled = compile(template, options);`就这一行

```javascript
function compile(template: string, options?: CompilerOptions): CompiledResult {
 const finalOptions = Object.create(baseOptions);
 const errors = [];
 const tips = [];

 let warn = (msg, range, tip) => {
  (tip ? tips : errors).push(msg);
 };

 if (options) {
  if (process.env.NODE_ENV !== "production" && options.outputSourceRange) {
   // $flow-disable-line
   const leadingSpaceLength = template.match(/^\s*/)[0].length;

   warn = (msg, range, tip) => {
    const data: WarningMessage = { msg };
    if (range) {
     if (range.start != null) {
      data.start = range.start + leadingSpaceLength;
     }
     if (range.end != null) {
      data.end = range.end + leadingSpaceLength;
     }
    }
    (tip ? tips : errors).push(data);
   };
  }
  // merge custom modules
  if (options.modules) {
   finalOptions.modules = (baseOptions.modules || []).concat(options.modules);
  }
  // merge custom directives
  if (options.directives) {
   finalOptions.directives = extend(
    Object.create(baseOptions.directives || null),
    options.directives
   );
  }
  // copy other options
  for (const key in options) {
   if (key !== "modules" && key !== "directives") {
    finalOptions[key] = options[key];
   }
  }
 }

 finalOptions.warn = warn;

 const compiled = baseCompile(template.trim(), finalOptions);
 if (process.env.NODE_ENV !== "production") {
  detectErrors(compiled.ast, warn);
 }
 compiled.errors = errors;
 compiled.tips = tips;
 return compiled;
}
```

compile 函数在执行 createCompileToFunctionFn 的时候作为参数传入，核心编译过程只有一行`const compiled = baseCompile(template, finalOptions)`baseCompile 在执行 createCompilerCreator 方法时作为参数传入，所以最后回到了 createCompiler 方法
之所以这么绕是因为 vue.js 在不同平台下都需要编译，因此编译过程中的编译配置（baseOptions）又有所不同。而编译过程会被多次执行，但这同一个平台下每一次的编译过程配置又是相同的，为了不让这些配置在每次编译过程都通过参数传入，所以利用函数柯里化保留了编译配置。

## parse

编译的首要过程就是通过解析模板，创建 `AST`（抽象语法树）对源代码的抽象语法结构的树状表现形式，（babel，eslint 等）`parse` 函数定义在`src\compiler\parser\index.js`

```javascript
export function parse(
 template: string,
 options: CompilerOptions
): ASTElement | void {
 // ... ...
 parseHTML(template, {
  // 解析过程中的回调函数，生成 AST
  start(tag, attrs, unary, start, end) {// ... ...},
  end(tag, start, end) {// ... ...},
  chars(text: string, start: number, end: number) {// ... ...},
  comment(text: string, start, end) {// ... ...},
 });
 return root;
}
```

`parse` 函数接受 `template` 作为传入的模板，`options` 实际上是和平台相关的配置，它定义在`src\platforms\web\compiler\options.js`，（web 和 weex）

```javascript
warn = options.warn || baseWarn;

platformIsPreTag = options.isPreTag || no;
platformMustUseProp = options.mustUseProp || no;
platformGetTagNamespace = options.getTagNamespace || no;
const isReservedTag = options.isReservedTag || no;
maybeComponent = (el: ASTElement) => !!el.component || !isReservedTag(el.tag);

transforms = pluckModuleFunction(options.modules, "transformNode");
preTransforms = pluckModuleFunction(options.modules, "preTransformNode");
postTransforms = pluckModuleFunction(options.modules, "postTransformNode");

delimiters = options.delimiters;
```

从 `options` 中获取方法和配置后开始进行解析 HTML 模板，`parseHTML(template, options)`这个方法定义`src\compiler\parser\html-parser.js`

```javascript
export function parseHTML(html, options) {
 // ... ...
 let lastTag;
 while (html) {
  if (!lastTag || !isPlainTextElement(lastTag)) {
   let textEnd = html.indexOf("<");
   if (textEnd === 0) {
    if (matchComment) {
     advance(commentLength);
     continue;
    }
    if (matchDoctype) {
     advance(doctypeLength);
     continue;
    }
    if (matchEndTag) {
     advance(endTagLength);
     parseEndTag();
     continue;
    }
    if (matchStartTag) {
     parseStartTag();
     handleStartTag();
     continue;
    }
   }
   handleText();
   advance(textLength);
  } else {
   handlePlainTextElement();
   parseEndTag();
  }
 }

 function advance(n) {
  index += n;
  html = html.substring(n);
 }
}
```

`parseHTML` 的逻辑就是循环解析 `template`，用正则做各种匹配，对于不同情况分别进行不同的处理，直到整个 `template` 解析完利用 `advance` 方法一直前进模板字符串，直到字符串末尾。

```javascript
// 匹配过程中主要用到的正则表达式 包含注释节点，文档类型节点，开始闭合标签
const attribute =
 /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/;
const dynamicArgAttribute =
 /^\s*((?:v-[\w-]+:|@|:|#)\[[^=]+\][^\s"'<>\/=]*)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/;
const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z${unicodeRegExp.source}]*`;
const qnameCapture = `((?:${ncname}\\:)?${ncname})`;
const startTagOpen = new RegExp(`^<${qnameCapture}`);
const startTagClose = /^\s*(\/?)>/;
const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`);
const doctype = /^<!DOCTYPE [^>]+>/i;
const comment = /^<!\--/;
const conditionalComment = /^<!\[/;
```

<!-- 暂时了解到这里吧 看不懂正则并且代码太多了比较晦涩········· -->

## optimize

当模板经过 `parse` 过程后，会生成 `AST` 树，`optimize` 是一个对 `AST` 树进行优化的过程，因为 `Vue` 是数据驱动，但是并不是所有的数据都是响应式的，很多数据经过首次渲染之后，数据不会在发生改变 `dom` 结构也永远不会发生改变，这样可以在 `patch` 过程中跳过对他们的对比;`optimize`方法定义在`src\compiler\optimizer.js`

```javascript
export function optimize(root: ?ASTElement, options: CompilerOptions) {
 if (!root) return;
 isStaticKey = genStaticKeysCached(options.staticKeys || "");
 isPlatformReservedTag = options.isReservedTag || no;
 // first pass: mark all non-static nodes.
 // 标记静态节点
 markStatic(root);
 // second pass: mark static roots.
 // 标记静态根节点
 markStaticRoots(root, false);
}
```

在编译阶段将一些 `AST` 节点转换为静态节点，所以 `optimize` 的过程实际上就是标记静态节点和标记静态根节点。

```javascript
function markStatic(node: ASTNode) {
 // 判断当前 astNode 是否是静态的
 node.static = isStatic(node);
 // 元素节点
 if (node.type === 1) {
  // do not make component slot content static. this avoids
  // 1. components not able to mutate slot nodes
  // 2. static slot content fails for hot-reloading
  // 是组件，不是slot，没有inline-template
  if (
   !isPlatformReservedTag(node.tag) &&
   node.tag !== "slot" &&
   node.attrsMap["inline-template"] == null
  ) {
   return;
  }
  // 遍历 children
  for (let i = 0, l = node.children.length; i < l; i++) {
   const child = node.children[i];
   // 标记静态
   markStatic(child);
   if (!child.static) {
    // 如果有一个 child 不是 static，当前 node 不是static
    node.static = false;
   }
  }
  if (node.ifConditions) {
   for (let i = 1, l = node.ifConditions.length; i < l; i++) {
    const block = node.ifConditions[i].block;
    markStatic(block);
    if (!block.static) {
     node.static = false;
    }
   }
  }
 }
}
function isStatic(node: ASTNode): boolean {
 // 表达式
 if (node.type === 2) {
  // expression
  return false;
 }
 if (node.type === 3) {
  // text
  return true;
 }
 return !!(
  node.pre || // pre
  (!node.hasBindings && // no dynamic bindings
   !node.if &&
   !node.for && // not v-if or v-for or v-else
   !isBuiltInTag(node.tag) && // not a built-in 不能是内置组件
   isPlatformReservedTag(node.tag) && // not a component  不能是组件
   !isDirectChildOfTemplateFor(node) && // 不能是v-for下的直接子节点
   Object.keys(node).every(isStaticKey))
 );
}
```

`isStatic` 函数用于对 `AST` 节点是否需要标记静态做判断，如果是表达式就是非静态，纯文本是静态的；普通元素使用了 `v-pre` 是静态的 `v-if v-for` 等指令并且内置组件和平台保留标签并且不能是 `v-for` 下的直接子节点，满足这些则标记静态节点，对于一个普通元素则遍历他的 `children`，递归执行 `markStatic`，如果有一个节点不是静态的就将整个父节点标记为非静态 `ifConditions？？？？`

```javascript
function markStaticRoots(node: ASTNode, isInFor: boolean) {
 if (node.type === 1) {
  if (node.static || node.once) {
   node.staticInFor = isInFor;
  }
  // For a node to qualify as a static root, it should have children that
  // are not just static text. Otherwise the cost of hoisting out will
  // outweigh the benefits and it's better off to just always render it fresh.
  // 如果一个元素内只有文本节点，此时这个元素不是静态的Root
  // Vue 认为这种优化会带来负面的影响
  if (
   node.static &&
   node.children.length &&
   !(node.children.length === 1 && node.children[0].type === 3)
  ) {
   node.staticRoot = true;
   return;
  } else {
   node.staticRoot = false;
  }
  // 检测当前节点的子节点中是否有静态的Root
  if (node.children) {
   for (let i = 0, l = node.children.length; i < l; i++) {
    markStaticRoots(node.children[i], isInFor || !!node.for);
   }
  }
  if (node.ifConditions) {
   for (let i = 1, l = node.ifConditions.length; i < l; i++) {
    markStaticRoots(node.ifConditions[i].block, isInFor);
   }
  }
 }
}
```

<!-- 如果已经标记为静态节点或者v-once指令的节点， -->

静态根节点的条件是，必须本身就是一个静态节点外，必须满足拥有 `children`，并且 `children` 不能只是一个文本节点（不知道为啥），遍历 `children` 递归调用 `markStaticRoots` `ifConditions？？？？`

## codegen

编译的最后一步就是把优化的 `AST` 树转换为可执行的代码，经过编译后会生成一个 `with` 语句

```javascript
with (this) {
 return isShow
  ? _c(
     "ul",
     {
      staticClass: "list",
      class: bindCls,
     },
     _l(data, function (item, index) {
      return _c(
       "li",
       {
        on: {
         click: function ($event) {
          clickItem(index);
         },
        },
       },
       [_v(_s(item) + ":" + _s(index))]
      );
     })
    )
  : _e();
}
```

其他`_`方法定义在`src\core\instance\render-helpers\index.js`，`_c` 方法定义在`src\core\instance\render.js`

```javascript
vm._c = (a, b, c, d) => createElement(vm, a, b, c, d, false);
export function installRenderHelpers(target: any) {
 target._o = markOnce;
 target._n = toNumber;
 target._s = toString;
 target._l = renderList;
 target._t = renderSlot;
 target._q = looseEqual;
 target._i = looseIndexOf;
 target._m = renderStatic;
 target._f = resolveFilter;
 target._k = checkKeyCodes;
 target._b = bindObjectProps;
 target._v = createTextVNode;
 target._e = createEmptyVNode;
 target._u = resolveScopedSlots;
 target._g = bindObjectListeners;
 target._d = bindDynamicKeys;
 target._p = prependModifier;
}
```

render 代码的生成过程

```javascript
export function generate(
 ast: ASTElement | void,
 options: CompilerOptions
): CodegenResult {
 const state = new CodegenState(options);
 const code = ast ? genElement(ast, state) : '_c("div")';
 return {
  render: `with(this){return ${code}}`,
  staticRenderFns: state.staticRenderFns,
 };
}
```

generate 函数定义在`src\compiler\codegen\index.js`中，先创建一个 CodegenState 的实例，再通过 genElement 方法生成一个 code，然后把 code 用`with(this){return ${code}}`包裹起来，

```javascript
export function genElement(el: ASTElement, state: CodegenState): string {
 if (el.parent) {
  el.pre = el.pre || el.parent.pre;
 }

 if (el.staticRoot && !el.staticProcessed) {
  return genStatic(el, state);
 } else if (el.once && !el.onceProcessed) {
  return genOnce(el, state);
 } else if (el.for && !el.forProcessed) {
  return genFor(el, state);
 } else if (el.if && !el.ifProcessed) {
  return genIf(el, state);
 } else if (el.tag === "template" && !el.slotTarget && !state.pre) {
  return genChildren(el, state) || "void 0";
 } else if (el.tag === "slot") {
  return genSlot(el, state);
 } else {
  // component or element
  let code;
  if (el.component) {
   code = genComponent(el.component, el, state);
  } else {
   let data;
   if (!el.plain || (el.pre && state.maybeComponent(el))) {
    // 生成元素的属性/指令/事件等
    // 处理各种指令，包括 genDirectives（model/text/html）
    data = genData(el, state);
   }

   const children = el.inlineTemplate ? null : genChildren(el, state, true);
   code = `_c('${el.tag}'${
    data ? `,${data}` : "" // data
   }${
    children ? `,${children}` : "" // children
   })`;
  }
  // module transforms
  for (let i = 0; i < state.transforms.length; i++) {
   code = state.transforms[i](el, code);
  }
  return code;
 }
}
```

根据当前 AST 元素节点的属性执行不同的代码生成函数
**genIf**

```javascript
export function genIf(
 el: any,
 state: CodegenState,
 altGen?: Function,
 altEmpty?: string
): string {
 el.ifProcessed = true; // avoid recursion
 return genIfConditions(el.ifConditions.slice(), state, altGen, altEmpty);
}

function genIfConditions(
 conditions: ASTIfConditions,
 state: CodegenState,
 altGen?: Function,
 altEmpty?: string
): string {
 if (!conditions.length) {
  // _e() --> createEmpyVNode()
  return altEmpty || "_e()";
 }

 const condition = conditions.shift();
 if (condition.exp) {
  return `(${condition.exp})?${genTernaryExp(
   condition.block
  )}:${genIfConditions(conditions, state, altGen, altEmpty)}`;
 } else {
  return `${genTernaryExp(condition.block)}`;
 }

 // v-if with v-once should generate code like (a)?_m(0):_m(1)
 function genTernaryExp(el) {
  return altGen
   ? altGen(el, state)
   : el.once
   ? genOnce(el, state)
   : genElement(el, state);
 }
}
```

`genIf` 主要通过 `genIfConditions`，它是依次从 `conditions` 获取第一个 `condition`，然后通过 `condition.exp` 生成一点三元表达式的代码:后是递归调用 `genIfConditions`，如果存在多个 `conditions`，就生成多个三元表达式。genTernaryExp 在不考虑 v-once 的情况下返回 genElement

**genFor**

```javascript
export function genFor(
 el: any,
 state: CodegenState,
 altGen?: Function,
 altHelper?: string
): string {
 const exp = el.for;
 const alias = el.alias;
 const iterator1 = el.iterator1 ? `,${el.iterator1}` : "";
 const iterator2 = el.iterator2 ? `,${el.iterator2}` : "";

 if (
  process.env.NODE_ENV !== "production" &&
  state.maybeComponent(el) &&
  el.tag !== "slot" &&
  el.tag !== "template" &&
  !el.key
 ) {
  state.warn(
   `<${el.tag} v-for="${alias} in ${exp}">: component lists rendered with ` +
    `v-for should have explicit keys. ` +
    `See https://vuejs.org/guide/list.html#key for more info.`,
   el.rawAttrsMap["v-for"],
   true /* tip */
  );
 }

 el.forProcessed = true; // avoid recursion
 return (
  `${altHelper || "_l"}((${exp}),` +
  `function(${alias}${iterator1}${iterator2}){` +
  `return ${(altGen || genElement)(el, state)}` +
  "})"
 );
}
```

genFor 首先获取 AST 元素节点中关于 for 相关的属性，然后返回一个代码字符串

**genData**

```javascript
export function genData(el: ASTElement, state: CodegenState): string {
 let data = "{";

 // directives first.
 // directives may mutate the el's other properties before they are generated.
 const dirs = genDirectives(el, state);
 if (dirs) data += dirs + ",";

 // key
 if (el.key) {
  data += `key:${el.key},`;
 }
 // ref
 if (el.ref) {
  data += `ref:${el.ref},`;
 }
 if (el.refInFor) {
  data += `refInFor:true,`;
 }
 // pre
 if (el.pre) {
  data += `pre:true,`;
 }
 // record original tag name for components using "is" attribute
 if (el.component) {
  data += `tag:"${el.tag}",`;
 }
 // module data generation functions
 for (let i = 0; i < state.dataGenFns.length; i++) {
  data += state.dataGenFns[i](el);
 }
 // attributes
 if (el.attrs) {
  data += `attrs:${genProps(el.attrs)},`;
 }
 // DOM props
 if (el.props) {
  data += `domProps:${genProps(el.props)},`;
 }
 // event handlers
 if (el.events) {
  data += `${genHandlers(el.events, false)},`;
 }
 if (el.nativeEvents) {
  data += `${genHandlers(el.nativeEvents, true)},`;
 }
 // slot target
 // only for non-scoped slots
 if (el.slotTarget && !el.slotScope) {
  data += `slot:${el.slotTarget},`;
 }
 // scoped slots
 if (el.scopedSlots) {
  data += `${genScopedSlots(el, el.scopedSlots, state)},`;
 }
 // component v-model
 if (el.model) {
  data += `model:{value:${el.model.value},callback:${el.model.callback},expression:${el.model.expression}},`;
 }
 // inline-template
 if (el.inlineTemplate) {
  const inlineTemplate = genInlineTemplate(el, state);
  if (inlineTemplate) {
   data += `${inlineTemplate},`;
  }
 }
 data = data.replace(/,$/, "") + "}";
 // v-bind dynamic argument wrap
 // v-bind with dynamic arguments must be applied using the same v-bind object
 // merge helper so that class/style/mustUseProp attrs are handled correctly.
 if (el.dynamicAttrs) {
  data = `_b(${data},"${el.tag}",${genProps(el.dynamicAttrs)})`;
 }
 // v-bind data wrap
 if (el.wrapData) {
  data = el.wrapData(data);
 }
 // v-on data wrap
 if (el.wrapListeners) {
  data = el.wrapListeners(data);
 }
 return data;
}
```

genData 函数就是根据 AST 元素节点的属性构造出一个 data 对象字符串，会在后面创建 vNode 对象时作为参数传入。
**genChildren**

```javascript
export function genChildren(
 el: ASTElement,
 state: CodegenState,
 checkSkip?: boolean,
 altGenElement?: Function,
 altGenNode?: Function
): string | void {
 const children = el.children;
 if (children.length) {
  const el: any = children[0];
  // optimize single v-for
  if (
   children.length === 1 &&
   el.for &&
   el.tag !== "template" &&
   el.tag !== "slot"
  ) {
   const normalizationType = checkSkip
    ? state.maybeComponent(el)
      ? `,1`
      : `,0`
    : ``;
   return `${(altGenElement || genElement)(el, state)}${normalizationType}`;
  }
  const normalizationType = checkSkip
   ? getNormalizationType(children, state.maybeComponent)
   : 0;
  const gen = altGenNode || genNode;
  return `[${children.map((c) => gen(c, state)).join(",")}]${
   normalizationType ? `,${normalizationType}` : ""
  }`;
 }
}
```
