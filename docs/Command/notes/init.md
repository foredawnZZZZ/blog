# 框架项目初始化
## vue项目

|          | 全局安装脚手架          | 创建项目                      | 安装依赖    | 运行调试      | 打包发布      |
| -------- | ----------------------- | ----------------------------- | ----------- | ------------- | ------------- |
| vue-cli2 | npm install vue-cli-g   | vue init webpack project-name | npm install | npm run dev   | npm run build |
| vue-cli3 | npm install @vue/cli -g | vue create project-name       | npm install | npm run serve | npm run build |



| 目录/文件        | 说明                      |
| ---------------- | ------------------------- |
| build            | 项目构建(webpack)相关代码 |
| vueconfig        | 开发者配置文件 如反向代理 |
| **node_modules** | npm包依赖                 |
| src              | 开发者目录自定义          |
| static           | 静态资源文件夹            |
| .xxxx文件        | git配置文件               |
| index.html       | 入口页面                  |
| package.json     | 项目配置文件              |
| README.md        | 说明文档 markdown文件     |

整个项目的目录结构根据具体需求而定



## 使用vue-cli3.0创建新的项目时的选项

```bash
1.执行完初始化项目的命令后会有以下提示：

Please pick a preset：    //(上下箭头选择)
default (babel,eslint)    //默认配置
Manually select features  //手动选择特性    先选这个

2.选择手动选择特性后会有以下提示:(空格是取消 回车是选择)
(*)Babel	//es6的代码转译成浏览器能识别的代码
()Typescript
()Progressive web App(PWA)Support	//先进的webapp缓存！支持
()Router
()Vuex
(*)css pre-processors   //css预处理，使用的下一步会提示，建议使用 dart-scss
(*)Linter/ Formatter	//最好把这个取消掉，这是一个ESLinter，保存检测/提交检测，建议后者
(*)unit Testing         //单元测试    Mocha+Chai、Jest，建议后者
()E2E Testing

3.选择项目安装的特性之后会有以下提示：
In dedicated config files    //把某些配置放到一些独立的配置文件中	推荐这个
In package.json	    //把配置文件都放到package.json中

4.完成上一步之后会有如下提示：
save this as a preset for future projects?(y/N)
上述提示的意思是：是否将刚才的选择保存为一个 preset，就是说下次项目初始化的时候会用到，我个人在这里建议是 n 。因为项目初始化的步骤也不是特别麻烦，每次创建项目的时候都可以自己根据项目需要重新进行配置选项。
```





## react项目

| npm install -g create-react-app |
| :-----------------------------: |
|     create-react-app my-app     |
|            cd my-app            |
|          npm run start          |

react项目较比vue比较灵活 创建完成大致项目结构就可以自己根据需求创建(thunk sage redux自己手动安装)



## 反向代理

```js
vue配置: 
module.exports = {
  devServer: {
    port: 9090,
    open: true,
    https: false,
    // 在proxy
    proxy: {
      "/api": {
        // 要访问的地址
        target: "http://test.gesport.gymexpress.com/",
        // target: "http://192.168.1.167:9090/",
        // 开启代理 在本地创建一个虚拟的服务器 进行服务器之间的交互
        changeOrigin: true,
        pathRewrite: {
          "^/api": ""
        }
      }
    }
  }
}

在cli3.x的版本当中都是在根下创建一个vueconfig.js文件 配置信息都是在这个文件中写
在cli2.x的版本中是在config目录下配置
```



```js
react配置:
1.在React项目中package.json中配置
// 这个proxy必须是字符串!
"proxy": { //配置项  
        "/api": {//我们可以在这里设置个口令  
            "target": "https://xxx.com/",//target是api服务器地址 
            "changeOrigin": true, //这个是是否替换这里一定要写true  
            "pathRewrite": { //这个是个正则匹配  
                "^/api": "/"  
          }  
     }  
 }
2.可以通过安装npm http-proxy-middleware --save
创建一个setupProxy.js文件
const proxy = require("http-proxy-middleware");  

module.exports = function(app) {
  app.use(proxy("/deng", { 
       target: "http://m.deng.com" ,
       changeOrigin: true,
       pathRewrite: {
        "^/deng": "/"
       },
    }));
};
配置字段含义一致
```

