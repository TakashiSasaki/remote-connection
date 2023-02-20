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

import { tinyWssModule } from "./tinyWssModule.js";
import { piesocketModule } from "./piesocketModule.js";
import { scaledroneModule } from "./scaledroneModule.js";
import { achexModule } from "./achexModule.js";

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
    achex: (serviceToken) => achexModule(serviceToken),
    //		"websocket.in" : websocketInModule,
    //		websocketin : websocketInModule,
    piesocket: piesocketModule,
    scaledrone: scaledroneModule,
    wss: tinyWssModule,
    chirimentest: (serviceToken) =>
      tinyWssModule(
        "wss://chirimen-web-socket-relay.herokuapp.com",
        serviceToken
      ),
    chirimentestlocal: (serviceToken) =>
      tinyWssModule("ws://localhost:3000", serviceToken),
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
      relayService = serviecs[serviceName.toLowerCase()](serviceToken);
    }
  } else {
    // 別途規定されたリレーサービスを組み込める？
    relayService = serviceName;
  }

  return {
    subscribe: relayService.subscribe,
  };
} //function RelayServer

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
} //function initialize4node

export { RelayServer, initialize4node };
