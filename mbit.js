var microBitBle;
var adt7410;
var readEnable;
var channel;

var gpioPort0;
var blinkEnable;

async function connect() {
  // chirimen with micro:bitの初期化
  microBitBle = await microBitBleFactory.connect();
  msg.innerHTML = "micro:bitとのBLE接続が完了しました";

  // webSocketリレーの初期化
  //var relay = RelayServer("achex", "chirimenSocket");
  //channel = await relay.subscribe("chirimenMatrix");
  var relay = RelayServer(
    "websocket.in",
    "6kYyjth9cQTEvNEHuVDnh4pj3LQFK07DcwGi8BsgaAbKWf7qtCY5n8aoTr0h"
  );
  channel = await relay.subscribe("chirimenChuo");
  msg.innerText = "achex web socketリレーサービスに接続しました";
  channel.onmessage = printMessage;

  var i2cAccess = await microBitBle.requestI2CAccess();
  var i2cPort = i2cAccess.ports.get(1);
  adt7410 = new ADT7410(i2cPort, 0x48);
  await adt7410.init();
  readEnable = true;

  var gpioAccess = await microBitBle.requestGPIOAccess();
  var mbGpioPorts = gpioAccess.ports;
  gpioPort0 = mbGpioPorts.get(0);
  await gpioPort0.export("out"); //port0 out
  blinkEnable = true;

  // microbitが接続されたら関数を呼び出す
  pollButtonPush();
}

async function disconnect() {
  readEnable = false;
  await microBitBle.disconnect();
  msg.innerHTML = "micro:bit BLE接続を切断しました。";
}

async function LEDblink() {
  var gpio0Val = 0;
  var count = 0;
  while (blinkEnable) {
    gpio0Val = gpio0Val === 1 ? 0 : 1; // 条件 (三項) 演算子
    await gpioPort0.write(gpio0Val);
    //msg.innerHTML = gpio0Val;
    count++;
    if (count == 10) {
      break;
    }
    await sleep(1000);
  }
}

//messageをmicrobitのLEDで表示する関数
async function printMessage(message) {
  if (message.data.print) {
    var iconNumb = message.data.print;
    msg.innerText = "get print icon command :" + Math.floor(iconNumb);
    channel.send({ start: iconNumb }); // 表示の開始を知らせるメッセージを通知
    await microBitBle.printLED(String(Math.floor(iconNumb))); // micro:bitに表示を指示する(表示の完了に時間がかかる)
    channel.send({ done: iconNumb }); // 表示の完了を知らせるメッセージを通知
    if (iconNumb > 28 && iconNumb < 40) {
      await microBitBle.printLED("HOT");
      LEDblink();
    } else if (iconNumb < 20) {
      await microBitBle.printLED("DARK");
    }
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

      var temp; // = sensorData.temperature.toString();
      var brt = sensorData.brightness.toString();
      if (sensorData.button == 1) {
        temp = await adt7410.read();

        channel.send({ print: String(Math.floor(temp)) });
      } else if (sensorData.button == 2) {
        channel.send({ print: brt });
      }
    }
    await sleep(200);
  }
}
/*//値を読み通信する関数
async function readData() {
  var readVal;
  while (readEnable) {
    readVal = await adt7410.read();
    console.log("readVal:", readVal);
    msg.innerHTML = "温度: " + readVal + "℃";
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
}*/
