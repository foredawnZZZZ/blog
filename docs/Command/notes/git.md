# git bash here
## 版本控制系统

版本控制系统不仅可以应用于软件源代码的文本文件，而且可以对任何类型的文件进行版本控制。

为什么要有版本控制系统

在开发过程中，经常需要对一个文件进行修改甚至删除，但是我们又希望能够保存这个文件的历史记录，如果通过备份，那么管理起来会非常的复杂。

版本控制系统的分类

本地式版本控制系统,分布式版本控制系统,集中式版本控制系统



## git简介

Git是一款免费、开源的分布式 版本控制系统 ，用于敏捷高效地处理任何或小或大的项目。

git的安装和注册需注意

- 不要安装在中文目录
- 不要使用桌面管理软件(有可能在右击桌面上看不到git bash here)
- 不花钱的注册就没有私有仓库,邮箱要真实的!



## git基本操作

(工作区-->暂存区-->仓库区)

    git init
    初始化仓库,想要使用git对某个项目进行管理,需要用git init进行初始化
    (同时会自动生成一个.git的隐藏文件夹)

    git add 文件名 表示将指定文件从工作区提交到暂存区
    git add .	  将当前目录下的所有文件提交到暂存区(git add -A或git add --all也一样)

    git status   查看文件状态
    红色 表示在工作区
    绿色 表示在暂存区
    git status -s 简化文件状态输出

    git commit -m '提交说明' 将文件从暂存区提交到暂存区
    git commit 会进入vi编辑器 先按esc键 在输入:q! 强制退出 (加上 -m)
    git commit -a -m '提交说明' 快速提交文件从工作区直接到仓库区
    				只能提交暂存过的文件 新建的文件没办法快速提交
    				
    git commit --amend -m '提交说明' 修改最近的一次提交说明

    git log 查看提交的版本日志
    git log --oneline 简化提交日志
    git reflog 提交历史()

    git config --list  查看配置信息
    第一次安装好git后 需要配置个人的账号和邮箱才能进行提交
    # 使用--global参数，配置全局的用户名和邮箱，只需要配置一次即可。推荐配置github的用户名和密码
    git config --global user.name
    git config --global user.email

    git reset --hard 加上你的版本号 (重置三个区)
    关于参数 --hard 的解释
    git reset 的参数可以是以下三个值
    git reset --soft 版本号 : 只重置仓库区
    git reset --mixed 版本号 : 重置仓库区和暂存区
    git reset 版本号 跟 --mixed 一样

    .gitignore 不想提交的文件写入里面 如果想写注释用# (也可以忽视所有文件夹)
    最好是在根目录下创建一个.gitignore的文件 文件名是固定的 将不想被管理的文件路径放在.gitignore中
    
    # 忽视idea.txt文件
    idea.txt
    
    # 忽视.gitignore文件
    .gitignore
    
    # 忽视css下的index.js文件
    css/index.js
    
    # 忽视css下的所有的js文件
    css/*.js
    
    # 忽视css下的所有文件
    css/*.*
    # 忽视css文件夹
    css

    git diff    表示查看工作区与暂存区的不同
    git diff --cached    表示查看暂存区与仓库区的不同
    git diff HEAD    表示查看工作区与仓库区的不同 HEAD表示最新的那次提交
    git diff 版本号1 版本号2    表示查看两个版本之间的不同

    git checkout --文件名	   表示把工作区的内容恢复到了暂存区的内容
    git reset HEAD 文件名   把暂存区的文件内容修改为仓库区的文件内容
    
    场景一: 当你改乱了工作区某个文件的内容,想直接丢弃工作区的修改时,用命令git checkout --文件名
    场景二: 当你不但改乱了工作区某个文件的内容,还添加到了暂存区时,想丢弃修改,分两步,第一步用git reset HEAD --文件名 就回到了场景1, 第二步按场景一操作.
    #场景三: 已经提交了不合适的修改到仓库区的时候,想要撤回本次提交,需要使用git reset --hard 了,不过前提没有推送到远程仓库 就是没有 git push 

    git rm 文件名
    工作区和暂存区都删除



## git分支操作

(相互独立的不相互影响 为了保证功能开发的独立性)

git的分支本质上是一个指针,;每次代码提交之后,这个分支指针就会向后移动,保证一直指向最后一次提交的版本. HEAD分支表示指向的当前的分支

    git branch 分支名   表示创建分支 当前分支代码与创建时的内容完全相同.
    
    git在第一次提交时,就有一个master的主分支
    
    git branch 直接输出可以查看所有的分支
    分支名称为绿色 并且前面有白色星星 说明你在它所在的分支上

    git checkout 分支名 切换分支 HEAD指针指向了另一个分支
    在当前分支的任何操作都不会影响到其他的分支,除非进行了分支合并

    git checkout -b 分支名  创建并切换分支

    git branch -d 分支名   删除分支

    git merge 分支名称 将其他分支的内容合并到当前分支
    在master分支中执行git merge 分支名 将想合并的代码合并到master分支
    
    合并冲突
    对于同一个文件,如果有多个分支需要合并时,容易出现冲突
    合并分支时，如果出现冲突，只能手动处理，再次提交，一般的作法，把自己的代码放到冲突代码的后面即可。

    





## github

在github上新建一个仓库...

git clone 远程仓库地址 文件夹名 就克隆到了自己的工作区进行开发 git add . 提交到暂存区 git commit -m '...' 提交到仓库区  在git push 远程仓库地址 分支名 到远程仓库  其他开发者可以git pull 将更新的文件拖拽过来



    git clone 远程仓库地址 (文件夹名)
    默认会在本地仓库变量(别名) 存储一个远程仓库地址 origin
    在自己的工作区克隆了一分代码

    git remote 表示当前的仓库别名
    git remote add '仓库别名' '仓库地址'
    git remote remove '仓库别名'

    git push "远程仓库地址" "分支名"
    表示往远程仓库推送
    #git push 仓库地址 master 在代码提交到远程仓库,注意master分支必须写,不能省略
    clone下来的origin默认就是clone的地址
    #假设你自己是一个项目的负责人 你现在本地git init初始化了 然后就想要git add  . git commit -m '...' git push origin master 会出现警告的 因为origin没有这个变量 你需要创建一个新的远程仓库并且初始化的那个选项千万不要勾选 相当于初始了两个地址了 然后你在用git remote add origin 仓库地址 声明它 就可以push了

    git pull 表示拉取更新
    它在默认的时候就会与仓库进行关联 所以省略了 git pull 远程仓库地址 分支名

## SSH免密码登录

git支持多种数据传输协议 https协议和SHH协议

https的缺点 因为http是无状态的 你发多少次他都不认识你 所以你每次push的时候都需要输入用户名和密码 进行确认.

使用SHH可以设置免密码推送

- 对称加密:是本地发送一个文件给服务端(假如github)拿着钥匙进行加密,服务端拿着同一把钥匙进行解密 实质只有一把钥匙
- 非对称加密:是本地发送一个文件给服务端 拿着私钥进行加密,服务端通过公钥进行解密 实质有两把 但是安全性更高了

SSH免密码登录配置

注意:命令在bash敲

1. 创建SSH Key：ssh-keygen -t rsa
2. 在文件路径 C:\用户\当前用户名\ 找到 .ssh 文件夹
3. 文件夹中有两个文件：
   - 私钥：id_rsa
   - 公钥：id_rsa.pub
   4.在 github -> settings -> SSH and GPG keys页面中，新创建SSH key
   5.粘贴 公钥 id_rsa.pub 内容到对应文本框中
   6.在github中新建仓库或者使用现在仓库，拿到`git@github.com:用户名/仓库名.git
   7.此后，再次SSH方式与github“通信”，不用输入密码确认身份了(第一次输入要yes)

(ssh -T git@github.com 查看一下是否成功了)



## git常见警告

<span style="color:red">第一次要输入yes</span>

- nothing to commit, working tree clean
  表示你并没有修改要提交的项目,报的提示的意思是,文件夹没有被修改没必要提交
- Could not read from remote repository.Please make sure you have the correct access rights.
  出现这个问题是你并没有在github账号上添加SSH key
