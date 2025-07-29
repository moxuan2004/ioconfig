# GitHub Pages 部署故障排除指南

## 当前遇到的错误

如果您看到类似以下的错误信息：
```
Jekyll::Converters::Scss encountered an error while converting 'assets/css/style.scss':
No such file or directory @ dir_chdir - /github/workspace/docs
```

## 解决方案

### 方案1：确保正确的部署设置

1. **检查仓库设置**
   - 进入您的GitHub仓库
   - 点击 "Settings" 选项卡
   - 在左侧菜单找到 "Pages"
   - 确保 "Source" 设置为：
     - **Deploy from a branch**
     - **Branch**: main (或 master)
     - **Folder**: **/ (root)** （重要：不要选择 /docs）

2. **确保所有文件都在根目录**
   - `index.html`
   - `style.css`
   - `script.js`
   - `.nojekyll`
   - 其他所有项目文件

### 方案2：重新上传所有文件

如果问题仍然存在，请按以下步骤重新部署：

1. **删除仓库中的所有文件**（保留README.md可选）

2. **重新上传以下文件到根目录**：
   ```
   ├── index.html
   ├── style.css
   ├── script.js
   ├── .nojekyll          # 重要：防止Jekyll构建
   ├── .gitignore
   ├── README.md
   └── deploy.md
   ```

3. **确保.nojekyll文件存在**
   - 这是一个空文件
   - 文件名前有一个点(.)
   - 必须位于仓库根目录

### 方案3：使用GitHub Actions部署

如果上述方法仍不工作，可以创建自定义GitHub Actions工作流：

1. 在仓库中创建 `.github/workflows/deploy.yml` 文件
2. 内容如下：
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./
```

## 验证步骤

1. **检查Actions选项卡**
   - 在仓库中点击 "Actions" 选项卡
   - 查看是否有构建错误
   - 绿色勾号表示成功，红色X表示失败

2. **等待部署完成**
   - 首次部署可能需要5-10分钟
   - 后续更新通常需要1-3分钟

3. **访问网站**
   - `https://你的用户名.github.io/仓库名`

## 常见错误原因

- ❌ 选择了错误的部署文件夹（如 /docs 而不是 /root）
- ❌ 缺少 .nojekyll 文件
- ❌ 文件不在仓库根目录
- ❌ 仓库不是公开的（Private仓库需要付费账户）
- ❌ GitHub Actions被禁用

## 如果仍然无法解决

1. 尝试创建一个全新的仓库
2. 确保仓库名称不包含特殊字符
3. 联系GitHub支持或在GitHub Community论坛寻求帮助

---

**重要提示**：我们的项目是纯静态HTML/CSS/JavaScript项目，不需要Jekyll构建。.nojekyll文件的作用就是告诉GitHub Pages跳过Jekyll处理，直接部署静态文件。