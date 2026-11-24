# QuietList

一个安静、轻盈的个人待办清单。记下想做的事，温柔地安排今天。

[打开 QuietList](https://quietlist-95t.pages.dev)

## 简单使用

- **今天**：放下今天想完成的事。没做完也没关系，可以移到今天，或放回待办池。
- **待办池**：收留暂时不想安排日期的事。
- **随手记录**：输入任务后按回车；点击任务可以添加备注和子项。
- **多设备同步**：在同步设置中生成口令，在另一台设备输入相同口令或扫描二维码。连接后自动同步，也可以共用一份清单。

QuietList 可以添加到手机主屏幕或安装为桌面应用。首次联网加载后，即使暂时离线，也可以继续使用本地清单。

## 关于数据

任务默认保存在本地。启用同步后，清单在设备上加密，服务器只保存密文。同步口令保存在设备的浏览器中；持有相同口令的人可以查看和修改同一份清单，请妥善保管。清除浏览器网站数据会移除本地数据和绑定，建议定期在同步设置中导出 JSON 备份；备份文件未加密。

## 本地开发

```bash
npm install
npm run dev
```

运行测试和生产构建：

```bash
npm test
npm run build
npm run preview
```

`npm run dev` 和 `npm run preview` 仅运行前端；同步接口需要 Cloudflare Pages Functions 和 D1。部署到 Cloudflare Pages 时，请先创建 D1 数据库，在 `wrangler.toml` 中配置数据库 ID，并执行 `migrations/0001_init_vaults.sql` 迁移。
