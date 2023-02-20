function piesocketModule(ClusterID, serviceToken, defaultChannelName) {
    var socket;
    if (!ClusterID) {
        ClusterID = "demo";
    }
    function open(channelName) {
        //			var channelNumber = crc16(channelName);
        var channelNumber = channelName;
        socket = new WebSocket(
            "wss://" +
            ClusterID +
            ".piesocket.com/v3/" +
            channelNumber +
            "?apiKey=" +
            serviceToken
        );
        return new Promise(function (okCallback, ngCallback) {
            socket.addEventListener("open", function (event) {
                okCallback(true);
            });
        });
    }
    async function subscribe(channelName) {
        if (!channelName) {
            channelName = defaultChannelName;
        }
        await open(channelName);
        console.log("piesocketModule:channelOpened");
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
        return {
            serverName: "websocket.in",
            set onmessage(cbf) {
                onmessage(cbf);
            },
            send: send,
        };
    }
    return {
        subscribe: subscribe,
    };
}

export { piesocketModule };
