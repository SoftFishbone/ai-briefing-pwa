# 今日 AI · 每日简报

一个面向 AI 行业学生的极简工具感 PWA。前端由 React + Vite 构建，资讯数据存放在 `public/news.json`，GitHub Actions 每天自动读取公开 RSS 并提交更新。

## 本地运行

```bash
npm install
npm run dev
```

## 本地更新资讯

```bash
npm run update-news
```

RSS 源不可用时，脚本会保留上一份数据。第一版使用模板化摘要，不需要付费 API。

## 部署到 GitHub Pages

将仓库设置为公开，在仓库 Settings → Pages 中选择 GitHub Actions。每天的更新任务在 `.github/workflows/update-news.yml`，也可以通过 Actions 页面手动执行。
