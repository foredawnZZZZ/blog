## v-model

`v-model` 可以作用在表单元素上，也可以使用在组件上，本质是一个语法糖，从编译阶段开始进入 `parse`，`v-model` 会被当做指令解析到 `el.directives`，然后再 `codegen` 阶段，执行 `genDate` 时会执行，`genDirectives`,定义在`src\compiler\codegen\index.js`;

```javascript
function genDirectives(el: ASTElement, state: CodegenState): string | void {
 const dirs = el.directives;
 if (!dirs) return;
 let res = "directives:[";
 let hasRuntime = false;
 let i, l, dir, needRuntime;
 for (i = 0, l = dirs.length; i < l; i++) {
  dir = dirs[i];
  needRuntime = true;
  // 指令directives: model text html
  const gen: DirectiveFunction = state.directives[dir.name];
  if (gen) {
   // compile-time directive that manipulates AST.
   // returns true if it also needs a runtime counterpart.
   needRuntime = !!gen(el, dir, state.warn);
  }
  if (needRuntime) {
   hasRuntime = true;
   res += `{name:"${dir.name}",rawName:"${dir.rawName}"${
    dir.value
     ? `,value:(${dir.value}),expression:${JSON.stringify(dir.value)}`
     : ""
   }${dir.arg ? `,arg:${dir.isDynamicArg ? dir.arg : `"${dir.arg}"`}` : ""}${
    dir.modifiers ? `,modifiers:${JSON.stringify(dir.modifiers)}` : ""
   }},`;
  }
 }
 if (hasRuntime) {
  return res.slice(0, -1) + "]";
 }
}
```

`genDirectives` 遍历 `el.directives`，然后获取每个指令对应的方法，`const gen: DirectiveFunction = state.directives[dir.name];`指令实际是实例化 `options` 中的相关配置，在不同平台下配置不同，在 `web` 下定义在 `src\platforms\web\compiler\options.js`

```javascript
export const baseOptions: CompilerOptions = {
 expectHTML: true,
 modules,
 directives,
 isPreTag,
 isUnaryTag,
 mustUseProp,
 canBeLeftOpenTag,
 isReservedTag,
 getTagNamespace,
 staticKeys: genStaticKeys(modules),
};
```

`directives` 定义在 `src\platforms\web\compiler\directives\index.js`

```javascript
import model from "./model";
import text from "./text";
import html from "./html";

export default {
 model,
 text,
 html,
};
```

model 定义在`src\platforms\web\compiler\directives\model.js`
<br />

### 表单元素

```javascript
export default function model(
 el: ASTElement,
 dir: ASTDirective,
 _warn: Function
): ?boolean {
 warn = _warn;
 const value = dir.value;
 const modifiers = dir.modifiers;
 const tag = el.tag;
 const type = el.attrsMap.type;

 if (process.env.NODE_ENV !== "production") {
  // inputs with type="file" are read only and setting the input's
  // value will throw an error.
  if (tag === "input" && type === "file") {
   warn(
    `<${el.tag} v-model="${value}" type="file">:\n` +
     `File inputs are read only. Use a v-on:change listener instead.`,
    el.rawAttrsMap["v-model"]
   );
  }
 }

 if (el.component) {
  genComponentModel(el, value, modifiers);
  // component v-model doesn't need extra runtime
  return false;
 } else if (tag === "select") {
  genSelect(el, value, modifiers);
 } else if (tag === "input" && type === "checkbox") {
  genCheckboxModel(el, value, modifiers);
 } else if (tag === "input" && type === "radio") {
  genRadioModel(el, value, modifiers);
 } else if (tag === "input" || tag === "textarea") {
  genDefaultModel(el, value, modifiers);
 } else if (!config.isReservedTag(tag)) {
  genComponentModel(el, value, modifiers);
  // component v-model doesn't need extra runtime
  return false;
 } else if (process.env.NODE_ENV !== "production") {
  warn(
   `<${el.tag} v-model="${value}">: ` +
    `v-model is not supported on this element type. ` +
    "If you are working with contenteditable, it's recommended to " +
    "wrap a library dedicated for that purpose inside a custom component.",
   el.rawAttrsMap["v-model"]
  );
 }

 // ensure runtime directive metadata
 return true;
}
```

当执行 `needRuntime = !!gen(el, dir, state.warn)`就是在执行 `model` 函数，根据 `AST` 节点的不同情况会执行不同方法
**genDefaultModel**

```javascript
function genDefaultModel(
 el: ASTElement,
 value: string,
 modifiers: ?ASTModifiers
): ?boolean {
 const type = el.attrsMap.type;

 if (process.env.NODE_ENV !== "production") {
  const value = el.attrsMap["v-bind:value"] || el.attrsMap[":value"];
  const typeBinding = el.attrsMap["v-bind:type"] || el.attrsMap[":type"];
  if (value && !typeBinding) {
   const binding = el.attrsMap["v-bind:value"] ? "v-bind:value" : ":value";
   warn(
    `${binding}="${value}" conflicts with v-model on the same element ` +
     "because the latter already expands to a value binding internally",
    el.rawAttrsMap[binding]
   );
  }
 }

 const { lazy, number, trim } = modifiers || {};
 const needCompositionGuard = !lazy && type !== "range";
 const event = lazy ? "change" : type === "range" ? RANGE_TOKEN : "input";

 let valueExpression = "$event.target.value";
 if (trim) {
  valueExpression = `$event.target.value.trim()`;
 }
 if (number) {
  valueExpression = `_n(${valueExpression})`;
 }

 let code = genAssignmentCode(value, valueExpression);
 if (needCompositionGuard) {
  code = `if($event.target.composing)return;${code}`;
 }

 addProp(el, "value", `(${value})`);
 addHandler(el, event, code, null, true);
 if (trim || number) {
  addHandler(el, "blur", "$forceUpdate()");
 }
}
```

`genDefaultModel` 先处理 `modifiers`，它的不同只要影响的是 `event` 和 `valueExpression` 的值，然后去执行 `genAssignmentCode` 生成代码它定义在`src\compiler\directives\model.js`

```javascript
export function genAssignmentCode(value: string, assignment: string): string {
 const res = parseModel(value);
 if (res.key === null) {
  return `${value}=${assignment}`;
 } else {
  return `$set(${res.exp}, ${res.key}, ${assignment})`;
 }
}
```

该方法对 `value` 进行解析，最后得到代码串，比如`xxxx=$event.target.value`，`code` 生成完，在执行 `addProp` 和 `addHandler` 方法，这两个方法是关键，通过修改 `AST` 节点，给 `el` 添加一个 `prop`，相当于动态绑定了 `value`，又给 `el` 添加了事件，相当于给 `el` 注册了 `input` 事件

```html
<input v-bind:value="xxxx" v-on:input="xxxx=$event.target.value" />
```

所以说 v-model 本质就是语法糖，动态绑定 input 的 value 指向一个 xxxx 变量，并触发 input 事件时动态把 xxxx 设置为目标值，就完成双向数据绑定，对于其他表单元素套路一致，生成的代码串会有所不同

### 组件

父组件在子组件引用的地方使用 `v-model`，子组件内部定义一个 `value` 的 `prop`，并且在 `input` 事件的回调中通过 `this.$emit("input",e.target.value)`派发一个事件，这个是组件 `v-model` 生效必须要做的。
在编译阶段最后还会走到 `model` 函数

```javascript
else if (!config.isReservedTag(tag)) {
  genComponentModel(el, value, modifiers)
    // component v-model doesn't need extra runtime
  return false
}
```

`genComponentModel` 函数定义在`src\compiler\directives\model.js`

```javascript
export function genComponentModel(
 el: ASTElement,
 value: string,
 modifiers: ?ASTModifiers
): ?boolean {
 const { number, trim } = modifiers || {};

 const baseValueExpression = "$$v";
 let valueExpression = baseValueExpression;
 if (trim) {
  valueExpression =
   `(typeof ${baseValueExpression} === 'string'` +
   `? ${baseValueExpression}.trim()` +
   `: ${baseValueExpression})`;
 }
 if (number) {
  valueExpression = `_n(${valueExpression})`;
 }
 const assignment = genAssignmentCode(value, valueExpression);

 el.model = {
  value: `(${value})`,
  expression: JSON.stringify(value),
  callback: `function (${baseValueExpression}) {${assignment}}`,
 };
}
```

执行完毕后，生成 `el.model`的值：

```javascript
callback: "function ($$v) {xxx=$$v}";
expression: '"xxx"';
value: "(xxx)";
```

最后回到 `genData` 函数中时：

```javascript
if (el.model) {
 data += `model:{value:${el.model.value},callback:${el.model.callback},expression:${el.model.expression}},`;
}
```

最终编译后生成的 `render`，会在创建子组件 `vnode` 阶段，会执行 `createComponent`

```javascript
export function createComponent(
 Ctor: Class<Component> | Function | Object | void,
 data: ?VNodeData,
 context: Component,
 children: ?Array<VNode>,
 tag?: string
): VNode | Array<VNode> | void {
 if (isUndef(Ctor)) {
  return;
 }
 // ... ...
 // 处理组件上的 v-model
 if (isDef(data.model)) {
  transformModel(Ctor.options, data);
 }
 // ... ...

 const vnode = new VNode(
  `vue-component-${Ctor.cid}${name ? `-${name}` : ""}`,
  data,
  undefined,
  undefined,
  undefined,
  context,
  { Ctor, propsData, listeners, tag, children },
  asyncFactory
 );
 // ... ...

 return vnode;
}
```

其中会对 `model` 进行处理，执行 `transformModel`

```javascript
function transformModel(options, data: any) {
 const prop = (options.model && options.model.prop) || "value";
 const event = (options.model && options.model.event) || "input";
 (data.attrs || (data.attrs = {}))[prop] = data.model.value;
 const on = data.on || (data.on = {});
 const existing = on[event];
 const callback = data.model.callback;
 if (isDef(existing)) {
  if (
   Array.isArray(existing)
    ? existing.indexOf(callback) === -1
    : existing !== callback
  ) {
   on[event] = [callback].concat(existing);
  }
 } else {
  on[event] = callback;
 }
}
```

这个函数的作用是将 `data.prop` 添加 `data.model.value`,并且将 `data.on` 添加 `data.model.callback`，大致如下:

```javascript
data.props = {
 value: message,
};
data.on = {
 input: function ($$v) {
  message = $$v;
 },
};

// 父组件大致编写
let vm = new Vue({
 el: "#app",
 template:
  "<div>" +
  '<child :value="message" @input="message=arguments[0]"></child>' +
  "<p>Message is: {{ message }}</p>" +
  "</div>",
 data() {
  return {
   message: "",
  };
 },
 components: {
  Child,
 },
});
```

子组件传递的 `value` 绑定到父组件的 `message`，同时监听自定义 `input` 事件，当子组件派发 `input` 事件时，父组件会在事件回调函数中修改 `message` 的值，同时 `value` 也会发生改变，更新子组件中的 `input` 的值，典型的父子通讯模式，父组件通过 `prop` 传递子组件值，子组件通过`$emit` 事件通知父组件，所以组件上的 `v-model` 也是一种语法糖。
另外 `transformModel` 中的逻辑关于子组件的 `value prop` 和 `input` 事件名是可以匹配的，也就是说子组件可以通过 `model` 选项配置子组件接收的 `prop` 名以及派发事件名

```javascript
let Child = {
 template:
  "<div>" +
  '<input :value="msg" @input="updateValue" placeholder="edit me">' +
  "</div>",
 props: ["msg"],
 model: {
  prop: "msg",
  event: "change",
 },
 methods: {
  updateValue(e) {
   this.$emit("change", e.target.value);
  },
 },
};
```

在 Vue 中，响应式系统并不是双向数据绑定的，但数据发生变化的时候会通过对数据的改变驱动视图进行更新，而 dom 的改变也会反过来影响数据，是一个双向的关系，Vue 可以使用 `v-model` 进行双向绑定
