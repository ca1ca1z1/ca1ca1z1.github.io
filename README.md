# CAICAIZI · 个人作品集

线上地址：https://ca1ca1z1.github.io/

## 当前状态
2026-10-26：旧 Hexo 网站已备份，新版重置为作品集筹备页。尚未录入项目、技能、简历等个人资料。当前使用纯 HTML/CSS，没有构建依赖。

## 文件
- index.html：首页文字和结构。
- style.css：颜色、字体、响应式布局。
- 404.html：失效链接的提示页。
- .nojekyll：让 GitHub Pages 直接提供静态文件。

## 预览与更新
可直接用浏览器打开 index.html 预览首页。404 页使用根路径，须通过 HTTP 服务器预览。
修改文件后提交到本仓库 main 分支；GitHub Pages 保持 Deploy from a branch → main → / (root)。
到 Actions 查看 pages build and deployment 是否成功，再刷新线上页面。
本地保存不会自动上传。

## 旧版备份与恢复
备份分支：backup/hexo-2026-10-26
备份提交：97cbc2f387b00751e8f1f2feb3de633c1d160cf7
备份地址：https://github.com/ca1ca1z1/ca1ca1z1.github.io/tree/backup/hexo-2026-10-26

备份包含当时发布的 HTML、CSS、JS 和图片，不含已遗失的原始 Hexo Markdown 工程。
旧文章 URL 不再提供原内容，将显示 404 提示页。

若需恢复，可将备份分支的文件树作为一个新提交恢复到 main，保留后续历史；
也可临时把 Settings → Pages 的发布分支切换为 backup/hexo-2026-10-26，目录仍选 / (root)。
不要删除备份分支。

## 后续
先整理真实项目材料（目标、个人职责、过程、成果、截图与链接），再设计正式作品集。
完整源文件已保存到 GitHub。未来引入框架时，也应提交源文件、配置和依赖锁文件。
