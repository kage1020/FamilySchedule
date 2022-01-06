const ACCESS_TOKEN = "access token is here";
const MULTICAST = "https://api.line.me/v2/bot/message/multicast";
const PUSH = "https://api.line.me/v2/bot/message/push"
const REPLY = "https://api.line.me/v2/bot/message/reply";
const ScheduleSheet = SpreadsheetApp.openById("spreadsheet id is here").getActiveSheet();
const UserIdSheet = SpreadsheetApp.openById("spreadsheet id is here").getActiveSheet();
const MemoSheet = SpreadsheetApp.openById("spreadsheet id is here").getActiveSheet();
const ErrorSheet = SpreadsheetApp.openById("spreadsheet id is here").getActiveSheet();
const DEVELOPER = "developer id is here";
const FamilyCalendarID = "calendar id is here";
const ShunkiCalendarID = "calendar id is here";
const FamilyCalendar = CalendarApp.getCalendarById(FamilyCalendarID);
const ShunkiCalendar = CalendarApp.getCalendarById(ShunkiCalendarID);
const FamilyCalendarURL = "https://calendar.google.com/calendar/u/0/r?cid=" + FamilyCalendarID;
const ShunkiCalendarURL = "https://calendar.google.com/calendar/u/0/r?cid=" + ShunkiCalendarID;
const mainMessage = "毎回5秒ほどあけてから送信するようにしてください．また，不具合が生じた場合には最初からやり直してください．\n\n《注意》\n次の語は予約語のため送信時に不具合が生じる可能性があります．他の単語と組み合わせるなどして予約語だけを送信しないようにしてください．\n「LINE」，「today」，「week」，「month」，「舜己E」，「modify」，「delete」，「allday」，「DATE」，「STARTTIME」，「ENDTIME」，「MEVENT」，「MDATE」，「MSTART」，「MEND」";
const modifyMessage = "予定を修正・削除したい場合は以下のどちらかを選択してください．(登録されている予定の数によっては返信に時間がかかる場合があります．)";
const checkMessage = "予定を確認したい場合は，以下の期間または対象を選択してください．(登録されている予定の数によっては返信に時間がかかる場合があります．)";

function doPost(e) {
  try {
    const events = JSON.parse(e.postData.contents).events;
    const event = events[0]["type"];
    switch(event) {
      case "postback":
        postback(events[0]);
        break;
      case "message":
        reply(events[0]);
        break;
      case "follow":
        follow(events[0]);
        break;
      case "unfollow":
        unfollow(events[0]);
        break;
    }
  } catch(error) {
    errorHandling("[doPost error]");
    errorHandling(error);
  }
}

function push() {
  try {
    updateCalendar();
    const text = getEvents("today");
    let userList = [];
    const data = UserIdSheet.getDataRange().getValues();
    for(let n in data) userList.push(data[n][0]);
    sendMessage(userList, text, MULTICAST);
  }catch(error) {
    errorHandling("[push error]");
    errorHandling(error);
  }
}

function groupPush() {
  try {
    const groupList = ["C9e323de29c669e8bcaf8438abb708f81"];
    const today = new Date();
    const weekday = today.getDay();
    let text;
    updateCalendar();
    if (weekday == 0) text = getEvents("week");
    else text = getEvents("today");
    for (let i in groupList) sendMessage(groupList[i], text, PUSH);
  } catch(error) {
    errorHandling("[groupPush error]");
    errorHandling(error);
  }
}

function sendMessage(list, text, way) {
  try {
    const postData = {
      "to" : list,
      "messages" : [{"type" : "text", "text" : text}]
    };
    const headers = {
      "Content-Type" : "application/json; charset=UTF-8",
      "Authorization" : "Bearer " + ACCESS_TOKEN
    };
    const options = {
      "method" : "POST",
      "headers" : headers,
      "payload" : JSON.stringify(postData)
    };
    return UrlFetchApp.fetch(way, options);
  } catch(error) {
    errorHandling("[sendMessage error]");
    errorHandling(error);
  }
}

function sendPostBackMessage(id, message, way) {
  try {
    const postData = {
      "to": id,
      "messages": message
    };
    const headers = {
      "Content-Type" : "application/json; charset=UTF-8",
      "Authorization" : "Bearer " + ACCESS_TOKEN
    };
    const options = {
      "method" : "POST",
      "headers" : headers,
      "payload" : JSON.stringify(postData)
    };
    return UrlFetchApp.fetch(way, options);
  } catch(error) {
    errorHandling("[sendPostBackMessage error]");
    errorHandling(error);
  }
}

function sendReplyMessage(replyToken, text, way) {
  try {
    if (replyToken == "") throw new Error("no token");
    const postData = {
      "replyToken" : replyToken,
      "messages" : [{"type" : "text", "text" : text}]
    };
    const headers = {
      "Content-Type" : "application/json; charset=UTF-8",
      "Authorization" : "Bearer " + ACCESS_TOKEN
    };
    const options = {
      "method" : "POST",
      "headers" : headers,
      "payload" : JSON.stringify(postData)
    };
    return UrlFetchApp.fetch(way, options);
  } catch(error) {
    errorHandling("[sendReplyMessage error]");
    errorHandling(error);
  }
}

function reply(event) {
  try {
    const postMsg = event.message.text;
    const replyToken = event.replyToken;
    let messages = [];
    const memoType = MemoSheet.getRange(2, 1).getValue();
    const memoAction = MemoSheet.getRange(2, 2).getValue();
    const memoEvent = MemoSheet.getRange(2, 3).getValue();
    const memoNew = MemoSheet.getRange(2, 8).getValue();

    if (postMsg == "LINE" || postMsg == "modify" || postMsg == "delete" || postMsg == "today" || postMsg == "week" || postMsg == "month"
        || postMsg == "DATE" || postMsg == "allday" || postMsg == "STARTTIME" || postMsg == "ENDTIME" || postMsg == "MEVENT"
        || postMsg == "MDATE" || postMsg == "MSTART" || postMsg == "MEND" || postMsg == "舜己E") return;
    if (postMsg == "予定") {
      memoClear();
      messages.push(
        getCustomCarouselMessage([
          getBubbleAddMessage(), 
          getBubbleMessageWith4Button(checkMessage,["今日","1週間","1か月","舜己"],["今日","1週間","1か月","舜己"],["today","week","month","舜己E"]), 
          getBubbleMessageWith2Button(modifyMessage,["修正","削除"],["修正","削除"],["modify","delete"])
        ])
      );
      sendMessage([event.source.userId], mainMessage, MULTICAST);
      sendPostBackMessage(event.source.userId, messages, PUSH);
    } else if (memoType == "postback" && memoEvent == "") {
      MemoSheet.getRange(2, 3).setValue(postMsg); // event
      messages.push(getCustomBubbleMessage(getBubbleWithTimeButton(
        "日付を選択してください．(時間はいつでもいいです．)", 
        "日付を選択", 
        "DATE", 
        "datetime"
      )));
      sendPostBackMessage([event.source.userId], messages, MULTICAST);
    } else if (memoAction == "modify" && memoNew == "") {
      MemoSheet.getRange(2, 8).setValue(postMsg);
      setEvents(replyToken);
      memoClear();
    } else if (postMsg == "quick") {
      messages= quickReply();
      sendPostBackMessage(event.source.userId, messages, PUSH);
    }
  } catch(error) {
    const text = printError(error);
    sendReplyMessage(replyToken, text, REPLY);
  }
}

function postback(event) {
  try {
    const postMsg = event.postback.data;
    const replyToken = event.replyToken;
    let messages = [];
    let replyText = "";
    let datetime;
    const memoAction = MemoSheet.getRange(2, 2).getValue();
    const memoTarget = MemoSheet.getRange(2, 7).getValue();
    let flag = 0;

    switch (postMsg){
      case "LINE":
      case "modify":
      case "delete":
        memoClear();
        MemoSheet.getRange(2, 1).setValue("postback"); // type
        if (postMsg == "LINE") {
          replyText = "イベント名を入力してください．";
          sendReplyMessage(replyToken, replyText, REPLY);          
          MemoSheet.getRange(2, 2).setValue("登録");
        } else {
          messages.push(
            getCustomCarouselMessage([getBubbleTextMessage(getEvents("month"))])
          );
          if (postMsg == "modify") replyText = "どの予定を修正しますか？イベント名を入力してください．";
          else replyText = "どの予定を削除しますか？イベント名を入力してください．";
          flag = 1;
          MemoSheet.getRange(2, 2).setValue(postMsg); // action
        }
        break;
      case "today":
      case "week":
      case "month":
      case "舜己E":
        replyText = getEvents(postMsg);
        sendReplyMessage(replyToken, replyText, REPLY);
        return;
      case "DATE":
        if(checkInput(event, memoAction)) return;
        datetime = event.postback.params.datetime.substr(0, 10).replace(/-/g, "/");
        if (memoTarget != "") {
          MemoSheet.getRange(2, 8).setValue(datetime);
          setEvents(replyToken);
          memoClear();
          return;
        }
        MemoSheet.getRange(2, 4).setValue(datetime); // date
        messages.push(getCustomBubbleMessage(getBubbleStartTimeMessage()));
        break;
      case "allday":
        if(checkInput(event, memoAction)) return;
        if (memoAction == "modify") messages.push(getCustomBubbleMessage(getBubbleMessageWith4Button(
            "何を修正しますか？", 
            ["イベント名", "日付", "開始時刻", "終了時刻"], 
            ["イベント名", "日付", "開始時刻", "終了時刻"], 
            ["MEVENT", "MDATE", "MSTART", "MEND"]
          )));
        else {
          setEvents(replyToken);
          memoClear();
          return;
        }
        break;
      case "STARTTIME":
        if(checkInput(event, memoAction)) return;
        datetime = event.postback.params.datetime.substr(11, 5);
        if (memoTarget != "") {
          MemoSheet.getRange(2, 8).setValue(datetime);
          setEvents(replyToken);
          memoClear();
          return;
        }
        MemoSheet.getRange(2, 5).setValue(datetime); // start time
        messages.push(getCustomBubbleMessage(getBubbleWithTimeButton(
          "終了時刻を選択してください．(日付はいつでもいいです．)", 
          "終了時刻を選択", 
          "ENDTIME", 
          "datetime"
        )));
        break;
      case "ENDTIME":
        if(checkInput(event, memoAction)) return;
        datetime = event.postback.params.datetime.substr(11, 5);
        if (memoTarget != "") {
          MemoSheet.getRange(2, 7).setValue(datetime);
          setEvents(replyToken);
          memoClear();
          return;
        }
        MemoSheet.getRange(2, 6).setValue(datetime); // end time
        if (memoAction == "modify") messages.push(getCustomBubbleMessage(getBubbleMessageWith4Button(
              "何を修正しますか？", 
              ["イベント名", "日付", "開始時刻", "終了時刻"], 
              ["イベント名", "日付", "開始時刻", "終了時刻"], 
              ["MEVENT", "MDATE", "MSTART", "MEND"]
            )));
        else {
          setEvents(replyToken);
          memoClear();
          return;
        }
        break;
      case "MEVENT":
      case "MDATE":
      case "MSTART":
      case  "MEND":
        if(checkInput(event, memoAction)) return;
        MemoSheet.getRange(2, 7).setValue(postMsg); // target
        if (postMsg == "MEVENT") {
          replyText = "新しいイベント名を入力してください．";
          sendReplyMessage(replyToken, replyText, REPLY);
          return;
        } else if (postMsg == "MDATE") messages.push(getCustomBubbleMessage(getBubbleWithTimeButton(
            "日付を選択してください．(時間はいつでもいいです．)", 
            "日付を選択", 
            "DATE", 
            "datetime"
          )));
        else if (postMsg == "MSTART")
          messages.push(getCustomBubbleMessage(getBubbleWithTimeButton(
            "開始時刻を選択してください．(日付はいつでもいいです．)", 
            "開始時刻を選択", 
            "STARTTIME", 
            "datetime"
          )));
        else if (postMsg == "MEND") messages.push(getCustomBubbleMessage(getBubbleWithTimeButton(
            "終了時刻を選択してください．(日付はいつでもいいです．)", 
            "終了時刻を選択", 
            "ENDTIME", 
            "datetime"
          )));
        break;
      case "testtest":
        sendReplyMessage(replyToken, JSON.stringify(e), REPLY);
        break;
      default:
        messages.push("ERROR");
        return;
    }
    sendPostBackMessage([event.source.userId], messages, MULTICAST);
    if (flag == 1) sendMessage([event.source.userId], replyText, MULTICAST);
  } catch (error) {
    const text = printError(error);
    sendMessage([DEVELOPER, event.source.userId], text, MULTICAST);
  }
}

function getEvents(span) {
  try {
    let value = [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
    let endSpan;
    let SPAN;

    if (span == "today") endSpan = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    else if (span == "week") endSpan = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
    else if (span == "month") endSpan = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    else endSpan = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

    let FamilyEvents = FamilyCalendar.getEvents(today, endSpan);
    let ShunkiEvents = ShunkiCalendar.getEvents(today, endSpan);

    if (span == "舜己E") {
      for (let event of ShunkiEvents) {
        const name = event.getTitle();
        const date = Utilities.formatDate(event.getStartTime(), "JST", "MM/dd");
        var weekDay = event.getStartTime().getDay();
        if (event.isAllDayEvent()) value.push(`${date}(${weekDays[weekDay]}), ${name}\n`);
        else {
          const startTime = Utilities.formatDate(event.getStartTime(), "JST", "HH:mm");
          const endTime = Utilities.formatDate(event.getEndTime(), "JST", "HH:mm");
          value.push(`${date}(${weekDays[weekDay]}) ${startTime} ~ ${endTime}, ${name}\n`);
        }
      }
    } else {
      for (let event of FamilyEvents) {
        const name = event.getTitle();
        const date = Utilities.formatDate(event.getStartTime(), "JST", "MM/dd");
        var weekDay = event.getStartTime().getDay();
        if (event.isAllDayEvent()) value.push(`${date}(${weekDays[weekDay]}), ${name}\n`);
        else {
          const startTime = Utilities.formatDate(event.getStartTime(), "JST", "HH:mm");
          const endTime = Utilities.formatDate(event.getEndTime(), "JST", "HH:mm");
          value.push(`${date}(${weekDays[weekDay]}) ${startTime} ~ ${endTime}, ${name}\n`);
        }
      }
    }

    if (span == "today") SPAN = "今日";
    else if (span == "week") SPAN = "1週間";
    else if (span == "month") SPAN = "1か月";
    else if (span == "舜己E") SPAN = "舜己";
    if (value.length == 0) value.push(`${SPAN}の予定はありません．`);
    else value.unshift(`【${SPAN}の予定】\n`);

    let text = value.join("");
    if (span == "today") {
      text = text.replace(/[0-9]{2}\/[0-9]{2}\(\S\), /g, "");
      text = text.replace(/[0-9]{2}\/[0-9]{2}\(\S\) /g, "");
    }
    return text;
  } catch(error) {
    return error;
  }
}

function setEvents(replyToken) {
  try {
    MemoSheet.getRange("E2:F2").setNumberFormat('HH:mm');
    const memoAction = MemoSheet.getRange(2, 2).getValue();
    let memoEvent = MemoSheet.getRange(2, 3).getValue();
    let memoDate = Utilities.formatDate(MemoSheet.getRange(2, 4).getValue(), "JST", "yyyy/MM/dd");
    let memoStartTime = MemoSheet.getRange(2, 5).getDisplayValue();
    let memoEndTime = MemoSheet.getRange(2, 6).getDisplayValue();
    const memoTarget = MemoSheet.getRange(2, 7).getValue();
    const memoNew = MemoSheet.getRange(2, 8).getValue();
    const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endSpan = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    const events = FamilyCalendar.getEvents(today, endSpan);

    if (memoAction == "登録") {
      const date = new Date(Date.parse(memoDate));
      const weekday = date.getDay();

      if (memoStartTime == "") {
        FamilyCalendar.createAllDayEvent(memoEvent, date);
        sendReplyMessage(replyToken, `${memoDate}(${weekDays[weekday]}), ${memoEvent} を追加しました．`, REPLY);
      } else {
        const start = new Date(Date.parse(memoDate + " " + memoStartTime));
        const end = new Date(Date.parse(memoDate + " " + memoEndTime));
        FamilyCalendar.createEvent(memoEvent, start, end);
        sendReplyMessage(replyToken, `${memoDate}(${weekDays[weekday]}) ${memoStartTime} ~ ${memoEndTime}, ${memoEvent} を追加しました．`, REPLY);
      }
      return;
    } else {
      for (let event of events) {
        if (memoAction == "delete") {
          if (event.getTitle() == memoEvent && Utilities.formatDate(event.getStartTime(), "JST", "yyyy/MM/dd") == memoDate) {
            if (event.isAllDayEvent()) {
              const weekday = event.getAllDayStartDate().getDay();
              event.deleteEvent();
              sendReplyMessage(replyToken, `${memoDate}(${weekDays[weekday]}), ${memoEvent} を削除しました．`, REPLY);
              return;
            } else {
              if (Utilities.formatDate(event.getStartTime(), "JST", "HH:mm") == memoStartTime
                  && Utilities.formatDate(event.getEndTime(), "JST", "HH:mm") == memoEndTime) {
                const weekday = event.getDate().getDay();
                event.deleteEvent();
                sendReplyMessage(replyToken, `${memoDate}(${weekDays[weekday]}) ${memoStartTime} ~ ${memoEndTime}, ${memoEvent} を削除しました．`, REPLY)
                return;
              }
            }
          }
        } else if (memoAction == "modify") {
          if (event.getTitle() == memoEvent && Utilities.formatDate(event.getStartTime(), "JST", "yyyy/MM/dd") == memoDate) {
            if (event.isAllDayEvent()) {
              if (memoTarget == "MEVENT") memoEvent = memoNew;
              else if (memoTarget == "MDATE") memoDate = Utilities.formatDate(memoNew, "JST", "yyyy/MM/dd");
              const date = new Date(Date.parse(memoDate));
              FamilyCalendar.createAllDayEvent(memoEvent, date);
              const weekday = event.getAllDayStartDate().getDay();
              event.deleteEvent();
              sendReplyMessage(replyToken, `${memoDate}(${weekDays[weekday]}), ${memoEvent} に修正しました`, REPLY);
              return;
            } else {
              const memoStartTime = Utilities.formatDate(new Date(Date.parse("2021/01/01 " + memoStartTime)), "JST", "HH:mm");
              const memoEndTime = Utilities.formatDate(new Date(Date.parse("2021/01/01 " + memoEndTime)), "JST", "HH:mm");
              if (Utilities.formatDate(event.getStartTime(), "JST", "HH:mm") == memoStartTime
                  && Utilities.formatDate(event.getEndTime(), "JST", "HH:mm") == memoEndTime) {
                if (memoTarget == "MEVENT") memoEvent = memoNew;
                else if (memoTarget == "MDATE") memoDate = Utilities.formatDate(memoNew, "JST", "yyyy/MM/dd");
                else if (memoTarget == "MSTART") {
                  MemoSheet.getRange(2, 8).setNumberFormat('HH:mm');
                  memoNew = MemoSheet.getRange(2, 8).getDisplayValue();
                  memoStartTime = Utilities.formatDate(new Date(Date.parse("2021/01/01 " + memoNew)), "JST", "HH:mm");
                } else if (memoTarget == "MEND") {
                  MemoSheet.getRange(2, 8).setNumberFormat('HH:mm');
                  memoNew = MemoSheet.getRange(2, 8).getDisplayValue();
                  memoEndTime = Utilities.formatDate(new Date(Date.parse("2021/01/01 " + memoNew)), "JST", "HH:mm");
                }
                const start = new Date(Date.parse(memoDate + " " + memoStartTime));
                const end = new Date(Date.parse(memoDate + " " + memoEndTime));
                const weekday = event.getDate().getDay();
                event.deleteEvent();
                FamilyCalendar.createEvent(memoEvent, start, end);
                sendReplyMessage(replyToken, `${memoDate}(${weekDays[weekday]}) ${memoStartTime} ~ ${memoEndTime}, ${memoEvent} に修正しました`, REPLY);
                return;
              }
            }
          }
        }
      }
      sendReplyMessage(replyToken, "一致する予定はありませんでした．", REPLY);
    }
  } catch(error) {
    sendReplyMessage(replyToken, printError(error), REPLY);
  }
}

function getCustomCarouselMessage(bubbles) {
  return {
    "type": "flex",
    "altText": "this is a carousel message",
    "contents": {
      "type": "carousel",
      "contents": bubbles
    }
  };
}

function getCustomBubbleMessage(bubble) {
  return {
    "type": "flex",
    "altText": "this is a bubble message",
    "contents": bubble
  }
}

function getBubbleMessageWith2Button(message, label, text, data) {
  return {
    "type": "bubble",
    "body": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {"type": "text", "text": message, "size": "sm", "align": "start", "wrap": true},
        {"type": "separator","margin": "md"},
        {
          "type": "box",
          "layout": "horizontal",
          "contents": [
            {"type": "button", "action": {"type": "postback", "label": label[0], "text": text[0], "data": data[0]}, "height": "sm"},
            {"type": "separator"},
            {"type": "button", "action": {"type": "postback", "label": label[1], "text": text[1], "data": data[1]}, "height": "sm"}
          ]
        }
      ]
    }
  };
}

function getBubbleMessageWith4Button(message, label, text, data) {
  return {
    "type": "bubble",
    "body": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {"type": "text", "text": message, "size": "sm", "align": "start", "wrap": true},
        {"type": "separator","margin": "md"},
        {
          "type": "box",
          "layout": "horizontal",
          "contents": [
            {"type": "button", "action": {"type": "postback", "label": label[0], "text": text[0], "data": data[0]}, "height": "sm"},
            {"type": "separator"},
            {"type": "button", "action": {"type": "postback", "label": label[1], "text": text[1], "data": data[1]}, "height": "sm"}
          ]
        },
        {"type": "separator"},
        {
          "type": "box",
          "layout": "horizontal",
          "contents": [
            {"type": "button", "action": {"type": "postback", "label": label[2], "text": text[2], "data": data[2]}, "height": "sm"},
            {"type": "separator"},
            {"type": "button", "action": {"type": "postback", "label": label[3], "text": text[3], "data": data[3]}, "height": "sm"}
          ]
        }
      ]
    }
  };
}

function getBubbleWithTimeButton(message, label, data, mode) {
  return {
    "type": "bubble",
    "body": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {"type": "text","text": message,"size": "sm","align": "start","wrap": true},
        {"type": "separator","margin": "md"},
        {"type": "button","action": {"type": "datetimepicker","label": label,"data": data,"mode": mode},"height": "sm"}
      ]
    }
  };
}

function getBubbleAddMessage() {
  return {
    "type": "bubble",
    "body": {
      "type": "box",
      "layout": "vertical",
      "contents": [{"type": "text","text": "予定を追加する場合，以下のどちらかを選択してください．","size": "sm","align": "start","wrap": true},
        {"type": "separator","margin": "md"},
        {
          "type": "box",
          "layout": "vertical",
          "contents": [
            {"type": "button","action": {"type": "postback","label": "LINE","text": "LINE","data": "LINE"},"height": "sm"},
            {"type": "separator"},
            {"type": "button","action": {"type": "uri","label": "Family Calendar","uri": `${FamilyCalendarURL}`},"height": "sm"},
            {"type": "separator"},
            {"type": "button","action": {"type": "uri","label": "舜己 Calendar","uri": `${ShunkiCalendarURL}`},"height": "sm"}
          ]
        }
      ]
    }
  };
}

function getBubbleStartTimeMessage() {
  return {
    "type": "bubble",
    "body": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {"type": "text","text": "時刻を指定しない場合は「終日」を，それ以外は開始時刻を選択してください．(日付はいつでもいいです．)","weight": "regular","size": "sm","align": "start","wrap": true},
        {"type": "separator","margin": "md"},
        {
          "type": "box",
          "layout": "horizontal",
          "offsetTop": "10px",
          "contents": [
            {"type": "button","action": {"type": "postback","label": "終日","text": "終日","data": "allday"},"height": "sm"},
            {"type": "separator","margin": "md"},
            {"type": "button","action": {"type": "datetimepicker","label": "開始時刻","data": "STARTTIME","mode": "datetime"},"height": "sm"}
          ]
        }
      ]
    }
  };
}

function getBubbleTextMessage(message) {
  return {
    "type": "bubble",
    "body": {
      "type": "box",
      "layout": "vertical",
      "contents": [{"type": "text","text": message,"weight": "regular","size": "sm","align": "start","wrap": true}]
    }
  };
}

function quickReply() {
  // 現在時刻を15分単位で取得
  var dt_now = new Date();
  dt_now.setMinutes(dt_now.getMinutes() - (dt_now.getMinutes() % 15) );
  // 15分前の時刻を取得
  var dt_before15 = new Date();
  dt_before15.setMinutes(dt_now.getMinutes() - 15);
  // 15分後の時刻を取得
  var dt_after15 = new Date();
  dt_after15.setMinutes(dt_now.getMinutes() + 15);
    
  var msg = [
    {
      "type": "text",
      "text": "下のボタンより、" + "開始" + "時間を選択してください。",
      "quickReply": {
        "items": [
          {
            "type": "action",
            "action": {
              "type": "postback",
              "label": Utilities.formatDate(dt_before15, 'Asia/Tokyo', 'HH:mm'),
              "displayText": Utilities.formatDate(dt_before15, 'Asia/Tokyo', 'HH:mm'),
              "data": "開始" + "," + Utilities.formatDate(dt_before15, 'Asia/Tokyo', 'HH:mm')
            }
          },
          {
            "type": "action",
            "action": {
              "type": "postback",
              "label": Utilities.formatDate(dt_now, 'Asia/Tokyo', 'HH:mm'),
              "displayText": Utilities.formatDate(dt_now, 'Asia/Tokyo', 'HH:mm'),
              "data": "開始" + "," + Utilities.formatDate(dt_now, 'Asia/Tokyo', 'HH:mm')
            }
          },
          {
            "type": "action",
            "action": {
              "type": "postback",
              "label": Utilities.formatDate(dt_after15, 'Asia/Tokyo', 'HH:mm'),
              "displayText": Utilities.formatDate(dt_after15, 'Asia/Tokyo', 'HH:mm'),
              "data": "開始" + "," + Utilities.formatDate(dt_after15, 'Asia/Tokyo', 'HH:mm')
            }
          },
          {
            "type": "action",
            "action": {
              "type": "datetimepicker",
              "label": "時刻選択",
              "mode": "time",
              "data": "開始" + "," + "時刻選択"
            }
          }
        ]
      }
    }
  ];

  return msg;
}

function printError(error){
  return "[StackTrace]\n" + error.stack + "\n\n" + "開発者にこのエラーを見せてください．";
}

function errorHandling(error) {
  const date = Utilities.formatDate(new Date(), "JST", "yyyy/MM/dd HH:mm:ss");
  ErrorSheet.appendRow([date, error]);
}

function follow(e) {
  UserIdSheet.appendRow([e.source.userId]);
}

function unFollow(e) { 
  const result = findRow(UserIdSheet, e.source.userId, 1);
  if (result > 0) UserIdSheet.deleteRows(result);
}

function findRow(sheet,val,col) {
  const data = sheet.getDataRange().getValues(); 
  for (let i in data) {
    if (data[i][col - 1] === val) return i + 1;
  }

  return 0;
}

function memoClear() {
  MemoSheet.getRange("A2:H2").clearContent();
}

function checkInput(event, memoAction) {
  let messages = [];
  if (memoAction == "") {
    messages.push(
      getCustomCarouselMessage([
        getBubbleTextMessage("初めからやり直してください．\n\n" + mainMessage), 
        getBubbleAddMessage(), 
        getBubbleMessageWith4Button(checkMessage,["today","week","month","舜己"],["today","week","month","舜己"],["today","week","month","舜己"]), 
        getBubbleMessageWith2Button(modifyMessage,["modify","delete"],["modify","delete"],["modify","delete"])
      ])
    );
    sendPostBackMessage([event.source.userId], messages, MULTICAST);
    return 1;
  }
  return 0;
}

function syncEvents(span) {
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + span);
  const events = ShunkiCalendar.getEvents(today, end);
  try {
    for (let j in events) {
      if (events[j].getGuestByEmail(FamilyCalendarID) == null) {
        events[j].addGuest(FamilyCalendarID);
        console.log("add");
        Utilities.sleep(1000);
      }
    }
  } catch(e) {
    errorHandling("[syncEvents error]");
    errorHandling(e);
  }
}

function setEventStatus(span) {
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + span);
  const events = FamilyCalendar.getEvents(today, end);
  for (let i in events) {
    try {
      events[i].setMyStatus(CalendarApp.GuestStatus.YES);
      console.log("join");
      Utilities.sleep(1000);
    } catch(e) {
      continue;
    }
  }
}

function initialSync() {
  const items = Calendar.Events.list(ShunkiCalendarID);
  const nextSyncToken = items.nextSyncToken;
  const properties = PropertiesService.getScriptProperties();
  properties.setProperty("syncToken", nextSyncToken);
}

function onCalendarEditOFF() {
  const properties = PropertiesService.getScriptProperties();
  let nextSyncToken = properties.getProperty("syncToken");
  const optionalArgs = {syncToken: nextSyncToken};
  updateCalendar();
  const events = Calendar.Events.list(ShunkiCalendarID, optionalArgs);
  nextSyncToken = events["nextSyncToken"];
  properties.setProperty("syncToken", nextSyncToken);
}

function updateCalendar() {
  syncEvents(7);
  setEventStatus(7);
}

function updateNotification() {
  const formattedDate = Utilities.formatDate(new Date(Date.now()), "JST", "yyyy/MM/dd HH:mm:dd");
  const value = [
    `${formattedDate} ver 1.6.1 更新\n`,
    "《更新内容》\n",
    "・イベントの名前による振り分け機能の廃止\n\n",
    "詳しくは「予定」と入力してください．"
    // "・個別スケジュールの追加(ベータ版)"
  ];
  const data = UserIdSheet.getDataRange().getValues();
  let userList = [];

  for(let n = 0; n < data.length; n++) userList.push(data[n][0]);
  sendMessage(userList, value.join(""), MULTICAST);
}

function test() {
  setEvents("");
}

