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
*/

function scaledroneModule(serviceToken) {
  if(typeof serviceToken !== "string") throw "serviceToken is mandatory.";
  
  var drone, room;
  var clientId;
  var sdUrl;
  function open(channelName) {
    drone = new Scaledrone(serviceToken);
    room = drone.subscribe(channelName);
    return new Promise(function (okCallback, ngCallback) {
      room.on("open", function (error) {
        if (error) {
          ngCallback(error);
        }
        clientId = drone.clientId;
        sdUrl = new URL(drone.connection.url);
        //					console.log("connected: clientId:",clientId);
        okCallback(true);
      });
    });
  }
  async function subscribe(channelName) {
    if (typeof channelName !== "string") throw "channelName is mandatory.";

    await open(channelName);
    console.log("scaledroneModule:channelOpened");
    function onmessage(cbFunc) {
      room.on("message", function (message) {
        //					console.log('Received data:', message);
        // 自分が送ったものは返さないようにね
        if (message.clientId != clientId) {
          cbFunc({
            data: message.data,
            timeStamp: message.timestamp,
            origin: sdUrl.origin,
            //							lastEventId: message.id
          });
        }
      });
    }
    function send(msg) {
      drone.publish({
        room: channelName,
        //					message: {body:msg}
        message: msg,
      });
    }
    return {
      serverName: "scaledrone",
      set onmessage(cbf) {
        onmessage(cbf);
      },
      send: send,
    };
  }
  return {
    subscribe: subscribe,
  };
} //function scaledroneModule

export { scaledroneModule };
