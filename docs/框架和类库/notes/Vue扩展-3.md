## slot

开发组件库过程中，为了组件灵活可定制，使用插槽方式让用户自定义内容。插槽分为普通插槽和作用域插槽。

### 普通插槽

编译是发生在调用`$mount` 时期，所以编译的顺序是先父后子，在 `parse` 阶段，会执行 `processSlotContent` 与 `processSlotOutlet` 当解析到 `slot` 属性时，会给对应的 `AST` 节点添加 `slotTarget` 属性，

```javascript
function processSlotContent(el) {
 const slotTarget = getBindingAttr(el, "slot");
 if (slotTarget) {
  el.slotTarget = slotTarget === '""' ? '"default"' : slotTarget;
  el.slotTargetDynamic = !!(el.attrsMap[":slot"] || el.attrsMap["v-bind:slot"]);
  // preserve slot as an attribute for native shadow DOM compat
  // only for non-scoped slots.
  if (el.tag !== "template" && !el.slotScope) {
   addAttr(el, "slot", slotTarget, getRawBindingAttr(el, "slot"));
  }
 }
}
```

然后再 `codegen` 阶段在 `genData` 会处理 `slotTarget`,会给 `data` 添加一个 `slot` 属性并指向 `slotTarget`

```javascript
if (el.slotTarget && !el.slotScope) {
 data += `slot:${el.slotTarget},`;
}
```

接下来会编译子组件，在 `parse` 阶段执行 `processSlotContent` 与 `processSlotOutlet`，当遇到 `slot` 标签时会给对应的 `AST` 节点添加 `slotName` 属性

```javascript
function processSlotOutlet(el) {
 if (el.tag === "slot") {
  el.slotName = getBindingAttr(el, "name");
  if (process.env.NODE_ENV !== "production" && el.key) {
   warn(
    `\`key\` does not work on <slot> because slots are abstract outlets ` +
     `and can possibly expand into multiple elements. ` +
     `Use the key on a wrapping element instead.`,
    getRawBindingAttr(el, "key")
   );
  }
 }
}
```

然后再 `codegen` 阶段，会判断如果当前是 `AST` 节点是 `slot` 标签，则执行 `genSlot` 函数定义在`src\compiler\codegen\index.js`

```javascript
function genSlot(el: ASTElement, state: CodegenState): string {
 const slotName = el.slotName || '"default"';
 const children = genChildren(el, state);
 let res = `_t(${slotName}${children ? `,${children}` : ""}`;
 const attrs =
  el.attrs || el.dynamicAttrs
   ? genProps(
      (el.attrs || []).concat(el.dynamicAttrs || []).map((attr) => ({
       // slot props are camelized
       name: camelize(attr.name),
       value: attr.value,
       dynamic: attr.dynamic,
      }))
     )
   : null;
 const bind = el.attrsMap["v-bind"];
 if ((attrs || bind) && !children) {
  res += `,null`;
 }
 if (attrs) {
  res += `,${attrs}`;
 }
 if (bind) {
  res += `${attrs ? "" : ",null"},${bind}`;
 }
 return res + ")";
}
```

这里的 `slotName` 从 AST 节点对应的属性上获取，而 `children` 是 slot 标签开始和闭合总的内容`let res = _t(${slotName}${children ? ,${children} : ''}`中的`_t` 函数就是 `randerSlot` 方法定义在`src\core\instance\render-helpers\render-slot.js`

```javascript
export function renderSlot(
 name: string,
 fallback: ?Array<VNode>,
 props: ?Object,
 bindObject: ?Object
): ?Array<VNode> {
 const scopedSlotFn = this.$scopedSlots[name];
 let nodes;
 if (scopedSlotFn) {
  // scoped slot
  props = props || {};
  if (bindObject) {
   if (process.env.NODE_ENV !== "production" && !isObject(bindObject)) {
    warn("slot v-bind without argument expects an Object", this);
   }
   props = extend(extend({}, bindObject), props);
  }
  nodes = scopedSlotFn(props) || fallback;
 } else {
  nodes = this.$slots[name] || fallback;
 }

 const target = props && props.slot;
 if (target) {
  return this.$createElement("template", { slot: target }, nodes);
 } else {
  return nodes;
 }
}
```

如果 `this.$slots[name]`有值，就会返回它对应的 `vnode` 数组，否则返回 `fallback`，因为子组件的 `init` 时机是在父组件的 `patch` 的过程中开始的，那么这个时候父组件的编译阶段已经完成。在子组件的 `init` 过程会执行 `initRender`，在此获取到 `vm.$slot`，代码定义在`src\core\instance\render.js`

```javascript
export function initRender(vm: Component) {
 // ... ...

 const options = vm.$options;
 const parentVnode = (vm.$vnode = options._parentVnode); // the placeholder node in parent tree
 const renderContext = parentVnode && parentVnode.context;
 vm.$slots = resolveSlots(options._renderChildren, renderContext);

 // ... ...
}
```

`vm.$slot` 是通过执行 `resolveSlots` 返回的，定义在`src\core\instance\render-helpers\resolve-slots.js`

```javascript
export function resolveSlots(
 children: ?Array<VNode>,
 context: ?Component
): { [key: string]: Array<VNode> } {
 if (!children || !children.length) {
  return {};
 }
 const slots = {};
 for (let i = 0, l = children.length; i < l; i++) {
  const child = children[i];
  const data = child.data;
  // remove slot attribute if the node is resolved as a Vue slot node
  if (data && data.attrs && data.attrs.slot) {
   delete data.attrs.slot;
  }
  // named slots should only be respected if the vnode was rendered in the
  // same context.
  if (
   (child.context === context || child.fnContext === context) &&
   data &&
   data.slot != null
  ) {
   const name = data.slot;
   const slot = slots[name] || (slots[name] = []);
   if (child.tag === "template") {
    slot.push.apply(slot, child.children || []);
   } else {
    slot.push(child);
   }
  } else {
   (slots.default || (slots.default = [])).push(child);
  }
 }
 // ignore slots that contains only whitespace
 for (const name in slots) {
  if (slots[name].every(isWhitespace)) {
   delete slots[name];
  }
 }
 return slots;
}

function isWhitespace(node: VNode): boolean {
 return (node.isComment && !node.asyncFactory) || node.text === " ";
}
```

`resolveSlots` 方法接收两个参数，一个是 `children` 对应父 `vnode` 的 `children`（包裹的内容），第二个参数 `context` 是父 `vnode` 的上下文对应父组件 `vm` 的实例，它的逻辑是遍历 `children`，拿到每一个 `child` 中的 `data`，然后通过 `data.slot` 获取插槽的名称，这个 `slot` 就是之前编译父组件在 `codegen` 阶段设置的 `data.slot`,接着将插槽名称作为 `key`，对应的 `vnode` 对象作为 `value` 添加到常量 `slots` 中，回到 `renderSlot` 函数中，就可以根据插槽名称拿到对应的 `vnode` 数组，因为数组中的 `vnode` 都是在父组件时期创造的，这样就能实现在父组件中替换子组件插槽内容,在普通插槽中，父组件应用到子组件插槽里的数据都是绑定到父组件，因为它渲染成 `vnode` 的时机的上下文是父组件的实例。

### 作用域插槽

与普通插槽相比子组件 `slot` 标签上可以定义一些属性以及动态属性，父组件实现插槽部分需要 `template` 标签并且添加 `slot-scope` 属性。
同样在编译中的 `parse` 阶段，会执行 `processSlotContent` 与 `processSlotOutlet`

```javascript
function processSlotContent(el) {
 let slotScope;
 if (el.tag === "template") {
  slotScope = getAndRemoveAttr(el, "scope");
  /* istanbul ignore if */
  if (process.env.NODE_ENV !== "production" && slotScope) {
   warn(
    `the "scope" attribute for scoped slots have been deprecated and ` +
     `replaced by "slot-scope" since 2.5. The new "slot-scope" attribute ` +
     `can also be used on plain elements in addition to <template> to ` +
     `denote scoped slots.`,
    el.rawAttrsMap["scope"],
    true
   );
  }
  el.slotScope = slotScope || getAndRemoveAttr(el, "slot-scope");
 } else if ((slotScope = getAndRemoveAttr(el, "slot-scope"))) {
  /* istanbul ignore if */
  if (process.env.NODE_ENV !== "production" && el.attrsMap["v-for"]) {
   warn(
    `Ambiguous combined usage of slot-scope and v-for on <${el.tag}> ` +
     `(v-for takes higher priority). Use a wrapper <template> for the ` +
     `scoped slot to make it clearer.`,
    el.rawAttrsMap["slot-scope"],
    true
   );
  }
  el.slotScope = slotScope;
 }
 // ... ...
}
```

读取 `slot-scope` 属性并且赋值给 `AST` 节点的 `slotScope` 属性，在 `codegen` 阶段，对于用于此属性的 `el`，调用 `genScopedSlots` 定义在
`src\compiler\codegen\index.js`

```javascript
if (el.scopedSlots) {
 data += `${genScopedSlots(el, el.scopedSlots, state)},`;
}

function genScopedSlots(
 el: ASTElement,
 slots: { [key: string]: ASTElement },
 state: CodegenState
): string {
 // by default scoped slots are considered "stable", this allows child
 // components with only scoped slots to skip forced updates from parent.
 // but in some cases we have to bail-out of this optimization
 // for example if the slot contains dynamic names, has v-if or v-for on them...
 let needsForceUpdate =
  el.for ||
  Object.keys(slots).some((key) => {
   const slot = slots[key];
   return (
    slot.slotTargetDynamic || slot.if || slot.for || containsSlotChild(slot) // is passing down slot from parent which may be dynamic
   );
  });

 // #9534: if a component with scoped slots is inside a conditional branch,
 // it's possible for the same component to be reused but with different
 // compiled slot content. To avoid that, we generate a unique key based on
 // the generated code of all the slot contents.
 let needsKey = !!el.if;

 // OR when it is inside another scoped slot or v-for (the reactivity may be
 // disconnected due to the intermediate scope variable)
 // #9438, #9506
 // TODO: this can be further optimized by properly analyzing in-scope bindings
 // and skip force updating ones that do not actually use scope variables.
 if (!needsForceUpdate) {
  let parent = el.parent;
  while (parent) {
   if (
    (parent.slotScope && parent.slotScope !== emptySlotScopeToken) ||
    parent.for
   ) {
    needsForceUpdate = true;
    break;
   }
   if (parent.if) {
    needsKey = true;
   }
   parent = parent.parent;
  }
 }

 const generatedSlots = Object.keys(slots)
  .map((key) => genScopedSlot(slots[key], state))
  .join(",");

 return `scopedSlots:_u([${generatedSlots}]${
  needsForceUpdate ? `,null,true` : ``
 }${
  !needsForceUpdate && needsKey ? `,null,false,${hash(generatedSlots)}` : ``
 })`;
}

function genScopedSlot(el: ASTElement, state: CodegenState): string {
 const isLegacySyntax = el.attrsMap["slot-scope"];
 if (el.if && !el.ifProcessed && !isLegacySyntax) {
  return genIf(el, state, genScopedSlot, `null`);
 }
 if (el.for && !el.forProcessed) {
  return genFor(el, state, genScopedSlot);
 }
 const slotScope =
  el.slotScope === emptySlotScopeToken ? `` : String(el.slotScope);
 const fn =
  `function(${slotScope}){` +
  `return ${
   el.tag === "template"
    ? el.if && isLegacySyntax
      ? `(${el.if})?${genChildren(el, state) || "undefined"}:undefined`
      : genChildren(el, state) || "undefined"
    : genElement(el, state)
  }}`;
 // reverse proxy v-slot without scope on this.$slots
 const reverseProxy = slotScope ? `` : `,proxy:true`;
 return `{key:${el.slotTarget || `"default"`},fn:${fn}${reverseProxy}}`;
}
```

`generatedSlots` 就是对 `scopedSlots` 对象遍历，执行 `genScopedSlot`，并把结果用逗号拼接，而 `genScopedSlot` 是先去生成一个代码串，函数参数是 `slotScope`（`template` 上 `slot-scope` 对应的值）然后返回一个对象 `key` 为插槽名称，`fn` 为生成的函数

```javascript
// 作用域插槽生成的render函数
with (this) {
 return _c(
  "div",
  { attrs: { id: "app" } },
  [
   _c("child", {
    scopedSlots: _u([
     {
      key: "default",
      fn: function (scope) {
       return [
        _c("p", [_v(_s(scope.text))]),
        _v(" "),
        _c("p", [_v(_s(scope.msg))]),
       ];
      },
     },
    ]),
   }),
  ],
  1
 );
}
// 普通插槽生成的render函数
with (this) {
 return _c(
  "div",
  [
   _c("app-layout", [
    _c("h1", { attrs: { slot: "header" }, slot: "header" }, [_v(_s(title))]),
    _c("p", [_v(_s(msg))]),
    _c("p", { attrs: { slot: "footer" }, slot: "footer" }, [_v(_s(desc))]),
   ]),
  ],
  1
 );
}
```

与普通插槽的编译结果区别在于没有 `children`，并且 `data` 部分多了对象，并且执行了`_u`它所应对的方法是 `resolveScopedSlots` 定义在`src\core\instance\render-helpers\resolve-scoped-slots.js`

```javascript
export function resolveScopedSlots(
 fns: ScopedSlotsData, // see flow/vnode
 res?: Object,
 // the following are added in 2.6
 hasDynamicKeys?: boolean,
 contentHashKey?: number
): { [key: string]: Function, $stable: boolean } {
 res = res || { $stable: !hasDynamicKeys };
 for (let i = 0; i < fns.length; i++) {
  const slot = fns[i];
  if (Array.isArray(slot)) {
   resolveScopedSlots(slot, res, hasDynamicKeys);
  } else if (slot) {
   // marker for reverse proxying v-slot without scope on this.$slots
   if (slot.proxy) {
    slot.fn.proxy = true;
   }
   res[slot.key] = slot.fn;
  }
 }
 //  if (contentHashKey) {
 //   (res: any).$key = contentHashKey;
 //  }
 return res;
}
```

这个函数最后返回一个 `key` 为插槽名称，`value` 是对应的函数的一个对象，接下来是子组件的编译过程，会走到 `genSlot` 方法内，此时会对 `attrs` 和 `v-bind` 做处理

```javascript
function genSlot(el: ASTElement, state: CodegenState): string {
 const slotName = el.slotName || '"default"';
 const children = genChildren(el, state);
 let res = `_t(${slotName}${children ? `,${children}` : ""}`;
 const attrs =
  el.attrs || el.dynamicAttrs
   ? genProps(
      (el.attrs || []).concat(el.dynamicAttrs || []).map((attr) => ({
       // slot props are camelized
       name: camelize(attr.name),
       value: attr.value,
       dynamic: attr.dynamic,
      }))
     )
   : null;
 const bind = el.attrsMap["v-bind"];
 if ((attrs || bind) && !children) {
  res += `,null`;
 }
 if (attrs) {
  res += `,${attrs}`;
 }
 if (bind) {
  res += `${attrs ? "" : ",null"},${bind}`;
 }
 return res + ")";
}

_c(
 "div",
 { staticClass: "child" },
 [_t("default", null, { text: "Hello ", msg: msg })],
 2
);
```

`_t`方法对应的就是 `renderSlot`

```javascript
export function renderSlot(
 name: string,
 fallback: ?Array<VNode>,
 props: ?Object,
 bindObject: ?Object
): ?Array<VNode> {
 const scopedSlotFn = this.$scopedSlots[name];
 let nodes;
 if (scopedSlotFn) {
  // scoped slot
  props = props || {};
  if (bindObject) {
   if (process.env.NODE_ENV !== "production" && !isObject(bindObject)) {
    warn("slot v-bind without argument expects an Object", this);
   }
   props = extend(extend({}, bindObject), props);
  }
  nodes = scopedSlotFn(props) || fallback;
 } else {
  nodes = this.$slots[name] || fallback;
 }

 const target = props && props.slot;
 if (target) {
  return this.$createElement("template", { slot: target }, nodes);
 } else {
  return nodes;
 }
}
```

`const scopedSlotFn = this.$scopedSlots[name];`在子组件渲染函数执行之前，`vm._render` 方法内，
`src\core\instance\render.js`

```javascript
Vue.prototype._render = function (): VNode {
 if (_parentVnode) {
  vm.$scopedSlots = normalizeScopedSlots(
   _parentVnode.data.scopedSlots,
   vm.$slots,
   vm.$scopedSlots
  );
 }
 // ... ...
};
```

`$scopedSlots` 就是父组件执行 `resolveScopedSlots` 返回的对象，通过插槽的名称就可以获取对应的函数，然后把相关的数据设置到 `props` 上，作为函数传入，然后返回 `vnode`，为后面渲染用。
作用域插槽和普通插槽的最大区别就是数据的作用域，普通插槽是在父组件编译和渲染阶段生成 `vnode`，所以数据的作用域就是父组件的实例，子组件在渲染时直接拿到这些渲染好的 `vnode`。对于作用域插槽，父组件在编译和渲染阶段不会直接生成 `vnode`，而是在父节点 `vnode` 中的 `data` 里面保存一个 `scopedSlots` 对象，存储着不同的插槽名称和对应的渲染函数，只有在编译和渲染子组件阶段才会执行这个渲染函数生成 `vnode`，由于是在子组件环境执行的，所以对应的数据作用域是子组件实例。
