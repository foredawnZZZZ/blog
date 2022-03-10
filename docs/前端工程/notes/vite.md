## vite-vue

### vite 创建 vue2 项目

- 初始化 `vite` 原生框架
- 选择 `vanilla` 原生项目
- 安装 `vite-plugin-vue2`;`vue-template-tempiler`;`vue2.x`
- 创建 `src` 目录，将 `main.js` 放入 `src` 目录下，修改 `index.html` 中 `main.js` 的引用路径
- 创建 `vite.config.js` 文件

```javascript
import { defineConfig } from "vite";
import { createVuePlugin } from "vite-plugin-vue2";

export default defineConfig({
 plugins: [createVuePlugin()],
});
```

<!-- 原生css变量与css modules？？？？ -->

