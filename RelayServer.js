/**
CHIRIMEN RelayServer.js

This is a common denominator wrapper API for webSocket relay services.
You can exchange data between web clients in real time.
The data should be a string or a stringifyable object.

This implementation is a response to the following issue.
https://github.com/chirimen-oh/chirimen/issues/91

================================================================================
Programmed by Satoru Takagi
Copyright 2020 by Satoru Takagi All Rights Reserved

================================================================================
License: (GPL v3)
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License version 3 as
published by the Free Software Foundation.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.


However, if you want to use the contents of this repository for CHIRIMEN 
community's projects, you can also choose the MIT license.
So, this is a limited dual license for the CHIRIMEN community.

================================================================================
History

2020/06/15 : 1st draft
2020/06/29 : onmessage(cbfunc) -> onmessage=cbfunc(message)
			 message.data,.origin,.timeStamp
2021/09/01 : support ESModule and Node.js websocket lib
		   for Browsers
			 import {RelayServer} from "./RelayServer.js";
			 relay = RelayServer("achex", "chirimenSocket" );
		   for Node.js
			 import WSLib from "websocket";
			 import {RelayServer} from "./RelayServer.js";
			 relay = RelayServer("achex", "chirimenSocket" , WSLib, "https://chirimen.org");
2021/09/02 : websocketin->piesocket
2021/10/18 : piesocket : RelayServer("[ClusterID].piesocket","[TOKEN]")
2022/10/07 : add tinyWssModule for https://github.com/chirimen-oh/chirimen-web-socket-relay and its heroku deployment (chirimentiny)
================================================================================
WebIDL:

enum ServiceName { "achex", "websocketin" , "websocket.in" , "scaledrone" };

[Exposed=(Window)]
interface RelayServer {
  constructor(ServiceName serviceName, USVString serviceToken, optional object nodeWebSocketLib, optional DOMString OriginURL);
  Promise<Channel> subscribe(optional USVString channelName);
}

interface Channel {
  readonly attribute USVString serverName;
  attribute MessageHandler onmessage;
  void send(USVString or object );
};

callback interface MessageHandler {
  void handleMessage(RSMessage message);
};

interface  RSMessage {
  readonly attribute object data;
  readonly attribute USVString origin;
  readonly attribute USVString timeStamp;
}

**/

const defaultChannelName = "chirimenChannel";

import { tinyWssModule } from "./tinyWssModule.js";
import { piesocketModule } from "./piesocketModule.js";
import {scaledroneModule} from "./scaledroneModule.js";

function RelayServer(serviceName, serviceToken, nodeWebSocketLib, OriginURL) {
  if (typeof window == "undefined") {
    // node
    if (typeof WebSocket == "undefined") {
      if (!OriginURL || typeof nodeWebSocketLib != "object") {
        throw "nodeWebSocketClass and OriginURL are required.";
      } else {
        initialize4node(nodeWebSocketLib, OriginURL);
      }
    }
  }
  if (!serviceName || !serviceToken || typeof serviceToken != "string") {
    return null;
  }
  var serviecs = {
    achex: achexModule,
    //		"websocket.in" : websocketInModule,
    //		websocketin : websocketInModule,
    piesocket: piesocketModule,
    scaledrone: scaledroneModule,
    wss: tinyWssModule,
    chirimentest: chirimenTest,
    chirimentestlocal: chirimenTestLocal,
  };
  var relayService;
  if (typeof serviceName == "string") {
    if (serviceName.indexOf("wss://") == 0) {
      relayService = serviecs["wss"](serviceName);
    } else if (serviceName.lastIndexOf(".") > 0) {
      var sn = serviceName.toLowerCase();
      var subSn = sn.substring(0, sn.lastIndexOf("."));
      sn = sn.substring(sn.lastIndexOf(".") + 1);
      relayService = serviecs[sn](subSn);
    } else {
      relayService = serviecs[serviceName.toLowerCase()]();
    }
  } else {
    // 別途規定されたリレーサービスを組み込める？
    relayService = serviceName;
  }
  //	console.log("relayService:",relayService);

  function chirimenTestLocal() {
    var wssRelayHost = "ws://localhost:3000";
    return tinyWssModule(wssRelayHost, serviceToken, defaultChannelName);
  }

  function chirimenTest() {
    var wssRelayHost = "wss://chirimen-web-socket-relay.herokuapp.com";
    return tinyWssModule(wssRelayHost, serviceToken, defaultChannelName);
  }


  function achexModule() {
    var socket;
    var SID; // サービスから割り付けられるセッションID
    var userName = "chirimenUser";
    var userPassWord = "passs";
    function open(channelName) {
      // channelNameをuserNameに割り当てるトリックを使う
      userName = channelName;
      socket = new WebSocket("wss://cloud.achex.ca/" + serviceToken);
      return new Promise(function (okCallback, ngCallback) {
        socket.addEventListener("open", function (event) {
          socket.send(
            '{"auth":"' + userName + '", "password":"' + userPassWord + '"}'
          );
          okCallback(true);
        });
      });
    }

    async function subscribe(channelName) {
      if (!channelName) {
        channelName = defaultChannelName;
      }
      await open(channelName);
      console.log("achexModule:channelOpened");
      function onmessage(cbFunc) {
        socket.addEventListener("message", function (event) {
          //					console.log('message',event);
          const json = JSON.parse(event.data);
          if (json.auth == "OK") {
            SID = json.SID;
          } else {
            //						console.log("json.sID:",json.sID,"  thisSID:",SID);
            if (json.sID != SID) {
              // 自分が投げたものは返答しないことにする
              cbFunc({
                data: json.msg,
                timeStamp: event.timeStamp,
                origin: event.origin,
                //								lastEventId: event.lastEventId
              });
            }
          }
        });
      }
      function send(msg) {
        var outMsg = {
          to: userName,
          msg: msg,
        };
        outMsg = JSON.stringify(outMsg);
        //				console.log("achexModule to send:",outMsg);
        socket.send(outMsg);
      }
      return {
        serverName: "achex",
        set onmessage(cbf) {
          onmessage(cbf);
        },
        send: send,
      };
    }
    //		await open();

    return {
      //			open:open,
      subscribe: subscribe,
    };
  }

  return {
    subscribe: relayService.subscribe,
  };
}

// websocketInModuleのチャンネルが文字列でなく数字なので一応・・・
// https://github.com/donvercety/node-crc16/
function crc16(str) {
  const crctab16 = new Uint16Array([
    0x0000, 0x1189, 0x2312, 0x329b, 0x4624, 0x57ad, 0x6536, 0x74bf, 0x8c48,
    0x9dc1, 0xaf5a, 0xbed3, 0xca6c, 0xdbe5, 0xe97e, 0xf8f7, 0x1081, 0x0108,
    0x3393, 0x221a, 0x56a5, 0x472c, 0x75b7, 0x643e, 0x9cc9, 0x8d40, 0xbfdb,
    0xae52, 0xdaed, 0xcb64, 0xf9ff, 0xe876, 0x2102, 0x308b, 0x0210, 0x1399,
    0x6726, 0x76af, 0x4434, 0x55bd, 0xad4a, 0xbcc3, 0x8e58, 0x9fd1, 0xeb6e,
    0xfae7, 0xc87c, 0xd9f5, 0x3183, 0x200a, 0x1291, 0x0318, 0x77a7, 0x662e,
    0x54b5, 0x453c, 0xbdcb, 0xac42, 0x9ed9, 0x8f50, 0xfbef, 0xea66, 0xd8fd,
    0xc974, 0x4204, 0x538d, 0x6116, 0x709f, 0x0420, 0x15a9, 0x2732, 0x36bb,
    0xce4c, 0xdfc5, 0xed5e, 0xfcd7, 0x8868, 0x99e1, 0xab7a, 0xbaf3, 0x5285,
    0x430c, 0x7197, 0x601e, 0x14a1, 0x0528, 0x37b3, 0x263a, 0xdecd, 0xcf44,
    0xfddf, 0xec56, 0x98e9, 0x8960, 0xbbfb, 0xaa72, 0x6306, 0x728f, 0x4014,
    0x519d, 0x2522, 0x34ab, 0x0630, 0x17b9, 0xef4e, 0xfec7, 0xcc5c, 0xddd5,
    0xa96a, 0xb8e3, 0x8a78, 0x9bf1, 0x7387, 0x620e, 0x5095, 0x411c, 0x35a3,
    0x242a, 0x16b1, 0x0738, 0xffcf, 0xee46, 0xdcdd, 0xcd54, 0xb9eb, 0xa862,
    0x9af9, 0x8b70, 0x8408, 0x9581, 0xa71a, 0xb693, 0xc22c, 0xd3a5, 0xe13e,
    0xf0b7, 0x0840, 0x19c9, 0x2b52, 0x3adb, 0x4e64, 0x5fed, 0x6d76, 0x7cff,
    0x9489, 0x8500, 0xb79b, 0xa612, 0xd2ad, 0xc324, 0xf1bf, 0xe036, 0x18c1,
    0x0948, 0x3bd3, 0x2a5a, 0x5ee5, 0x4f6c, 0x7df7, 0x6c7e, 0xa50a, 0xb483,
    0x8618, 0x9791, 0xe32e, 0xf2a7, 0xc03c, 0xd1b5, 0x2942, 0x38cb, 0x0a50,
    0x1bd9, 0x6f66, 0x7eef, 0x4c74, 0x5dfd, 0xb58b, 0xa402, 0x9699, 0x8710,
    0xf3af, 0xe226, 0xd0bd, 0xc134, 0x39c3, 0x284a, 0x1ad1, 0x0b58, 0x7fe7,
    0x6e6e, 0x5cf5, 0x4d7c, 0xc60c, 0xd785, 0xe51e, 0xf497, 0x8028, 0x91a1,
    0xa33a, 0xb2b3, 0x4a44, 0x5bcd, 0x6956, 0x78df, 0x0c60, 0x1de9, 0x2f72,
    0x3efb, 0xd68d, 0xc704, 0xf59f, 0xe416, 0x90a9, 0x8120, 0xb3bb, 0xa232,
    0x5ac5, 0x4b4c, 0x79d7, 0x685e, 0x1ce1, 0x0d68, 0x3ff3, 0x2e7a, 0xe70e,
    0xf687, 0xc41c, 0xd595, 0xa12a, 0xb0a3, 0x8238, 0x93b1, 0x6b46, 0x7acf,
    0x4854, 0x59dd, 0x2d62, 0x3ceb, 0x0e70, 0x1ff9, 0xf78f, 0xe606, 0xd49d,
    0xc514, 0xb1ab, 0xa022, 0x92b9, 0x8330, 0x7bc7, 0x6a4e, 0x58d5, 0x495c,
    0x3de3, 0x2c6a, 0x1ef1, 0x0f78,
  ]);

  // calculate the 16-bit CRC of data with predetermined length.
  function _crc16(data) {
    var res = 0x0ffff;
    for (let b of data) {
      res = ((res >> 8) & 0x0ff) ^ crctab16[(res ^ b) & 0xff];
    }
    return ~res & 0x0ffff;
  }
  return _crc16(new TextEncoder().encode(str));
}

function initialize4node(nodeWebSocketLib, OriginURL) {
  console.log(typeof nodeWebSocketLib, OriginURL);
  if (!OriginURL || typeof nodeWebSocketLib != "object") {
    throw "nodeWebSocketClass and OriginURL are required.";
  }
  var nodeWebSocketClass = nodeWebSocketLib.w3cwebsocket;
  class WebSocket extends nodeWebSocketClass {
    constructor(url) {
      console.log(url, null, OriginURL);
      super(url, null, OriginURL); // OriginURLがないと、achex wssは接続失敗する
    }
  }

  global.WebSocket = WebSocket;
}

export { crc16, RelayServer, initialize4node };
