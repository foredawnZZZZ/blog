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

compile 函数在执行 createCompileToFunctionFn 的时候作为参数传入，核心编译过程只有一行`const compiled = baseCompile(template, finalOptions)`baseCompile 在执行 createCompilerCreator 方法时作为参数传入，所以最后回到了createCompiler方法
之所以这么绕是因为vue.js在不同平台下都需要编译，因此编译过程中的编译配置（baseOptions）又有所不同。而编译过程会被多次执行，但这同一个平台下每一次的编译过程配置又是相同的，为了不让这些配置在每次编译过程都通过参数传入，所以利用函数柯里化保留了编译配置。
