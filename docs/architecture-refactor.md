# 白板專案架構調整與解耦紀錄 (V1.0 Refactored)

本文件紀錄了 2026-05-29 對於白板專案進行的架構解耦重構，說明重構內容、資料夾結構變更以及本次調整所帶來的架構優勢。

---

## 1. 架構變更對照

### 重構前 (Day 5 原始狀態)
- **單一檔案肥大**：`client/src/App.tsx` 承載了 UI 渲染、WebSocket 連線狀態、自動重連、Canvas 點擊/拖曳事件處理，以及所有的幾何運算（如 `createRectElement`、`isValidLine`）。
- **型別宣告重複**：`client/src/types.ts` 與 `server/src/types.ts` 完全相同，若未來通訊協議有欄位變更，容易因漏改其中一方而導致執行期崩潰。
- **無依賴約束**：前端元件與底層 Canvas 指令、網路同步邏輯高度耦合，無法進行獨立的單元測試。

### 重構後 (Day 5 重構穩定版)
- **Monorepo 工作區**：引入 `yarn workspaces` 機制，抽離並建立 `@whiteboard/shared` 共享模組。
- **三層職責解耦 (Client)**：
  1. **UI 視圖層 (`App.tsx`)**：僅負責工具列、按鈕、狀態列的排版與渲染。
  2. **繪圖幾何引擎 (`src/engine/drawing.ts`)**：專注於純幾何運算與元素創建，與 React 完全脫鉤。
  3. **狀態與同步層 (`src/hooks/useWhiteboard.ts`)**：封裝 React 狀態、Refs、WebSocket 生命週期與事件監聽。

---

## 2. 目錄結構演進

```bash
whileboard/
├── package.json               # 根目錄 Monorepo 定義 (yarn workspaces)
├── yarn.lock                  # 統一的管理鎖定檔
├── shared/                    # [NEW] 共享 core 包
│   ├── package.json
│   └── src/
│       └── types.ts           # 共享型別定義 (元素、WebSocket 訊息協議)
├── client/
│   ├── package.json           # 引入 @whiteboard/shared: *
│   └── src/
│       ├── App.tsx            # [重構] 輕量 UI，調用 useWhiteboard
│       ├── renderer.ts        # Canvas 繪圖渲染核心
│       ├── engine/
│       │   └── drawing.ts     # [NEW] 純幾何/數學運算 (create, validate, getCanvasPoint)
│       └── hooks/
│           └── useWhiteboard.ts # [NEW] 狀態、Refs、WebSocket 協定處理
└── server/
    ├── package.json           # 引入 @whiteboard/shared: *
    └── src/
        ├── server.ts          # WebSocket 主伺服器
        └── roomStore.ts       # 房間狀態與 Operation 記憶體儲存
```

---

## 3. 架構調整的好處與長遠價值

### 好處一：單一事實來源 (Single Source of Truth)
- **說明**：將 `types.ts` 抽離至 `@whiteboard/shared`。
- **價值**：解決了 Client 與 Server 之間的通訊協定（Payload 欄位）重複宣告問題。未來如果新增或修改圖形屬性（例如為矩形新增旋轉角度 `rotation`），只需在 `shared/src/types.ts` 修改一次，Client 與 Server 端編譯時即會自動同步型別約束，徹底杜絕了拼字錯誤或漏改造成的網絡同步 Bug。

### 好處二：提昇本機開發與熱更新 (HMR) 速度
- **說明**：得益於 `@whiteboard/shared` 在 workspace package.json 中將 `main` 與 `types` 直接指向 `src/types.ts` 源碼，免去了額外的構建（Build/Watch）步驟。
- **價值**：Vite 可以在啟動時以 bundler 模式直接解析該連結。在開發過程中，對型別的修改能瞬間反映在 `client` 和 `server` 中，且不會阻塞 Vite 的熱模組替換（HMR）速度，維持極速的本地開發體驗。

### 好處三：運算與視圖解耦，支援未來效能擴充
- **說明**：將純 Canvas 運算抽離至 `engine/drawing.ts`。
- **價值**：
  - **單元測試可行性**：這些函數沒有任何 DOM 依賴或 React Hook 依賴，可在無頭環境（Headless / Node.js）下直接執行幾何相交與邊界驗證測試。
  - **為 Worker 鋪路**：幾何運算與 React UI 的物理隔離，使得我們在後續階段（如第 6 階段）將 SceneGraph 與渲染管線搬入 `WebWorker` (OffscreenCanvas) 時，不需要修改任何 UI 組件的邏輯。

### 好處四：封裝複雜度，讓 UI 組件保持純粹
- **說明**：利用自訂 Hook `useWhiteboard` 隱藏了複雜的 WebSocket 監聽事件、自動重連重試次數、樂觀更新去重 (`appliedOpIdsRef`) 等邏輯。
- **價值**：`App.tsx` 如今只是一個簡單的「視圖渲染殼」，行數大減。UI 設計師或前端開發者可以自由調整工具列的 CSS、排版或按鈕樣式，而不用擔心不小心改動到核心的繪圖同步狀態機。
