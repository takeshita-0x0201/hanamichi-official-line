// ============================================================
// Config
// ============================================================
const CHANNEL_ACCESS_TOKEN = "i0ZguquQUtec1Gb+ZnJrX2No6GqFTboZ9fq/YWYRBXa4N7iRWmoBhYkQKO6nKuNix7rxR0m4sfduZVYCzYOrMvgVkUAftX/XEy4kUfjZ28yj2eFP2DMIJ/7jAak2e+L07SL+5hg80gxYlo9OqpqCVQdB04t89/1O/w1cDnyilFU=";
const SPREADSHEET_ID = "1FVmFb9QQa0czHi6FSPzZnTpqkYF8i6q7X_ha6Rbka6k";
const SHEET_NAME = "リスト";

// ============================================================
// doGet - イベント日程データを返却
// ============================================================
function doGet(e) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("イベント日程");

  var schedules = [];
  if (sheet && sheet.getLastRow() > 1) {
    const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues();
    schedules = data
      .filter(function(row) { return row[1] !== ""; })
      .map(function(row) {
        var rawDate = row[1];
        var date;
        if (rawDate instanceof Date) {
          var y = rawDate.getFullYear();
          var m = ("0" + (rawDate.getMonth() + 1)).slice(-2);
          var d = ("0" + rawDate.getDate()).slice(-2);
          var dow = dayNames[rawDate.getDay()];
          date = y + "年" + m + "月" + d + "日(" + dow + ")";
        } else {
          date = rawDate.toString();
        }
        var time = row[2] ? row[2].toString() : "";
        return {
          date: date,
          time: time,
          label: time ? date + " " + time : date,
        };
      });
  }

  const jsonStr = JSON.stringify({ schedules: schedules });
  const callback = e && e.parameter && e.parameter.callback;

  if (callback) {
    // JSONP
    return ContentService
      .createTextOutput(callback + "(" + jsonStr + ")")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(jsonStr)
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// doPost - フォーム送信受付
// ============================================================
function doPost(e) {
  const lock = LockService.getScriptLock();

  try {
    // 最大30秒待機して排他ロックを取得
    lock.waitLock(30000);

    const data = JSON.parse(e.postData.contents);

    // スプレッドシートに書き込み
    writeToSheet(data);

    // LINE完了メッセージ送信
    if (data.userId) {
      sendLineMessage(data.userId, "登録が完了しました。");
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: "ok" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}

// ============================================================
// スプレッドシート書き込み
// ============================================================
function writeToSheet(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

  // ヘッダーが無ければ作成
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "タイムスタンプ",
      "LINE userId",
      "メールアドレス",
      "電話番号",
      "姓",
      "名",
      "せい",
      "めい",
      "生年月日",
      "性別",
      "大学名",
      "学部",
      "学科",
      "学業種別",
      "学年",
      "部活・サークル",
      "役職",
      "出身地",
      "参加日程",
      "個人情報の取り扱い",
    ]);
  }

  const birthday = data.birthYear + "年" + data.birthMonth + "月" + data.birthDay + "日";

  sheet.appendRow([
    new Date(),
    data.userId || "",
    data.email || "",
    data.tel || "",
    data.lastName || "",
    data.firstName || "",
    data.lastNameKana || "",
    data.firstNameKana || "",
    birthday,
    data.gender || "",
    data.university || "",
    data.faculty || "",
    data.department || "",
    data.academicType || "",
    data.grade || "",
    data.club || "",
    data.position || "",
    data.prefecture || "",
    data.eventSchedule || "",
    "同意する",
  ]);
}

// ============================================================
// LINE Messaging API - プッシュメッセージ送信
// ============================================================
function sendLineMessage(userId, text) {
  const url = "https://api.line.me/v2/bot/message/push";

  const payload = {
    to: userId,
    messages: [
      {
        type: "text",
        text: text,
      },
    ],
  };

  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      Authorization: "Bearer " + CHANNEL_ACCESS_TOKEN,
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  UrlFetchApp.fetch(url, options);
}
