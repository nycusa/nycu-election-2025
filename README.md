# 國立陽明交通大學學生會 選舉投票系統 (2025)

這是一個專為國立陽明交通大學學生會選舉設計的線上匿名投票系統。系統採用前後端分離的混合架構，前端由 GitHub Pages 提供服務，後端則由 Google Apps Script 驅動，旨在提供一個安全、可靠、具匿名性且可被稽核的投票解決方案。

開發者：[蔡秀吉](https://www.facebook.com/thc1006) @thc1006

## ✨ 核心功能

* **安全認證：** 採用「魔法連結 (Magic Link)」認證機制。使用者輸入學校信箱後，系統會發送一封包含一次性、有時效性的專屬投票連結的郵件，確保只有本人能投票。
* **完整匿名性：** 系統架構將「投票者身份」與「選票內容」在兩個獨立的資料庫中分離儲存。後端透過不可逆的哈希運算對投票者 ID 進行加密，確保即使是系統管理員也無法回溯單張選票的投票人。
* **一人一票完整性：** 後端會即時驗證投票連結的有效性，並在投票完成後立刻將其作廢，從根本上杜絕重複投票。
* **客製化投票介面：** 提供專業、美觀且資訊完整的投票頁面，完整呈現候選人資料與政見，並引導使用者完成投票。
* **自動化流程：** 從請求投票連結、寄送郵件、驗證身份到計票，整個流程高度自動化，減少人為操作失誤。
* **可稽核與視覺化：** 投票結果可輕易地透過外部程式（如 Google Colab）進行最終計票與數據視覺化，產生官方報告。

## 🛠️ 系統架構

本系統採用**前後端分離的混合架構 (Hybrid Architecture)**，以兼顧部署彈性、載入速度與後端安全性。

* **前端 (Frontend) - GitHub Pages:**
    * 使用者互動介面 (`login.html`, `vote.html`) 是作為一個靜態網站在 GitHub Pages 上託管。
    * 優點是能提供一個專業、簡潔的官方網址（例如 `https://nycusa.github.io/nycu-election-2025/login.html`），並且擁有全球 CDN 加速，載入速度快。

* **後端 (Backend) - Google Apps Script API:**
    * `Code.gs` 檔案被部署為一個純粹的後端 API (Web App)，是整個系統的邏輯核心。
    * 它不負責呈現任何網頁，僅專職處理來自前端的資料請求、驗證身份、與 Google Sheets 資料庫溝通、並寄送郵件。

* **資料庫 (Database) - Google Sheets:**
    * **`[資料庫] 選民與驗證碼`**: 儲存所有具備投票資格的使用者名單、信箱、投票狀態及一次性的登入權杖。
    * **`[票箱] 匿名投票結果`**: 儲存經過哈希匿名化處理後的投票紀錄。

* **通訊方式 (Communication):**
    * 前端透過 **JSONP** (`GET` 請求搭配 callback 函式) 的方式，安全地對後端 Apps Script API 進行跨網域呼叫，以繞過瀏覽器的同源政策限制 (CORS)。

## 🚀 部署指南

部署流程分為「後端 API 部署」與「前端網站部署」兩大部分，請務必依序設定。

### 1. 後端 API 部署 (Google Apps Script)

#### 1.1 準備資料庫
1.  **建立 `[資料庫] 選民與驗證碼` Sheet：**
    * 建立一個新的 Google Sheet，並從網址列複製其 **Sheet ID**。
    * 使用提供的 Colab 腳本處理您的原始選民名單，生成欄位順序正確的 CSV 檔案。
    * 將生成的 CSV **所有內容（包含標題列）**，貼到這個 Sheet 的 `A1` 儲存格。
    * 確認第一列標題為：`student_id`, `email`, `status`, `vote_timestamp`, `login_token`, `token_expiry`。
2.  **建立 `[票箱] 匿名投票結果` Sheet：**
    * 建立另一個新的、空白的 Google Sheet，並複製其 **Sheet ID**。
    * 在第一列依序填入標題：`Hashed_ID`, `Candidate_Vote`, `Timestamp`。

#### 1.2 設定 Apps Script 專案
1.  在 Google Drive 建立一個新的 Apps Script 專案。
2.  將我們最終除錯完成的 **`Code.gs` 完整程式碼**貼上。
3.  在 `Code.gs` 的「設定區」，填入您剛剛取得的兩個 **Sheet ID**。
4.  點擊 💾 圖示**儲存專案**。

#### 1.3 部署 API
1.  在 Apps Script 編輯器中，點擊右上角的藍色 **「部署」** 按鈕 -> **「新增部署作業」**。
2.  類型選擇**「網頁應用程式」**。
3.  設定：**執行身份**為 `我`；**誰可以存取**為 `任何人`。
4.  點擊 **「部署」** 並完成授權。
5.  完成後，您會得到一個以 `/exec` 結尾的網址。**請複製這串網址，這是您的後端 API 端點。**

### 2. 前端網站部署 (GitHub Pages)

#### 2.1 設定 GitHub Repository
1.  登入 GitHub，在 `nycusa` 組織下建立一個新的**公開 (Public)** Repository (例如 `nycu-election-2025`)。
2.  將我們最終完成的 `login.html` 和 `vote.html` 兩個檔案上傳到這個 Repository。

#### 2.2 連接前後端
1.  在 GitHub 上，分別編輯 `login.html` 和 `vote.html` 檔案。
2.  找到檔案中 `<script>` 區塊的這一行：
    `const API_URL = "YOUR_APPS_SCRIPT_API_URL";`
3.  將 **`YOUR_APPS_SCRIPT_API_URL`** 替換為您在 **步驟 1.3** 中複製的 Apps Script API 網址。
4.  儲存這兩個檔案的變更。

#### 2.3 啟用網站
1.  在您的 GitHub Repository 頁面，點擊 **"Settings"** -> **"Pages"**。
2.  在 "Branch" 下，選擇 `main` 分支，並點擊 **"Save"**。
3.  等待幾分鐘後，您的投票網站入口就會在 `https://nycusa.github.io/nycu-election-2025/login.html` 上線。

## 📊 選後計票

選舉結束後，可使用 Google Colab 腳本，連接到 `[票箱]` 試算表，自動進行計票、分析與視覺化圖表的生成，以產出最終的官方報告。
> [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/drive/1v44WwnMdLOWuMlAHzuvs2L3FAkKSSDSz)

## 📄 授權

本專案採用 [MIT License](https://opensource.org/licenses/MIT)。
