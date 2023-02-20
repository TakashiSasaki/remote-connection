const defaultChannelName = "chirimenChannel";

function tinyWssModule(wssRelayHost, serviceToken) {
  function openWSS(wssUrl) {
    var socket = new WebSocket(wssUrl);
    return new Promise(function (okCallback, ngCallback) {
      socket.addEventListener("open", function (event) {
        okCallback(socket);
      });
    });
  }

  async function subscribe(channelName) {
    if (!channelName) {
      channelName = defaultChannelName;
    }
    var socket = await openWSS(
      wssRelayHost + "/" + serviceToken + "/" + channelName
    );
    console.log(socket);
    console.log("tinyWssModule:channelOpened");
    if (wssRelayHost.indexOf("herokuapp.com") > 0) {
      // Herokuでは55秒ルールでチャンネルが切れるため・・・
      setTimeout(ping, 45 * 1000);
    }
    function onmessage(cbFunc) {
      socket.addEventListener("message", function (event) {
        //					console.log('message',event);
        var json = JSON.parse(event.data);
        cbFunc({
          data: json.body,
          timeStamp: event.timeStamp,
          origin: event.origin,
          //						lastEventId: event.lastEventId
        });
      });
    }
    function send(msg) {
      //				console.log("sendMsg:",msg,"  typeof(msg)",typeof(msg));
      var outMsg = { body: msg };
      outMsg = JSON.stringify(outMsg);
      //				console.log("sendMsg:",outMsg);
      socket.send(outMsg);
    }
    function ping() {
      // Herokuでのコネクション維持用ヌルメッセージ
      socket.send("");
      setTimeout(ping, 45 * 1000);
    }
    return {
      serverName: wssRelayHost,
      set onmessage(cbf) {
        onmessage(cbf);
      },
      send: send,
    };
  } //async function subscribe
  return {
    subscribe: subscribe,
  };
} //function tinyWssModule

export { defaultChannelName, tinyWssModule };
