# CAICAIZI · 个人作品集

线上地址：https://ca1ca1z1.github.io/

## 当前状态
2026-10-26：旧 Hexo 网站已备份，新版重置为作品集筹备页。尚未录入项目、技能、简历等个人资料。当前使用纯 HTML/CSS，没有构建依赖。

## 文件
- index.html：首页文字和结构。
- style.css：颜色、字体、响应式布局。
- entrance-scene.js：Canvas 逐拍时间轴与绘制；一拍为 140 毫秒，全程约 11.6 秒。
- entrance.js：开场自动播放、减少动态效果及超时恢复。
- entrance.css：开场遮罩与首页过渡样式。
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

## 开场动画
进入首页自动播放；无跳过按钮、Esc 跳过功能或重播按钮。
每次进入、刷新或通过浏览器前进/后退返回首页都自动播放。系统“减少动态效果”偏好仅影响首页过渡，不再阻止开场播放。
浏览器不支持 Canvas 或 JavaScript 时直接展示主页。开场不使用视频、音频或外部依赖。
动画顺序：键入 CAICAIZI / PERSONAL PORTFOLIO → 四角向中心逐格展开 → LOGIN / SYSTEM → 滚动权限条 → 密码 → COM/AUT/VER/SUB → 圆形覆盖 → CHECK GREEN → 五列伸缩 → welcome! □□ → 反色与绿底 → 纯色收尾。
一“帧”沿用 140 毫秒的基准，并非显示器刷新帧。中间行方块每半拍移动一次，LOGIN 与 SYSTEM 显露速度也已加倍。调整 entrance-scene.js 的 BEAT_MS 可统一改变速度；T 中各阶段以拍计时。
进度条非线性增长，在 60% 和 90% 各停顿 6 拍（840 毫秒），第 78 拍达到 100%，保留 3 拍后随结尾消失。
GREEN 和上下线在各自消失后，隔半拍重现半拍再消失；welcome 的白底、绿底尺寸相同。主页与开场背景均为 #101010。
时序与交互检查：在项目目录运行 `node tests/entrance.test.cjs`，无需安装依赖。
不再包含六边形线框或旧 CA 图标。开场结束后进入原作品集首页。

## 后续创作
先整理真实项目材料（目标、个人职责、过程、成果、截图与链接），再设计正式作品集。
完整源文件已保存到 GitHub。未来引入框架时，也应提交源文件、配置和依赖锁文件。

