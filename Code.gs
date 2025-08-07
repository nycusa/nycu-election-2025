// =======================================================================
//  FINAL DEBUGGED API VERSION v12 - Code.gs
//  This version fixes the email body content issue.
// =======================================================================

// --- 設定區 ---
const SECRET_SALT = "NycuElection2025SecretKey-ChangeMe!";
const DATABASE_SHEET_ID = "1rgtRcXXkwUXPWp2Og-yV4zU5sBCq59tyGRJ2u5qeeN4";
const BALLOT_BOX_SHEET_ID = "1iFgLsnl44v_1nA0auZZL8gBwLdBO_MVIJ0vKn_RqhqY";
const LOG_SHEET_ID = "1nzp8_C3L8_jyPTolmBvtIv3_3XV2NN4rfmIXVbkN9oQ"; // 您可以保留這個日誌功能，或將其ID留空以停用
const VOTER_SHEET_NAME = "工作表1";
const BALLOT_SHEET_NAME = "工作表1";
const TOKEN_EXPIRY_MINUTES = 15;
const GITHUB_PAGES_ORIGIN = "https://nycusa.github.io";
const GITHUB_VOTE_PAGE_URL = "https://nycusa.github.io/nycu-election-2025/vote.html";

/**
 * 【新增】將除錯訊息寫入指定的 Google Sheet
 */
function logToSheet(message) {
  try {
    if (LOG_SHEET_ID && LOG_SHEET_ID !== "YOUR_LOG_SHEET_ID_HERE") {
      const logSheet = SpreadsheetApp.openById(LOG_SHEET_ID).getSheetByName("工作表1") || SpreadsheetApp.openById(LOG_SHEET_ID).insertSheet("工作表1");
      logSheet.appendRow([new Date(), message]);
    }
  } catch (e) {
    Logger.log("Failed to write to log sheet: " + e.message);
  }
}

/**
 * doGet 是 API 的唯一入口點，處理所有請求
 */
function doGet(e) {
  logToSheet("--- New Request Received --- | Parameters: " + JSON.stringify(e.parameter));
  let result;
  try {
    const params = e.parameter;
    if (params.action === 'requestLink') {
      result = requestLoginLink(params.email);
    } else if (params.action === 'submitVote') {
      result = processVote(params);
    } else {
      result = { status: 'success', message: 'API is active.' };
    }
  } catch (error) {
    logToSheet("An error was caught in doGet: " + error.toString());
    result = { status: 'error', message: "後端處理錯誤：" + error.message };
  }
  return ContentService
    .createTextOutput(e.parameter.callback + "(" + JSON.stringify(result) + ")")
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

/**
 * 處理使用者請求投票連結的後端函式
 */
function requestLoginLink(email) {
  logToSheet(`Starting requestLoginLink for email: "${email}"`);
  const dbSheet = SpreadsheetApp.openById(DATABASE_SHEET_ID).getSheetByName(VOTER_SHEET_NAME);
  const data = dbSheet.getDataRange().getValues();
  let userRow = -1;
  const normalizedUserInputEmail = email.trim().toLowerCase();
  logToSheet(`Normalized user input to: "${normalizedUserInputEmail}"`);

  for (let i = 1; i < data.length; i++) {
    const sheetEmailRaw = data[i][1].toString();
    const sheetEmailNormalized = sheetEmailRaw.trim().toLowerCase();
    logToSheet(`Comparing "${normalizedUserInputEmail}" with Sheet Row #${i + 1} value: "${sheetEmailNormalized}"`);
    if (sheetEmailNormalized === normalizedUserInputEmail) {
      logToSheet(`SUCCESS: Match found at row #${i + 1}.`);
      if (data[i][2] === 'USED') { 
        throw new Error("您已完成投票，無法重複取得連結。");
      }
      userRow = i + 1;
      break;
    }
  }

  if (userRow === -1) { 
    logToSheet(`FAILURE: No match found.`);
    throw new Error("查無此信箱，請確認您輸入的學校信箱是否正確。");
  }

  const token = Utilities.getUuid();
  const expiryDate = new Date();
  expiryDate.setMinutes(expiryDate.getMinutes() + TOKEN_EXPIRY_MINUTES);
  dbSheet.getRange(userRow, 5).setValue(token);
  dbSheet.getRange(userRow, 6).setValue(expiryDate);
  const voteLink = `${GITHUB_VOTE_PAGE_URL}?token=${token}`;
  const subject = "【重要】陽明交大學生會選舉 您的專屬投票連結";

  // 【關鍵修正】提供完整、無省略的信件內容
  const body = `
    您好，<br><br>
    這是您的專屬投票連結，點擊後即可進入投票頁面。此連結將在 ${TOKEN_EXPIRY_MINUTES} 分鐘後失效，且只能使用一次。<br><br>
    <a href="${voteLink}" style="font-size: 18px; display: inline-block; padding: 12px 25px; background-color: #007bff; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">點此開始投票</a>
    <br><br>
    如果無法點擊按鈕，請複製以下網址到瀏覽器中開啟：<br>
    <a href="${voteLink}">${voteLink}</a>
    <br><br>
    請勿將此郵件轉發給他人。如果您未曾請求此連結，請忽略本郵件。<br><br>
    陽明交大 選舉委員會 敬上
  `;
  
  MailApp.sendEmail({ 
    to: email, 
    subject: subject, 
    htmlBody: body // 確保使用 htmlBody 來發送 HTML 格式的郵件
  });

  return { status: 'success', message: `一封專屬投票連結已寄送至您的信箱 (${email})，請檢查您的收件匣。` };
}

/**
 * 處理最終投票提交的後端函式 (維持不變)
 */
function processVote(formData) {
  // ... 此函式內容與前一版本完全相同，此處省略 ...
  try {
    const token = formData.token;
    const vote = formData.vote;
    if (!token) { throw new Error("無效的請求，缺少登入權杖。"); }
    const dbSheet = SpreadsheetApp.openById(DATABASE_SHEET_ID).getSheetByName(VOTER_SHEET_NAME);
    const data = dbSheet.getDataRange().getValues();
    let userRowIndex = -1;
    let studentId = "";
    for (let i = 1; i < data.length; i++) {
      if (data[i][4] === token) {
        const expiryDate = new Date(data[i][5]);
        if (new Date() > expiryDate) throw new Error("投票連結已過期，請重新取得。");
        if (data[i][2] === 'USED') throw new Error("此投票連結已被使用。");
        userRowIndex = i + 1;
        studentId = data[i][0];
        break;
      }
    }
    if (userRowIndex === -1) { throw new Error("無效或已失效的投票連結。"); }
    dbSheet.getRange(userRowIndex, 3).setValue('USED');
    dbSheet.getRange(userRowIndex, 4).setValue(new Date());
    dbSheet.getRange(userRowIndex, 5).setValue('');
    dbSheet.getRange(userRowIndex, 6).setValue('');
    const hashedId = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, studentId + SECRET_SALT).map(byte => ('0' + (byte & 0xFF).toString(16)).slice(-2)).join('');
    const ballotSheet = SpreadsheetApp.openById(BALLOT_BOX_SHEET_ID).getSheetByName(BALLOT_SHEET_NAME);
    ballotSheet.appendRow([hashedId, vote, new Date()]);
    return { status: 'success', message: '投票成功！感謝您。' };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}
