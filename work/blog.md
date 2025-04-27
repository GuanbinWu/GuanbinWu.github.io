# 目录
[DFT教程](#dft计算粗略流程) [本地Gemma3](#本地gemma3使用) [slurm安装](#ubuntu-24.02-lts-单机slurm安装) [高斯报错](#高斯计算报错) [g16安装](#g16安装) [TEM数据处理与晶格测量](#tem晶格测量) [Origin设置](#origin设置) [Linux下GROMACS安装](#gromacs安装) [GROMACS运行与踩坑记录](#gromacs使用)

# DFT计算粗略流程

#### 总流程
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
- [官方书《电子结构方法》第二版的某个大佬的阅读笔记](https://scc.ustc.edu.cn/zlsc/jsrj/201011/W020101108388633812337.pdf)
- [可关注Sobereva大佬的博客](http://sobereva.com/)，他经验丰富，而且开源搞得好，不过还是尽量多读论文，依赖一群人好过依赖一个人。
- [科音论坛](http://bbs.keinsci.com/forum.php)，但我看培训介绍，好像要参加科音的培训班才能注册论坛账号？不太清楚，需进一步了解。有条件的同志可以参与到社区里，互帮互助。

2. 命令行运行```g16 ./xxx.gjf``` xxx.gjf是你的文件路径，即可提交给高斯16进行计算。会生成相应的```xxx.log```文件，即可分析数据。但注意，这个操作调用不了集群资源，算力很低。而且SSH连接中断（网络掉了，关闭了vscode窗口等操作）会导致任务中断。使用 ```nohup &```可以临时解决任务中断问题，但仍然无法享用算力。因此，建议按照下方操作调用集群，发送给服务器后台。

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
    解释：前面几个参数调用的是slurm集群的sbatch命令，指定参数提交计算作业，例如```-c 16```调用16个CPU核心，```--mem=48GB```调用48G内存，此配置可根据需要写。```/home/wgb/DFT```是工作目录，很重要！一般都用gjf所在的文件夹目录，决定了输出文件的位置，不要乱写，如果误写，轻则需要去另一个文件夹找结果，重则损坏另一个文件夹下甚至别人的文件。```/home/wgb/DFT/mol0_jobs.sh``` 是jobs.sh的路径。这个例子里，有三个jobs.sh文件被提交给了服务器。各用16cpu + 48g内存。

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
    则可读取当前结构收敛后的电子能。将"SCF Done"换为其他对应关键词，可以读取其他结果，例如HOMO LUMO GTC等等。本质上就是在log文件里进行文本搜索（grep）。当然这里也可以利用python molop模组进行自动化读取与计算。这个模组在github开源，要用```git clone```下载。具体模组用法，特定任务的脚本可找我配（我也有可能是现场搜，多读官方文档）。

4. 对于一个项目，不一定是一个gjf文件就能处理完，可能需要制造多个gjf文件，每个计算各取一些数据，形成想要的结果。这部分多看文献，根据需求灵活调整。

#### 批量化

1. 有大批量任务需要提交时，合理利用python和bash脚本可以批量生成gjf、提交、处理数据。需要一点编程基础，但不难，有需要时可单独找我。

# 本地Gemma3使用
1. 由于暂时没时间配置网页API，需要通过VSCode，进入https://code.visualstudio.com/Download，选择适合自己电脑的版本下载并安装。（前几天研究了一下网站搭建。域名、备案啥的不是很难，但都挺麻烦，而且小贵，要是忘了挂备案号还可能进局子。暂时没功夫搞这个，性价比不高。等以后有钱有闲搞个人网站了再考虑搭建大模型接口吧，到时候给小范围的几个朋友用。现在这个github.io代理的静态博客上限1G，我尽量就只写文字了，以后可能会有个人网站，maybe。----2025.04.07）

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

# Ubuntu 24.02 LTS 单机slurm安装
1. 网上教程挺多，这个[教程](https://www.cnblogs.com/luk/p/18673674)总体最有效，可以顺着做下来。但一开头
    ```
    sudo apt install slurm-wlm slurm-wlm-doc -y
    ```
    返回无法定位软件包。 尝试在这之前
    ```
    sudo apt install slurm slurmctld slurmdbd munge
    ```
    貌似解决问题了。因为搜了很多其他教程，历史操作较杂，无法确定具体是什么生效。
    munge配置教程参考这个[教程](https://www.cnblogs.com/haibaraai0913/p/11016885.html)，但```su munge```这一步时需要```usermod -s /bin/bash munge```

# 高斯计算报错
1. 可全面参考[教程](http://bbs.keinsci.com/thread-4829-1-1.html)。l101.exe报错有时会出现电荷和自旋多重度错误，返回程序希望输入整数。貌似只在PyCharm里编写gjf文件时出现，原因不明，vscode里重写电荷这行即可。

# g16安装
1. 网上任意教程均可，都差不多。配置共享高斯可参考[这个](http://bbs.keinsci.com/thread-14301-1-1.html)，简单来讲，用root执行所有安装，新建一个gaussian组，将安装目录所属改为root:gaussian，使用者加入gaussian组即可。注意两个问题，安装路径必须是750权限（高斯特性，777不让用）；用户加入组后需重新登录才生效，如果还是无权限，说明登录信息没清空，```newgrp gaussian```有效，用```id```查看是否真的进组。

# TEM晶格测量
1. 下载DigitalMicrograph软件。进入[https://www.gatan.com/complimentary-digitalmicrograph-36-software-post-covid-19](https://www.gatan.com/complimentary-digitalmicrograph-36-software-post-covid-19)跟随指引，填写申请书。邮箱能否接受到Gatan的邮件有点玄学，几个经验可增加成功率。一要用学号邮箱不要用qq邮箱。二，可能在邮件垃圾箱里。三，填申请书时，最后两栏是问你是否接收他们的资讯（即广告），都选Yes，曾试过两个都选No，一直没动静，选择Yes重新提交后邮件立马来了。
2. 如果是在Yifei Xu老师处测试，会拿到```.dm5```后缀的文件。将其拖入软件即可下一步。如果是送样，可能会收到```.tiff```文件，拖进软件后需要做如下操作，将其转化为软件能处理的格式。不然无法做FFT（傅里叶转换）。
    - 选中图象窗口。
    - 左上角工具栏选择Edit（File右边一个），Change Data type...
    - New Data Type改为integer，选择Unsigned。Btyes改为1。
    - OK。
    - 弹出新窗口，选择Brightness。
    - OK
3. 标尺校正。如果是```.dm5```文件，应该是不需要校正的，自带标尺信息。如果是```.tiff```文件，图片里应该已经显示测试方做的标尺，这会成为我们校正尺度的依据。如果没有，找测试方重新打上标尺，不然也放不了文章。
    - 选中图象窗口。
    - 工具栏选择Microscope，选Calibrate Image...。
    - 此时会弹出一个窗口，同时图像上多一根红线。
    - 点击红线两端，移到现有标尺的左右侧，与之对齐，越准越好。按shift可保证水平。
    - 窗口中选择Known length。
    - 填写现在标尺对应的长度，注意单位，“祄”我记得是埃。拿不准统一用nm，换算一下的事。
    - 校正完毕。
    - 基本原理做一遍下来你应该也能悟到了，不多说了。
4. 晶格测量。
    - 按住中键可拖动图象，滚轮可缩放。
    - 先用肉眼看可能有晶格的地方。
    - 确定考察位点后，右键，选择ROI。选矩形，然后框出你想测量的地方。ROI有其他形状，可以自己去玩一玩，不赘述。
    - Process，FFT。弹出FFT后的衍射光斑。自行调整亮度、对比度等，使光斑显眼。如果一团糊，则是无定形。
    - 右键，Mask，点击离中心最远处的两个光斑。这里的理论知识可看教材，简单讲，这是一个倒空间，光斑距离越远，对应的晶格间距越小。最远处就对应晶胞了（受仪器分辨率限制）。
    - Process，Aplly Mask。默认选项即可，直接OK。此时可以看看光斑是否选准。
    - Process, Inverse FFT。生成处理后的晶格图象。斑马条纹状。
    - 右键，Profile。可在图像上画一条直线。这就是你的测量位置。尽可能保证直线和条纹垂直，尽可能选择条纹清晰、波动少的地方，尽可能穿越10个条纹以上。
    - 弹出Profile图象。简单来讲，这个图横轴就是你画的直线。纵轴对应斑马条纹的亮度。显然，一格（峰到峰，谷到谷）就对应一个晶面间距d。
    - 单击选择11个峰，中间应该有10格。读出距离数值除以10便是晶格间距d。（这里的11是习惯，采样够多，口算也方便，没有硬性规定）尽可能选择亮度相近的峰。软件给出距离，依靠之前的标尺校正得到，所以要把校正做准。

5. 保存图象。这软件调字号线宽啥的，操作很鬼畜，不建议用它输出成品。一种办法是：TEM图象选了ROI后，右键，Save Display as，可以导出一张带ROI范围（线宽可能很细，多找找）和标尺的图象。然后你去其他软件里按照这个图的信息，结合原始图像重新画一遍标尺和标注，但手艺要精准点，不要影响数据准确性。衍射光斑图象记得对应给出，这是一套数据。右键，Save Display as 即可。

6. 分析数据。一般来说有了晶格间距，进一步地我们想知道它是哪种物质的哪个晶面。便于文章展示与分析。关于它是哪个物种，只能靠已知信息，如果是新物种，需要结合其他表征手段猜测成分，单靠TEM无法反推物质是啥。知道或者假定了物种之后，去相关数据库搜索该物种，查询各个晶面的间距，看看你的数据能否对应上。或者查文献，看看别人的TEM指认信息，或许可以参考。小心一个事，对于同一个物种，有些面是高概率出现的，有些面虽然也收录了数据，但出现的概率较低，所以不要想着自己的间距和数据库某个值对应地很准就万事大吉了。一个简单的办法是，看看在XRD里，这个面的峰强是否明显，如果是几个主峰之一，指认基本可接受。更严谨的做法得找找无机相关专家请教了。

7. 可用数据库（我经验不多，后续遇到新数据库再挂上来）：
    - [https://www.crystallography.net/cod/browse.html](https://www.crystallography.net/cod/browse.html)
    
    参考的网络教程：
    - [https://www.shiyanjia.com/knowledge/articleinfo-1108.html](https://www.shiyanjia.com/knowledge/articleinfo-1108.html)
    - [https://www.bilibili.com/video/BV1kB4y1K74v/?vd_source=902d376e8c57e21a3e4b718f6f0abf6f](https://www.bilibili.com/video/BV1kB4y1K74v/?vd_source=902d376e8c57e21a3e4b718f6f0abf6f)

    黑名单：
    - [http://cmjce.com/fwzx/zs/20191211/155.html](http://cmjce.com/fwzx/zs/20191211/155.html)   (这个教程不做FTT直接用Profile拉条线去测晶格间距，可靠性存疑，不推荐模仿)

# Origin设置
1. Crtl+J 复制图象到office软件中，使图形不发生缩放：
```
Preference -> System Variables ：ems = 0
```

2. Origin中调整画布大小时，字号会自动跟随缩放，但有个问题。缩放后的字号是小小数，但显示为取整的字号。这会造成了1字号范围内的差异。平时注意不到，细看会发现字号参差不齐。因此可以取消自动缩放：
```
Preference -> System Variables ：PSM = 100
含义：当页面尺寸变化幅度<=PSM %时，文字字号不会自动变化。
```

# GROMACS安装
1. 安装GROMACS(gmx)前，先准备cmake和fftw。
2. cmake。不要直接用```sudo apt install cmake```因为下载下来是3.16版本，GROMACS 2024.5需要3.18以上。当然也可以考虑用低版本的GROMACS，但我看gmx官方的长期支持版就是2024。所以建议手动安装新版cmake。过程如下：
```
进入https://cmake.org/download/。选择合适的版本，确定下载链接。
wget https://github.com/Kitware/CMake/releases/download/v4.0.1/cmake-4.0.1-linux-x86_64.tar.gz
tar -xvf xxx/cmake-xxx.tar.gz
cd xxx/cmake-xxx
./bootstrap
make
sudo make install
```
一切操作都可以在用户目录下完成，因为make install 用了sudo，所以最后的cmake会在/usr/local/下完成安装，可公共使用，自己编辑一下环境变量即可。
```
export PATH=/usr/local/cmake-4.0.1-linux-x86_64/bin:$PATH
```
2. 安装fftw。可参考[博客](https://www.cnblogs.com/wcxia1985/p/17853846.html)
但有几个大问题。我试了很多次，```make```和```sudo make insatll```都能正常运行，但/usr/local/下就是没有fftw执行文件。```which fftw```也找不到结果。但运行完一遍fftw的安装后，再运行gmx安装，就不会报错了，貌似gmx能找到不知道安装到哪里去了的fftw。

3. gmx安装：参考[官方文档](https://manual.gromacs.org/2024.5/install-guide/index.html)，cmake一行记得把后面两个参数删掉，直接```cmake```即可。完毕后检查/usr/local/下是否有gromacs文件夹即可。然后配置环境：
```
export GMXBIN=/usr/local/gromacs/bin
export GMXLIB=/usr/local/gromacs/lib
export GMXDATA=/usr/local/gromacs/share/gromacs/top
export PATH=/usr/local/gromacs/bin:$PATH
```
能which到gmx说明成功。

# GROMACS使用
主要针对有机小分子溶液相混合问题。

1. 材料文件生成：确定体系内有哪些分子，Gview里准备好各物种的mol2文件，用Multiwfn的RESP.sh脚本做chg文件，拿到原子电荷。参考[教程](http://sobereva.com/476)。

```
RESP.sh mol.mol2 0 1 gas
```

2. 用Sobtop生成各分子拓扑文件。一个分子出三个文件。```.top```,```.itp```,```.gro```。参考[官方教程](http://sobereva.com/soft/Sobtop/#FAQ)
在生成文件时，先选7指定chg，就可以自动加入原子电荷。具体地，每一步选哪个选项，Sob老师已经写了，忘了去查。

```
指定chg：选 7 10

产生gro文件：选 2

产生itp文件：选 1 2 4

```

3. 制作topol.top文件，记录整个混合系统的拓扑信息。几个关键点，一，要手动写[ default ]字段，二，记得将各itp文件的[ atom type]字段剪切到include之前并去重。记得对每个分子重新规定Resname。不然后面分组讨论出数据时无法指定到具体分子。

4. 制作盒子。试过用pcakmol脚本做，但貌似做出来的分子顺序不太对，可能是我操作问题，后面再优化，这里记录一下用gmx制作盒子的过程。

```
gmx insert-molecules -ci mol1.gro -nmol 10 -box 10 10 10 -o box.gro 
```

这里已经自动加入了mol1了。

5. 加其他分子。

```
gmx insert-molecules -f box.gro -ci mol2.gro -nmol 10 -o new_box.gro 
```

重复之，使想要的分子均在盒子里。

6. 水溶剂的引入教程遍地都是，但我们用得少，暂时没研究。盐的引入后面再考虑，走通了再写在这里。

补充：KPF6为例，直接用sobtop做出拓扑文件。用RESP.sh计算PF6-阴离子的原子电荷，手动copy到KPF6.itp文件里，K电荷为+1。然后以加入分子的形式加入KPF6。

7. 能量最小化。

```
gmx grompp -f em.mdp -c box.gro -p topol.top -o em.tpr
gmx mdrun -deffnm em
```

8. NVT与NPT

NVT：


```
gmx grompp -f nvt.mdp -c em.gro -p topol.top -o nvt.tpr
gmx mdrun -deffnm nvt
```

NPT：


```
gmx grompp -f npt.mdp -c nvt.gro -p topol.top -o npt.tpr
gmx mdrun -deffnm npt
```

9. 模拟

```
gmx grompp -f md.mdp -c npt.gro -p topol.top -o md.tpr
gmx mdrun -deffnm md
```

10. 几个问题：

" The X-size of the box (6.655719) times the triclinic skew factor (1.000000) is smaller than the number of DD cells (8) times the smallest allowed cell size(0.833498)。"

简单来讲，盒子太小、细分太高。

扩大盒子尺寸：
```
gmx editconf -f box.gro -o new_box.gro -box 7 7 7
```
或降低DD单元格数目：
```
gmx mdrun -ntmpi 4
```

```
gmx dump -s md.tpr > 1.txt
# 查看盒子大小
```

11. VMD可视化：

加载gro文件后再加载trr轨迹文件即可。如果出现奇怪的条纹，说明周期性边界PBC设置不当。处理之。
```
gmx trjconv -s md.tpr -f md.trr -o md.trr -pbc mol -center 

# -pbc mol 保持每个分子整体不被切割，把主分子放到盒子中心。
# 补充：应当在md模拟完之后便做此修正，后续输出数据用修正后的trr
```


12. 输出一般数据，判断体系是否到达稳态，可据此调整步长和时间。

（1）体系能量：

```
gmx energy -f md.edr -o min-energy.xvg
```

（2）体系密度：

```
gmx density -s topol.tpr -f md.trr
```

（3）RMSD 均方根偏差：

```
gmx rms -s topol.tpr -f traj.xtc -o rmsd.xvg
```

13. RDF分析。rmax和cut-off保持一致会比较好（个人直觉）。起止时间根据上一条体系到达稳态来确定。

（1）做索引文件：

```
gmx make_ndx -f md.tpr -o index.ndx
```
（2）RDF:

```
gmx rdf -f md.xtc -s md.tpr -n index.ndx -o rdf.xvg -cn rdf_cn.xvg -bin 0.01 -b 1000 -e 2000 -rmax 1

#-f md.xtc：指定轨迹文件。 没有xtc用trr
#-s md.tpr：指定参数文件。
#-n index.ndx：指定索引文件，定义了感兴趣的原子组。
#-o rdf.xvg：输出RDF结果文件。
#-cn rdf_cn.xvg：输出配位数结果文件。
#-bin 0.01：设置RDF的bin宽度（nm）。
#-b 1000：设置计算开始时间（ps）。
#-e 2000：设置计算结束时间（ps）。
#-rmax 1：最大半径（nm）。
```



12. 几个不涉及蛋白的教程，可参考：[一](https://www.x-mol.com/groups/Dong/news/2027) [二](https://zhuanlan.zhihu.com/p/571601988)
13. 比较全面的中文教程，可惜集中于蛋白和多肽，供参考。[三](https://jerkwin.github.io/9999/10/31/GROMACS%E4%B8%AD%E6%96%87%E6%95%99%E7%A8%8B/)
14. 出RDF数据教程参考：
[1](https://manual.gromacs.org/current/onlinehelp/gmx-rdf.html) [2](http://bbs.keinsci.com/thread-6962-1-1.html) [3](http://bbs.keinsci.com/thread-7508-1-1.html) 