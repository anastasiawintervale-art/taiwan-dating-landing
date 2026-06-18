# 元軒的生活筆記＋管理後台

项目包含：

- `index.html`：公开落地页
- `admin.html`：内容管理后台
- `supabase/setup.sql`：后台数据库与图片空间初始化脚本

## 连接后台

1. 在 Supabase 新建项目。
2. 打开 SQL Editor，执行 `supabase/setup.sql`。
3. 在 Authentication → Users 建立一个后台管理员账号，并关闭公开注册。
4. 在 Project Settings → API 复制 Project URL 与 anon public key。
5. 打开 `config.js` 填入：

```js
window.CMS_CONFIG = {
  supabaseUrl: "你的 Project URL",
  supabaseAnonKey: "你的 anon public key"
};
```

anon public key 可以安全地放在前端；不要把 service_role key 放进项目。

## 后台功能

访问 `admin.html`，登录后可以修改：

- LINE 加好友链接
- Meta Pixel ID
- TikTok Pixel ID
- 人物姓名、年龄、所在地、生日、身高、状态和标签
- 首屏、个人介绍、人物故事与转化文案
- 页头头像、首图和三张生活照

后台保存后，前台刷新即可更新，不需要重新部署 GitHub。

## GitHub Pages

将全部文件推送到 GitHub 仓库，在 Settings → Pages 中选择从主分支根目录部署。
