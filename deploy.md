# GitHub Pages 部署指南

## 快速部署步骤

### 1. 创建GitHub仓库
1. 登录GitHub账户
2. 点击右上角的 "+" 按钮，选择 "New repository"
3. 输入仓库名称（例如：metro-flow-simulator）
4. 设置为Public（公开仓库）
5. 点击 "Create repository"

### 2. 上传项目文件
有两种方式上传文件：

#### 方式一：通过GitHub网页界面
1. 在新创建的仓库页面，点击 "uploading an existing file"
2. 将以下文件拖拽到上传区域：
   - `index.html`
   - `style.css`
   - `script.js`
   - `README.md`
   - `.gitignore`
3. 添加提交信息："Initial commit"
4. 点击 "Commit changes"

#### 方式二：使用Git命令行
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的用户名/仓库名.git
git push -u origin main
```

### 3. 启用GitHub Pages
1. 在仓库页面，点击 "Settings" 选项卡
2. 在左侧菜单中找到 "Pages"
3. 在 "Source" 部分，选择 "Deploy from a branch"
4. 选择 "main" 分支
5. 选择 "/ (root)" 文件夹
6. 点击 "Save"

### 4. 访问您的网站
- 部署完成后（通常需要几分钟），您可以通过以下地址访问：
- `https://你的用户名.github.io/仓库名`

## 注意事项

- 首次部署可能需要5-10分钟才能生效
- 每次推送新代码后，GitHub Pages会自动更新
- 确保仓库是公开的（Public），私有仓库需要付费账户才能使用GitHub Pages
- 如果遇到404错误，请检查文件名是否正确，特别是`index.html`

## 自定义域名（可选）

如果您有自己的域名，可以在Pages设置中添加自定义域名。

## 故障排除

- **页面显示404**：检查仓库是否公开，文件是否正确上传
- **样式不显示**：检查CSS文件路径是否正确
- **JavaScript不工作**：打开浏览器开发者工具查看控制台错误

部署成功后，您就可以将链接分享给其他人，让他们直接在浏览器中使用地铁客流管理模拟器了！