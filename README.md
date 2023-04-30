# 關於本程式：
 scripture-state 是一個 Line bot 互動程式，讓男女青年回報經文研讀狀況：
 男女青年每天透過 +2, +1 來回報研讀進度，
* 系統會為每個人每天記錄一筆研讀進度，
* 重複輸入會修改個人同一日的前次點數。
* 使用者可透過 goal 指令來查詢目標與現況。


# 參考：
## 設定：
* firestore 位置： https://console.firebase.google.com/u/1/project/scripture-linebot/firestore/data/~2Fusers~2FUb1d886906e6ff1f46e6d0bf5adbbaf3e
* linebot 位置： https://developers.line.biz/console/channel/1657819867/basics?status=success
* cloud run log : https://console.cloud.google.com/logs/query;query=severity%3DDEFAULT;cursorTimestamp=2023-01-26T02:25:12.681995Z?project=scripture-linebot&authuser=1

# 技術參考：
* linebot messaging api : https://developers.line.biz/en/docs/messaging-api/receiving-messages/
* firestore : https://firebase.google.com/codelabs/firestore-web?hl=en#5
* cloud run for node.js : https://cloud.google.com/run/docs/quickstarts/build-and-deploy/deploy-nodejs-service

# 開發環境：
* node : v16+
* 啟動： npm start
* 部署： gcloud run deploy

# 設定新目標的步驟：
* 開啟 firestore 
* 路徑： /goals/C996d5d4179fbd44b3e272305f0bb691c/goal/ 
* 新建立一個 goal，命名規則建議： YYYYMM。 裡面相關欄位請參考前一個 goal。