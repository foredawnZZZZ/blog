# npm包管理工具
npm 卸载及安装流程

## 1.卸载

将node的安装目录nodeJS文件夹清空   C:\Program Files\nodejs

查找.npmrc文件删除  C:\Users\周下

## 2.安装

(1)..到node官网下载安装包 

(2).傻瓜式安装

(3).完成后 node -v npm -v 查看是否安装成功，此时npm 并不是最新版  

(4).配置npm的全局模块的存放路径以及cache的路径：在nodejs文件夹中创建两个文件夹，”node_global”及”node_cache” 

(5).输入

npm config set prefix "C:\Program Files\nodejs\node_global" 

npm config set cache "C:\Program Files\nodejs\node_cache" 

(6).设置淘宝镜像 

npm config set registry http://registry.cnpmjs.org 

(7).安装模块测试 

npm install express -g 

## 3.管理npm源的工具——nrm

npm install -g nrm 

nrm ls 

nrm use  XXXX

## 4.报错

如果安装任何模块都报404错误，请查看.npmrc是否被删除 


前端自动化工具----npm

作用:通过npm快速安装开发中使用的包; npm不需要安装了node,就自带了npm



## package.json文件

他是一个包描述文件,用来管理组织一个包(项目),他是一个纯json格式的文件

描述了当前包的信息,描述当前包的依赖项

作为一个项目的标准包,必须有package.json描述当前包的依赖项

一个项目的node_modules目录通常都会很大，不用拷贝node_modules目录，可以通过package.json文件配合npm i直接安装项目所有的依赖项!

    {
      "name": "03-npm",  //描述了包的名字，不能有中文
      "version": "1.0.0",  //描述了包的的版本信息， x.y.z  如果只是修复bug，需要更新Z位。如果是新增了功能，但是向下兼容，需要更新Y位。如果有大变动，向下不兼容，需要更新X位。
      "description": "", //包的描述信息
      "main": "index.js", //入口文件（模块化加载规则的时候详细的讲）
      "scripts": {  //配置一些脚本，在vue的时候会用到，现在体会不到
        "test": "echo \"Error: no test specified\" && exit 1"
      },
      "keywords": [],  //关键字（方便搜索）
      "author": "",  //作者的信息
      "license": "ISC",  //许可证，开源协议
      "dependencies": {   //重要，项目的依赖， 方便代码的共享  通过 npm install可以直接安装所有的依赖项
        "bootstrap": "^3.3.7",
        "jquery": "^3.3.1"
      }
    }

一个合法的package.json,必须name和version属性!



## npm基本命令

安装与卸载

    npm init   表示用于初始化一个包,创建一个package.json文件 都应该先执行npm init
    
    全局安装,会把npm包安装到C:\Users\HUCC\AppData\Roaming\npm目录下，作为命令行工具使用
    npm install -g 包名;
    
    本地安装，会把npm包安装到当前项目的node_modules文件中，作为项目的依赖
    npm install 包名; 
    
    npm install 包名    表示安装指定的包的最新版本到项目中 都要小写
    npm install 包名@版本号   表示安装指定包的指定版本
    npm i 包名   简写 (npm i 包名 --save 和 npm i 包名 -s)(save在生产和线上都需要)
    
    
    npm uninstall 包名  表示卸载安装好的包
    npm un 包名  简写

## 下载加速

    nrm  npm仓库地址管理的工具
    npm i -g nrm
    
    # 带*表示当前正在使用的地址
    
    # 查看仓库地址列表
    nrm ls
    
    # 切换仓库地址
    nrm use taobao

## 快速删除

    npm install rimraf -g
    rimraf node_modules
    
    npm cache clean -f 清除缓存
    
    npm list -g --depth 0 查看本地安装全局的包
    
    先安装个包 在根下直接命令



## 关于npm的升级

    升级命令: # npm install npm -g #
    执行之后运行npm -v 还是之前的版本号
    c:\Users\你的用户名\AppData\Roaming\npm\node_modules中的npm里面的东西全部拷贝到nodejs安装目录下的node_modules下的npm中
    忘记nodejs安装 ? where node



## Node

- 官网: https://nodejs.org/zh-cn/ 下载长期支持版
- 查看node是否安装成功: 打开cmd,输入 node -v 可以查看当前版本号
- npm全局安装包 npm install xxx -g
  - nrm
  - webpack
  - webpack-cli
  - vue-cli
  - json-server

