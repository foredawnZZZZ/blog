# windows10命令行
## powershell什么是PowerShell

windows PowerShell是一种命令行外壳程序和脚本环境,使用PowerShell的编写者也可以利用.NET的强大功能!



## 启动方式

- Win10系统可以在Cortana搜索框中输入PowerShell就可以打开了 
- win + R 输入powershell
- Win7/8.1系统可以使用Win+Q组合键打开搜索，然后输入PowerShell，选择下面的提示项就可以了 
- 通用方法：Win+R组合键打开运行命令，输入PowerShell按回车就可以打开了 
- 按住shift键+右键鼠标快捷打开。 

补充:( 从cmd切换至PowerShell：可以在命令提示符中输入PowerShell就可切换至Windows PowerShell了  反之也可以在切换回去 )



## 基础命令

- get-command 获取所有的命令
- get-process 获取所有的进程
- clear (cls) 清屏命令
- get-history 获取在当前会话输入过的命令
- get-lcoation 获取当前工作位置
- 直接在C根目录时输入d:，进入其他盘同理。 
- cd ..跳转到上一级目录 
- cd /跳转到根目录 
- cd path跳转到指定目录 
- cd d: 无法切换到d盘 
- explorer .    打开当前目录 
- explorer ..    打开上级目录 
- explorer  path   打开任意目录 
- dir 查看当前目录结构
- tree 以树状显示输入目录的结构   tree d:\文件名
- md 创建一个文件夹  md 文件名(表示当前文件夹下) d:\文件名\文件名(指定位置)
- rd 删除一个文件夹  rd 同 md 一样
- color xy  x:背景颜色 y:字体颜色
  0 = 黑色 8 = 灰色 1 = 蓝色 9 = 淡蓝色 2 = 绿色 A = 淡绿色 3 = 浅绿色 B = 淡浅绿色 4 = 红色 C = 淡红色 5 = 紫色 D = 淡紫色 6 = 黄色 E = 淡黄色 7 = 白色 F = 亮白色 
