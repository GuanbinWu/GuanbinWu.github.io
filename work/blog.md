# 目录
[DFT计算粗略流程](#DFT计算粗略流程) [本地Gemma3](#本地Gemma3使用)

# DFT计算粗略流程

### 总流程
[进入服务器](#进入服务器) -> [准备计算文件](#准备计算文件) -> [准备集群脚本](#准备集群脚本) -> [提交作业](#提交作业) -> [分析数据](#分析数据)

#### 进入服务器
1. 下载vscode。进入(https://code.visualstudio.com/Download)，选择适合自己电脑的版本下载并安装。

2. 安装SSH扩展，参考(https://developer.aliyun.com/article/1626959)，在安装SSH-Remote时，可顺便搜索"Chinese(Simplified)"，选第一个（作者是微软），安装后重启软件（右下角有重启提醒弹窗），可实现vscode界面全中文。

3. 按照教程进入SSH，注意将指令换为
    ```
    ssh username@ip # username是用户名，请找我创建账号, 服务器ip地址请私聊我
    ```
    或者在ssh配置文件里新增：
    ```
    Host yggroup-device1 # 此项无所谓，只是个名字
        HostName ip # 组内DFT计算服务器ip地址，勿改
        User username # 这里需要找我创建账号 
    ```
    上面两种操作结果一致。
    系统选择linux，输入密码（需要找我创建账号）。若界面运行一会儿后静止，且没有报错，说明已经进入。新用户需要配置环境，一般可以直接用我的
4. 进入命令行，进入工作目录，此处我的工作目录是```/home/wgb/DFT/```,因此
    ```
    cd /home/wgb/DFT/
    ```
    进入其中。后续命令若要生效，进对工作目录是大前提。

5. 碎碎念：如果在服务器上有自己的计算在跑，但是找队友执行的，也可以搞个SSH，可以帮忙监控一下自己的任务进度，及时提醒TA推进。

#### 准备计算文件

1. 工作目录下准备好gjf文件。gjf文件如何做当面聊比较方便，按模板进塞自己的内容即可，重点在于“为什么要这么算”，这部分多来源于文献。后续再慢慢补充到这个文档里。

2. 命令行运行```g16 ./xxx.gjf``` xxx.gjf是你的文件路径，即可提交给高斯16进行计算。会生成相应的```xxx.log```文件，即可分析数据。但注意，这个操作调用不了集群资源，算力很低。而且SSH连接中断（网络掉了，关闭了vscode窗口等操作）会导致任务中断。使用 ```nohup &```可以临时解决任务终端问题，但仍然无法享用算力。因此，建议按照下方操作调用集群，发送给服务器后台。

#### 准备集群脚本
1. 为每个gjf文件定制一份jobs.sh文件，例如现在有一份位于```/home/wgb/DFT/mol0.gjf```的gjf需要算，因此创建一个```/home/wgb/DFT/mol0_jobs.sh```，写入内容：
    ```
    #!/bin/bash
    g16 ./mol0.gjf  # 将gjf文件提交给g16，即高斯，会输出log文件，计算的结果全都在log文件获取
    ./logtogjf.py ./mol0.log # 上一行运行完后，运行./logtogjf.py处理生成的log文件，这不是高斯的必须操作，是我自己写的python脚本，用来进行下一步的单点能计算或者溶剂化能计算。
    ```
    由此可见，对一个gjf进行的处理都可以写在jobs.sh文件里。```#!bin/bash```是文件头，不用管，照搬就行。作用请自行百度。
    如果目录下有n个gjf需要计算，相应的需要n个jobs.sh文件。可以考虑python批量生成。

#### 提交作业
1. 准备总脚本，例如我这里有一个```/home/wgb/DFT/sbatch.sh```脚本，内容如下：
    ```
    #!/bin/bash
    sbatch -N 1 -n 1 -c 16 --mem=48GB -D /home/wgb/DFT /home/wgb/DFT/mol0_jobs.sh
    sbatch -N 1 -n 1 -c 16 --mem=48GB -D /home/wgb/DFT /home/wgb/DFT/mol0_jobs.sh
    sbatch -N 1 -n 1 -c 16 --mem=48GB -D /home/wgb/DFT /home/wgb/DFT/mol0_jobs.sh
    ```
    解释：前面几个参数调用的是slurm集群的sbatch命令，指定参数提交计算作业，例如```-c 16```调用16个CPU，```--mem=48GB```调用48G内存，此配置可根据需要写。```/home/wgb/DFT```是工作目录，很重要！一般都用gjf所在的文件夹目录，决定了输出文件的位置，不要乱写，如果误写，轻则需要去另一个文件夹找结果，重则损坏另一个文件夹下甚至别人的文件。```/home/wgb/DFT/mol0_jobs.sh``` 是jobs.sh的路径。这个例子里，有三个jobs.sh文件被提交给了服务器。各用16cpu + 48g内存。

2. 终端输入sbatch命令，
    ```
    sbatch ./sbatch.sh
    ```
    若无报错，所有文件都被提交了。
    
#### 分析数据

1. 终端输入```squeue```即可查看当前作业，如果发现自己的作业不见了，说明已经计算完毕。

2. 判断计算成功与否：
    ```
    grep termination xxx.log # xxx.log是你要检查的文件名，可使用通配符。
    ```
    若出现```Normal termination```则DFT收敛，可分析数据。若```Error termintaion```则计算出错。可找我解决，也可百度自行搞定。

3. 对于收敛的log文件。
    ```
    grep "SCF Done" xxx.log
    ```
    则可读取当前结构收敛后的电子能。将"SCF Done"换为其他对应关键词，可以读取其他结果，例如HOMO LUMO GTC等等。本质上就是在log文件里进行文本搜索（grep）。当然这里也可以利用python molop模组进行自动化读取与计算。这个脚本可找我配。

4. 对于一个项目，不一定是一个gjf文件就能处理完，可能需要制造多个gjf文件，每个计算各取一些数据，形成想要的结果。这部分多看文献，根据需求灵活调整。

#### 批量化

1. 有大批量任务需要提交时，合理利用python和bash脚本可以批量生成gjf、提交、处理数据。需要一点编程基础，但不难，有需要时可单独找我。

# 本地Gemma3使用
1. 由于暂时没时间配置网页API，需要通过VSCode，进入https://code.visualstudio.com/Download，选择适合自己电脑的版本下载并安装。

2. 进入之后，安装SSH扩展，参考https://developer.aliyun.com/article/1626959。在安装SSH-Remote时，可顺便搜索"Chinese(Simplified)"，选第一个（作者是微软），安装后重启软件（右下角有重启提醒弹窗），可实现vscode界面全中文。

3. 按照教程进入SSH，注意将指令换为 
```
ssh username@ip # username和ip找我要
```
或者在ssh配置文件里新增：
```
Host yggroup-4070ti # 此项无所谓，只是个名字
    HostName ip # 组内服务器ip地址，勿改
    User username # 用户名，勿改
```
上面两种操作结果一致。

4. 系统选择linux，输入密码(找我要)。若界面运行一会儿后静止，且没有报错，说明已经进入。

5. 按Ctrl+`,可新建一个终端，即可与gemma3对话。

6. 关闭终端即可停止运行，一般可一直挂着，不耗本地资源。后续想进入服务器，可以看vscode界面左边的小电脑，可以一键进入。

7. 以上有不懂的地方或者报错的地方可以找我配置，图文教程弄起来有点麻烦。需要新模型或者改用户配置先和我打声招呼。