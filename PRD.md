# PRD — QuietList（极简低焦虑待办清单）

## 1. 产品定位与核心原则

**一句话定位**：一个零注册、跨平台、低焦虑、默认只有一行输入的平静清单（Warm Paper 级极简审美 + 端到端加密同步）。

### 核心设计哲学（Opinionated Design）
1. **更少的选择**：不提供多级文件夹、P1–P4 优先级、自定义标签、复杂过滤器与繁杂设置页，用克制的默认规则替代配置项。
2. **零负罪感**：彻底移除刺眼的红色“已逾期 X 天”警告，改用**温柔滚存（Gentle Rollover）**与**30 天自动清理已完成**，让清单永远保持轻盈。
3. **3 秒捕获**：无论桌面端还是移动端，从产生念头到录入完成控制在 3 秒内，零弹窗打断心流。
4. **本地优先 & 零知识同步**：所有读写直接操作 `localStorage`（0ms 同步渲染）；开启多端同步时，整份清单在浏览器本地加密为单个小体积密文包，通过 Cloudflare 边缘节点极速同步。

---

## 2. 视图与信息架构（2 + 1 极简结构）

应用全局仅保留两个主视图与一个折叠区，无复杂侧边栏：

1. **Today（今天 — 默认首屏）**
   - 仅展示 `list === 'today'` 且 `scheduledDate === 今日` 的未完成任务。
   - **温柔滚存条（Gentle Rollover Bar）**：位于列表最顶部。当检测到 `list === 'today'` 且 `scheduledDate` 早于今日的未完成任务时自动浮现（轻灰底色 + 暖琥珀圆点），提示“昨天还有 N 件事未完成”。支持一键**移入今天**、一键**放回待办池**，或点击展开逐条挑选。
   - **温和专注提示**：当 Today 任务超过 5 条时，仅在副标题旁以极低对比度文字轻柔提示，不限制添加。
2. **Anytime（待办池）**
   - 存放所有尚未确定执行日期的灵感与待办事项。
   - 支持单键或单手滑动将任务快速移入 Today。
3. **Done（已完成 — 默认折叠 + 30 天自动清理）**
   - 位于当前视图最底部，默认收起为一行弱提示（如 `已完成 4 项`），点击可展开查看或撤销恢复。
   - **自动瘦身机制**：每次应用启动及同步合并时，自动静默清理 `completedAt` 或 `deletedAt` 超过 **30 天**的记录，确保用户总数据量长期稳定在 10–50 KB 以内。

---

## 3. 核心交互规范

### 3.1 极速捕获（3 秒录入）
- **桌面端**：列表顶部常驻极简行内输入框；页面无焦点时按 `N` 或 `Space` 直接聚焦，输入后按 `Enter` 立即创建并保持焦点支持连续录入。
- **移动端**：输入触发栏固定在**屏幕底部（大拇指热区）**，支持单手快速呼出。
- **克制的自然语言解析（Phase 4）**：仅识别高频日期词（如“今天/明天/明早/周五/下周一”），高亮为 `--accent-soft` 胶囊；按 `Backspace` 一键取消解析还原为纯文本。

### 3.2 渐进式披露与零弹窗编辑（Expanded Lift）
- **默认收起态**：每条任务仅显示「圆形复选框 + 单行标题」；若有备注或日期，仅在行尾以 `--text-tertiary` 展示极弱的图标或短日期。
- **行内展开态**：点击任务文字区域（非复选框）触发原地平滑浮起为 `--bg-surface` 卡片（无模态弹窗），展示：
  - 可直接编辑的标题
  - 自适应高度的备注输入框
  - 极简子项（Checkbox 列表）
  - 底部极简工具栏：快捷日期切换（今天 / 明天 / 待办池）、弱化删除按钮
- 点击卡片外部或按 `Esc` / `Cmd+Enter` 平滑收起。

### 3.3 勾选完成与 1.5 秒宽限期
- 点击复选框立即触发弹簧缩放与 SVG 对勾绘制动画，标题褪色并自左向右划出删除线。
- 任务以 `opacity: 0.55` 原地停留 **1.5 秒**（宽限期内再次点击可直接撤销，消除误触慌张感）。
- 1.5 秒后高度与透明度平滑归零并移入 Done 折叠区，屏幕底部弹出轻提示 Toast（`已完成 · 撤销 ⌘Z`，3 秒自动消失）。

### 3.4 桌面快捷键与移动端手势
- **桌面快捷键**（非输入状态下生效）：
  - `N` / `Space`：新建任务
  - `↑` / `↓`：上下移动焦点行
  - `Enter` / `E`：展开编辑当前焦点任务
  - `D`：勾选完成当前焦点任务
  - `T`：在 Today 与 Anytime 之间切换当前任务
  - `1` / `2`：切换 Today / Anytime 视图
  - `Cmd/Ctrl + Z`：全局撤销最近一次操作（完成、删除、移动）
  - `Esc`：收起展开卡片或取消输入焦点
- **移动端手势**：
  - 右滑超过 `64px`（触发轻震动反馈）：标记完成
  - 左滑超过 `64px`：切换 Today / Anytime
  - 长按拖拽：调整列表顺序

---

## 4. 免注册端到端同步架构（$0 成本方案）

### 4.1 用户体验流（无账号、可定制、扫码即连）
1. **默认纯本地**：首次打开零注册、零弹窗，直接写待办，数据实时持久化至 `localStorage`。
2. **开启同步（右上角云朵图标）**：
   - **一键生成诗意口令**（默认推荐）：例如 `amber-moss-river-7492`（4 词组合高熵随机串）。
   - **自定义专属口令**：支持用户输入个人定制暗号（前端强制校验长度不少于 12 个字符且非弱口令，防止撞库）。
   - 提交口令时利用标准 `<form>` + `autocomplete="current-password"`，自然唤起浏览器/iCloud 钥匙串免费托管保存，降低遗忘风险；同时提供“一键导出/导入 JSON 备份”作为终极兜底。
3. **跨设备接入（魔法二维码）**：
   - 生成包含 URL Fragment 的二维码：`https://<domain>/#sync=<passphrase>`。
   - 另一台设备扫码打开后，前端从 `window.location.hash` 读取口令（`#` 后内容永不发往服务端日志），自动拉取解密并合并本地清单，随即调用 `history.replaceState` 清除地址栏 hash 防止截图泄露。

### 4.2 零知识加密与单表 D1 设计
用户口令永远留在本地浏览器，通过原生 Web Crypto API 派生两把独立凭证：
- `sync_id`：`SHA-256(passphrase + ":quietlist:id:v1")` 的 64 位十六进制哈希，用于定位云端记录。
- `aesKey`：`PBKDF2-HMAC-SHA256`（100,000 次迭代，盐值为 `sync_id`）派生的 AES-GCM 256 位密钥，用于对整个任务 JSON 加密（每次上传生成全新 12 字节随机 IV）。

**Cloudflare D1 极简单表（当强一致 KV 使用，免费额度 10 万次写入/天）**：
```sql
CREATE TABLE IF NOT EXISTS vaults (
  sync_id TEXT PRIMARY KEY,
  ciphertext TEXT NOT NULL,      -- Base64 编码的 { v: 1, iv, ct } 密文包
  version INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL    -- 服务端写入毫秒时间戳
);
```

### 4.3 数据模型与 30 行极简合并算法
```ts
export type ListType = 'today' | 'anytime';

export interface Subtask {
  id: string;        // UUID v4
  title: string;
  completed: boolean;
  order: number;
}

export interface Task {
  id: string;                    // UUID v4
  title: string;
  notes: string;
  list: ListType;
  scheduledDate: string | null;  // 本地 'YYYY-MM-DD'
  subtasks: Subtask[];
  order: number;
  completedAt: number | null;    // Epoch ms
  createdAt: number;             // Epoch ms
  updatedAt: number;             // Epoch ms（同步合并依据）
  deletedAt: number | null;      // 软删除墓碑（30 天后自动清理）
}
```

**全量 JSON 合并与乐观锁（CAS）流程**：
1. 每次编辑立即写 `localStorage`，并触发防抖同步（800ms）；页面启动、切回前台（`visibilitychange`）或断网重连（`online`）时自动拉取同步。
2. `GET /api/sync?id=<sync_id>` 拉取云端密文与 `remoteVersion`，在本地解密为 `remoteTasks`。
3. 以 `id` 为键合并 `localTasks` 与 `remoteTasks`：同 `id` 保留 `updatedAt` 更大者（相等时以云端为准保证多端收敛），随后过滤清理 `completedAt` / `deletedAt` 超过 30 天的旧条目。
4. 加密合并结果并调用 `PUT /api/sync`（携带 `expectedVersion: remoteVersion`）。若服务端返回 `409 Conflict`（另一台设备刚好同时写入），自动重新拉取、合并并重试（最多 3 次）。

---

## 5. 四阶段开发路线图

- **Phase 1 — 极简核心交互（纯本地 `localStorage`）**
  - 初始化 Vite + React + Tailwind 项目与 `tokens.css`。
  - 实现 `localStorage` 持久化与 30 天自动清理、Today / Anytime / Done 视图、行内创建、Expanded Lift 行内展开编辑（含备注与子项）、1.5 秒宽限期勾选动画、温柔滚存条、全局撤销栈与桌面快捷键。
- **Phase 2 — 视觉精修、主题与移动端触感**
  - 完善浅色/深色主题切换（跟随系统 + 手动切换）。
  - 集成 Framer Motion 布局过渡动画与 `@dnd-kit` 丝滑拖拽排序。
  - 适配移动端底部拇指热区输入栏与左右滑动手势。
- **Phase 3 — Cloudflare Pages Functions + D1 零知识同步**
  - 实现 Web Crypto 端到端加密模块、随机诗意口令生成与自定义校验、魔法二维码（`#sync=`）接入与 JSON 导入导出兜底。
  - 编写 `functions/api/sync.ts` 与 D1 单表 CAS 读写接口，接入客户端防抖同步与 `409` 冲突自动重试合并。
- **Phase 4 — PWA 沉浸安装与克制日期解析**
  - 配置 `vite-plugin-pwa`（Manifest + 离线缓存，支持手机“添加到主屏幕”与桌面独立窗口）。
  - 加入零依赖的中英文轻量自然语言日期解析器（支持 `Backspace` 撤销解析）。
