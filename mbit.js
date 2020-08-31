var microBitBle;
var adt7410;
var readEnable;
var channel;

var gpioPort0;
var blinkEnable;

var npix;
var neoPixels = 64; // LED個数

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

  npix = new NEOPIXEL_I2C(i2cPort, 0x41);
  await npix.init(neoPixels);
  msg.innerHTML = "micro:bit neopixelを初期化しました。";
  // microbitが接続されたら関数を呼び出す
  pollButtonPush();
}

async function disconnect() {
  readEnable = false;
  await microBitBle.disconnect();
  msg.innerHTML = "micro:bit BLE接続を切断しました。";
}

async function nPixTest1() {
  console.log("nPix:", npix);
  await npix.setGlobal(10, 0, 0);
  await sleep(1000);
  await npix.setGlobal(20, 0, 0);
  await sleep(1000);
  await npix.setGlobal(0, 0, 0);
}

async function nPixTest2() {
  console.log("nPix:", npix);
  await npix.setGlobal(0, 10, 0);
  await sleep(1000);
  await npix.setGlobal(0, 20, 0);
  await sleep(1000);

  await npix.setGlobal(0, 0, 0);
}

//messageをmicrobitのLEDで表示する関数
async function printMessage(message) {
  if (message.data.print) {
    var iconNumb = message.data.print;
    msg.innerText = "get print icon command :" + Math.floor(iconNumb);
    channel.send({ start: iconNumb }); // 表示の開始を知らせるメッセージを通知
    await microBitBle.printLED(String(Math.floor(iconNumb))); // micro:bitに表示を指示する(表示の完了に時間がかかる)
    channel.send({ done: iconNumb }); // 表示の完了を知らせるメッセージを通知
    if (iconNumb >= 28 && iconNumb <= 41) {
      await microBitBle.printLED("HOT");
      nPixTest1();
    } else if (iconNumb < 20) {
      await microBitBle.printLED("DARK");
      nPixTest2();
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

async function setPattern0(iH) {
  startH = 0;
  if (iH) {
    startH = iH;
  }
  var grbArray = [];
  var nLED = npix.N_LEDS;
  //	var nLED = 10;
  for (var i = 0; i < nLED; i++) {
    var h = startH + (360 * i) / nLED;
    var s = 1;
    var v = 0.05;
    var rgb = hsvToRgb(h, s, v);
    grbArray.push(rgb[1]);
    grbArray.push(rgb[0]);
    grbArray.push(rgb[2]);
    //		await npix.setPixel(i , rgb[0],rgb[1],rgb[2]);
  }
  await npix.setPixels(grbArray);
}

// from https://qiita.com/hachisukansw/items/633d1bf6baf008e82847
function hsvToRgb(H, S, V) {
  //https://en.wikipedia.org/wiki/HSL_and_HSV#From_HSV

  H = H % 360;

  var C = V * S;
  var Hp = H / 60;
  var X = C * (1 - Math.abs((Hp % 2) - 1));

  var R, G, B;
  if (0 <= Hp && Hp < 1) {
    [R, G, B] = [C, X, 0];
  }
  if (1 <= Hp && Hp < 2) {
    [R, G, B] = [X, C, 0];
  }
  if (2 <= Hp && Hp < 3) {
    [R, G, B] = [0, C, X];
  }
  if (3 <= Hp && Hp < 4) {
    [R, G, B] = [0, X, C];
  }
  if (4 <= Hp && Hp < 5) {
    [R, G, B] = [X, 0, C];
  }
  if (5 <= Hp && Hp < 6) {
    [R, G, B] = [C, 0, X];
  }

  var m = V - C;
  [R, G, B] = [R + m, G + m, B + m];

  R = Math.floor(R * 255);
  G = Math.floor(G * 255);
  B = Math.floor(B * 255);

  return [R, G, B];
}
