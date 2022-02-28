## Event

从编译开始，在 `parse` 阶段，会执行 `processAttrs`函数，定义在`src\compiler\parser\index.js`

```javascript
function processAttrs(el) {
 const list = el.attrsList;
 let i, l, name, rawName, value, modifiers, syncGen, isDynamic;
 for (i = 0, l = list.length; i < l; i++) {
  name = rawName = list[i].name;
  value = list[i].value;
  // ... ...
  if (dirRE.test(name)) {
   // ... ...
   modifiers = parseModifiers(name.replace(dirRE, ""));

   if (bindRE.test(name)) {
    // ... ...
   } else if (onRE.test(name)) {
    // v-on
    name = name.replace(onRE, "");
    isDynamic = dynamicArgRE.test(name);
    if (isDynamic) {
     name = name.slice(1, -1);
    }
    addHandler(el, name, value, modifiers, false, warn, list[i], isDynamic);
   } else {
    // ... ...
   }
  }
 }
 // ... ...
}
function parseModifiers(name: string): Object | void {
 const match = name.match(modifierRE);
 if (match) {
  const ret = {};
  match.forEach((m) => {
   ret[m.slice(1)] = true;
  });
  return ret;
 }
}
```

如果是事件的指令，则执行 `addHandler` 方法，定义在`src\compiler\helpers.js`

```javascript
export function addHandler(
 el: ASTElement,
 name: string,
 value: string,
 modifiers: ?ASTModifiers,
 important?: boolean,
 warn?: ?Function,
 range?: Range,
 dynamic?: boolean
) {
 modifiers = modifiers || emptyObject;
 // warn prevent and passive modifier
 /* istanbul ignore if */
 if (
  process.env.NODE_ENV !== "production" &&
  warn &&
  modifiers.prevent &&
  modifiers.passive
 ) {
  warn(
   "passive and prevent can't be used together. " +
    "Passive handler can't prevent default event.",
   range
  );
 }

 // normalize click.right and click.middle since they don't actually fire
 // this is technically browser-specific, but at least for now browsers are
 // the only target envs that have right/middle clicks.
 if (modifiers.right) {
  if (dynamic) {
   name = `(${name})==='click'?'contextmenu':(${name})`;
  } else if (name === "click") {
   name = "contextmenu";
   delete modifiers.right;
  }
 } else if (modifiers.middle) {
  if (dynamic) {
   name = `(${name})==='click'?'mouseup':(${name})`;
  } else if (name === "click") {
   name = "mouseup";
  }
 }

 // check capture modifier
 if (modifiers.capture) {
  delete modifiers.capture;
  name = prependModifierMarker("!", name, dynamic);
 }
 if (modifiers.once) {
  delete modifiers.once;
  name = prependModifierMarker("~", name, dynamic);
 }
 /* istanbul ignore if */
 if (modifiers.passive) {
  delete modifiers.passive;
  name = prependModifierMarker("&", name, dynamic);
 }

 let events;
 if (modifiers.native) {
  delete modifiers.native;
  events = el.nativeEvents || (el.nativeEvents = {});
 } else {
  events = el.events || (el.events = {});
 }

 const newHandler: any = rangeSetItem({ value: value.trim(), dynamic }, range);
 if (modifiers !== emptyObject) {
  newHandler.modifiers = modifiers;
 }

 const handlers = events[name];
 /* istanbul ignore if */
 if (Array.isArray(handlers)) {
  important ? handlers.unshift(newHandler) : handlers.push(newHandler);
 } else if (handlers) {
  events[name] = important ? [newHandler, handlers] : [handlers, newHandler];
 } else {
  events[name] = newHandler;
 }

 el.plain = false;
}
```

`addHandler` 只做了三件事，首先根据 `modifier` 修饰符对事件名 `name` 做处理，接着根据 `modifiers.native` 来区分是原生事件还是普通事件，最后按照 `name` 对事件归类，把回调函数字符串保留到对应的事件名下，然后再 `codegen` 阶段，会在 `genData` 函数中根据 `AST` 节点上的 `events` 和 `nativeEvents` 生成 `data` 数据，定义在`src\compiler\codegen\index.js`

```javascript
export function genData(el: ASTElement, state: CodegenState): string {
 let data = "{";

 // directives first.
 // directives may mutate the el's other properties before they are generated.
 const dirs = genDirectives(el, state);
 if (dirs) data += dirs + ",";
 // ... ...
 if (el.events) {
  data += `${genHandlers(el.events, false)},`;
 }
 if (el.nativeEvents) {
  data += `${genHandlers(el.nativeEvents, true)},`;
 }
 // ... ...
 return data;
}
```

这两个属性会执行 `genHandlers` 函数，定义在`src\compiler\codegen\events.js`

```javascript
export function genHandlers(
 events: ASTElementHandlers,
 isNative: boolean
): string {
 const prefix = isNative ? "nativeOn:" : "on:";
 let staticHandlers = ``;
 let dynamicHandlers = ``;
 for (const name in events) {
  const handlerCode = genHandler(events[name]);
  if (events[name] && events[name].dynamic) {
   dynamicHandlers += `${name},${handlerCode},`;
  } else {
   staticHandlers += `"${name}":${handlerCode},`;
  }
 }
 staticHandlers = `{${staticHandlers.slice(0, -1)}}`;
 if (dynamicHandlers) {
  return prefix + `_d(${staticHandlers},[${dynamicHandlers.slice(0, -1)}])`;
 } else {
  return prefix + staticHandlers;
 }
}
function genHandler(
 handler: ASTElementHandler | Array<ASTElementHandler>
): string {
 if (!handler) {
  return "function(){}";
 }

 if (Array.isArray(handler)) {
  return `[${handler.map((handler) => genHandler(handler)).join(",")}]`;
 }

 const isMethodPath = simplePathRE.test(handler.value);
 const isFunctionExpression = fnExpRE.test(handler.value);
 const isFunctionInvocation = simplePathRE.test(
  handler.value.replace(fnInvokeRE, "")
 );

 if (!handler.modifiers) {
  if (isMethodPath || isFunctionExpression) {
   return handler.value;
  }
  /* istanbul ignore if */
  if (__WEEX__ && handler.params) {
   return genWeexHandler(handler.params, handler.value);
  }
  return `function($event){${
   isFunctionInvocation ? `return ${handler.value}` : handler.value
  }}`; // inline statement
 } else {
  let code = "";
  let genModifierCode = "";
  const keys = [];
  for (const key in handler.modifiers) {
   if (modifierCode[key]) {
    genModifierCode += modifierCode[key];
    // left/right
    if (keyCodes[key]) {
     keys.push(key);
    }
   } else if (key === "exact") {
    const modifiers: ASTModifiers = (handler.modifiers: any);
    genModifierCode += genGuard(
     ["ctrl", "shift", "alt", "meta"]
      .filter((keyModifier) => !modifiers[keyModifier])
      .map((keyModifier) => `$event.${keyModifier}Key`)
      .join("||")
    );
   } else {
    keys.push(key);
   }
  }
  if (keys.length) {
   code += genKeyFilter(keys);
  }
  // Make sure modifiers like prevent and stop get executed after key filtering
  if (genModifierCode) {
   code += genModifierCode;
  }
  const handlerCode = isMethodPath
   ? `return ${handler.value}($event)`
   : isFunctionExpression
   ? `return (${handler.value})($event)`
   : isFunctionInvocation
   ? `return ${handler.value}`
   : handler.value;
  /* istanbul ignore if */
  if (__WEEX__ && handler.params) {
   return genWeexHandler(handler.params, code + handlerCode);
  }
  return `function($event){${code}${handlerCode}}`;
 }
}
```

genHandlers 会遍历 events，对同一个事件名称的事件调用 genHandler，首先判断 handler 是否是数组，然后递归调用拼接结果，然后判断函数调用路径还是函数表达式，接着对 modifiers 做判断，对于没有 modifiers，直接按照 handler.value 情况返回，如果存在，添加对应的代码串

### DOM 事件

在 `patch` 过程中，会执行各种 `module` 中的 `hook`，它们负责给 DOM 设置相关的样式，事件，属性等 与 `web` 平台相关的 `module` 定义在`src\platforms\web\runtime\modules`，在 `patch` 中无论是创建还是更新都会执行 `updateDOMListeners`,

```javascript
function updateDOMListeners(oldVnode: VNodeWithData, vnode: VNodeWithData) {
 if (isUndef(oldVnode.data.on) && isUndef(vnode.data.on)) {
  return;
 }
 // 获取节点上注册的事件
 const on = vnode.data.on || {};
 const oldOn = oldVnode.data.on || {};
 // 获取 vnode 对应的真实 DOM 元素
 target = vnode.elm;
 // 兼容性处理
 normalizeEvents(on);
 updateListeners(on, oldOn, add, remove, createOnceHandler, vnode.context);
 // 清理对 DOM 元素的引用
 target = undefined;
}
```

获取对应的事件对象，以及对应的 DOM 元素，接着调用 updateListeners 方法，它定义在`src\core\vdom\helpers\update-listeners.js`

```javascript
export function updateListeners(
 on: Object,
 oldOn: Object,
 add: Function,
 remove: Function,
 createOnceHandler: Function,
 vm: Component
) {
 let name, def, cur, old, event;
 // 遍历所有事件的名称
 for (name in on) {
  // 获取事件处理函数
  def = cur = on[name];
  old = oldOn[name];
  // 获取是否是once passive capture事件
  event = normalizeEvent(name);
  /* istanbul ignore if */
  if (__WEEX__ && isPlainObject(def)) {
   cur = def.handler;
   event.params = def.params;
  }
  if (isUndef(cur)) {
   process.env.NODE_ENV !== "production" &&
    warn(`Invalid handler for event "${event.name}": got ` + String(cur), vm);
  } else if (isUndef(old)) {
   // 是否对事件处理函数做错误的包装处理
   if (isUndef(cur.fns)) {
    // 对处理函数包装错误处理
    cur = on[name] = createFnInvoker(cur, vm);
   }
   if (isTrue(event.once)) {
    cur = on[name] = createOnceHandler(event.name, cur, event.capture);
   }
   // 调用 add 方法注册 DOM 事件
   add(event.name, cur, event.capture, event.passive, event.params);
  } else if (cur !== old) {
   old.fns = cur;
   on[name] = old;
  }
 }
 for (name in oldOn) {
  if (isUndef(on[name])) {
   event = normalizeEvent(name);
   remove(event.name, oldOn[name], event.capture);
  }
 }
}
```

通过遍历 `on` 去添加事件监听，遍历 `oldOn` 去移除监听，关于 `add` 与 `remove` 方法都是外界传入的，因为既处理原生 `DOM` 也处理自定义事件；接着调用 `normalizeEvent`，根据 `addHandler` 的时候添加上的特殊标识，区分是否有 `once、capture、passive` 等修饰符；对于首次会满足`(isUndef(old))与isUndef(cur.fns)`会执行 `createFnInvoker`，最后调用 `add`

```javascript
export function createFnInvoker(
 fns: Function | Array<Function>,
 vm: ?Component
): Function {
 function invoker() {
  const fns = invoker.fns;
  if (Array.isArray(fns)) {
   const cloned = fns.slice();
   for (let i = 0; i < cloned.length; i++) {
    invokeWithErrorHandling(cloned[i], null, arguments, vm, `v-on handler`);
   }
  } else {
   // return handler return value for single handlers
   return invokeWithErrorHandling(fns, null, arguments, vm, `v-on handler`);
  }
 }
 invoker.fns = fns;
 return invoker;
}
```

这里定义了 `invoker` 函数并且返回，由于一个事件可能存在多个回调函数，所以对数组进行了判断，多个回调就依次调用。最后 `invoker.fns = fns`;每次执行 `invoker` 函数都是从 `invoker.fns` 中取得的。当再次调用 `updateListeners` 的时候，会判断 `cur !== old`，如果成立就会将 `old.fns = cur`，这样确保事件只添加一次，这样只是修改一下回调的引用，最后遍历 `oldOn` 拿到事件名称，执行 `remove` 去移除事件回调。
`DOM` 平台下的 `add` 方法定义在 `src\platforms\web\runtime\modules\events.js`

### 自定义事件

`Vue` 中的自定义事件只能作用于组件上，如果在组件上使用原生事件需要使用`.native` 修饰符，普通元素使用`.native` 修饰符无效。在 `render` 阶段，如果是一个组件节点会通过 `createComponent` 创建一个 `vnode` 对象 定义在

```javascript
export function createComponent(
 Ctor: Class<Component> | Function | Object | void,
 data: ?VNodeData,
 context: Component,
 children: ?Array<VNode>,
 tag?: string
): VNode | Array<VNode> | void {
 // ... ...

 // extract listeners, since these needs to be treated as
 // child component listeners instead of DOM listeners
 const listeners = data.on;
 // replace with listeners with .native modifier
 // so it gets processed during parent component patch.
 data.on = data.nativeOn;
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
}
```

对于自定义事件是在当前组件环境下处理的，作为组件配置参数进行初始化，在组件初始化时会调用 `initInternalComponent` 方法

```javascript
export function initInternalComponent(
 vm: Component,
 options: InternalComponentOptions
) {
 const opts = (vm.$options = Object.create(vm.constructor.options));
 const parentVnode = options._parentVnode;
 const vnodeComponentOptions = parentVnode.componentOptions;
 opts._parentListeners = vnodeComponentOptions.listeners;
}
```

拿到父组件传入的 `listeners`，然后再执行 `initEvents` 定义在`src\core\instance\events.js`

```javascript
export function initEvents(vm: Component) {
 vm._events = Object.create(null);
 vm._hasHookEvent = false;
 // init parent attached events
 // 获取父元素上附加的事件
 const listeners = vm.$options._parentListeners;
 if (listeners) {
  // 注册自定义事件
  updateComponentListeners(vm, listeners);
 }
}
```

拿到父组件上的 `listeners`，执行 `updateComponentListeners`

```javascript
export function updateComponentListeners(
 vm: Component,
 listeners: Object,
 oldListeners: ?Object
) {
 // 记录当前组件实例
 target = vm;
 updateListeners(
  listeners,
  oldListeners || {},
  add,
  remove,
  createOnceHandler,
  vm
 );
 target = undefined;
}
```

这里 `updateListeners` 传入的 `add` 与 `remove` 方法与原生 `DOM` 平台下不相同，

```javascript
function add(event, fn) {
 target.$on(event, fn);
}

function remove(event, fn) {
 target.$off(event, fn);
}
export function eventsMixin(Vue: Class<Component>) {
 const hookRE = /^hook:/;
 Vue.prototype.$on = function (
  event: string | Array<string>,
  fn: Function
 ): Component {
  const vm: Component = this;
  if (Array.isArray(event)) {
   for (let i = 0, l = event.length; i < l; i++) {
    vm.$on(event[i], fn);
   }
  } else {
   (vm._events[event] || (vm._events[event] = [])).push(fn);
   // optimize hook:event cost by using a boolean flag marked at registration
   // instead of a hash lookup
   if (hookRE.test(event)) {
    vm._hasHookEvent = true;
   }
  }
  return vm;
 };

 Vue.prototype.$once = function (event: string, fn: Function): Component {
  const vm: Component = this;
  function on() {
   vm.$off(event, on);
   fn.apply(vm, arguments);
  }
  on.fn = fn;
  vm.$on(event, on);
  return vm;
 };

 Vue.prototype.$off = function (
  event?: string | Array<string>,
  fn?: Function
 ): Component {
  const vm: Component = this;
  // all
  if (!arguments.length) {
   vm._events = Object.create(null);
   return vm;
  }
  // array of events
  if (Array.isArray(event)) {
   for (let i = 0, l = event.length; i < l; i++) {
    vm.$off(event[i], fn);
   }
   return vm;
  }
  // specific event
  const cbs = vm._events[event];
  if (!cbs) {
   return vm;
  }
  if (!fn) {
   vm._events[event] = null;
   return vm;
  }
  // specific handler
  let cb;
  let i = cbs.length;
  while (i--) {
   cb = cbs[i];
   if (cb === fn || cb.fn === fn) {
    cbs.splice(i, 1);
    break;
   }
  }
  return vm;
 };

 Vue.prototype.$emit = function (event: string): Component {
  const vm: Component = this;
  if (process.env.NODE_ENV !== "production") {
   const lowerCaseEvent = event.toLowerCase();
   if (lowerCaseEvent !== event && vm._events[lowerCaseEvent]) {
    tip(
     `Event "${lowerCaseEvent}" is emitted in component ` +
      `${formatComponentName(
       vm
      )} but the handler is registered for "${event}". ` +
      `Note that HTML attributes are case-insensitive and you cannot use ` +
      `v-on to listen to camelCase events when using in-DOM templates. ` +
      `You should probably use "${hyphenate(event)}" instead of "${event}".`
    );
   }
  }
  let cbs = vm._events[event];
  if (cbs) {
   cbs = cbs.length > 1 ? toArray(cbs) : cbs;
   const args = toArray(arguments, 1);
   const info = `event handler for "${event}"`;
   for (let i = 0, l = cbs.length; i < l; i++) {
    invokeWithErrorHandling(cbs[i], vm, args, vm, info);
   }
  }
  return vm;
 };
}
```

利用发布订阅者模式实现，把所有的事件都存放在`_events`下，将调用`$on`时按事件名称将回调存放起来;当执行`$emit`时，根据事件名找到所有的回调，然后遍历依次执行;当执行`$off`时根据事件名称移除指定的 fn；当执行`$once`时，触发一次`$on`然后再调用`$off`移除掉，这样就确保只执行一次。
所以对于自定义事件的添加和删除就是根据这几个API，当父子组件通讯时，vm.$emit("xxx")是给当前的实例上派发，之所以称为父子组件通讯，是因为他的回调函数定义在父组件中，子组件的某个事件触发，通过$emit派发事件，那么子组件的实例就监听到这个事件，并执行父组件中定义的回调函数，完成一次父子通讯。
