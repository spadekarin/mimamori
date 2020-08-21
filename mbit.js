var microBitBle;
var adt7410;
var readEnable;
var microBitBle;
var channel;

async function connect() {
  // chirimen with micro:bitの初期化
  microBitBle = await microBitBleFactory.connect();
  msg.innerHTML = "micro:bitとのBLE接続が完了しました";

  // webSocketリレーの初期化
  var relay = RelayServer("achex", "chirimenSocket");
  channel = await relay.subscribe("chirimenMatrix");
  msg.innerText = "achex web socketリレーサービスに接続しました";
  channel.onmessage = printMessage;

  // microbitが接続されたら関数を呼び出す
  pollButtonPush();
}

async function disconnect() {
  readEnable = false;
  await microBitBle.disconnect();
  msg.innerHTML = "micro:bit BLE接続を切断しました。";
}

//messageをmicrobitのLEDで表示する関数
async function printMessage(message) {
  if (message.data.print) {
    var iconNumb = message.data.print;
    msg.innerText = "get print icon command :" + iconNumb;
    channel.send({ start: iconNumb }); // 表示の開始を知らせるメッセージを通知
    await microBitBle.printLED(iconNumb); // micro:bitに表示を指示する(表示の完了に時間がかかる)
    channel.send({ done: iconNumb }); // 表示の完了を知らせるメッセージを通知
  }
}

//ボタン1が押されたら温度, 2が押されたら照度をmicrobitに表示する
async function pollButtonPush() {
  while (true) {
    var sensorData = await microBitBle.readSensor();
    if (sensorData.button != 0) {
      sensorData.time = new Date().toString();
      channel.send(sensorData);
      messageDiv.innerText = "センサデータを送信しました";

      temTd.innerText = sensorData.temperature;
      briTd.innerText = sensorData.brightness;
      butTd.innerText = sensorData.button;
      var temp = sensorData.temperature.toString();
      var brt = sensorData.brightness.toString();
      if (sensorData.button == 1) {
        channel.send({ print: temp });
      } else if (sensorData.button == 2) {
        channel.send({ print: brt });
      }
    }
    await sleep(200);
  }
}
//値を読み通信する関数（未完）
async function readData() {
  var readVal;
  while (readEnable) {
    readVal = await adt7410.read();
    console.log("readVal:", readVal);
    msg.innerHTML = "温度: " + readVal + "℃";
    Value = String(readVal);
    channel.send({ print: value });
    await sleep(1000);
  }
  //   while (readEnable) {
  // BH1750から明るさを取得
  // var val = await bh1750.measure_low_res();
  // console.log(val);
  // light.innerHTML = val;
  //   await sleep(300);
  //値をrelayサーバを通して相手のmicrobitに送る
  //   var data = pollButtonPush();
  //相手からrelayサーバを通して明るさを取得
  //得られた値を出力する
}
