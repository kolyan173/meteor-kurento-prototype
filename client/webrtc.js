Template.hello.events({
    'click #setup-new-broadcast': function () {
        this.disabled = true;
        presenter();
    }
    //
    // 'click .join': function (e) {
    //     // console.log(e);
    //     this.disabled = true;
    //
    //     var sessionid = e.target.dataset.sessionid;
    //     session = sessions[sessionid];
    //     if (!session) throw 'No such session exists.';
    //     connection.join(session);
    // },
    //
    // 'click #stop-streaming': function() {
    //     connection.streams.stop();
    // }
});


function presenter() {
	if (!webRtcPeer) {
		var options = {
			localVideo: video,
			onicecandidate : onIceCandidate
	    }

		webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerSendonly(options, function(error) {
			if(error) return onError(error);

			this.generateOffer(onOfferPresenter);
		});
	}
}

function onIceCandidate(candidate) {
	   console.log('Local candidate' + JSON.stringify(candidate));

	   var message = {
	      id : 'onIceCandidate',
	      candidate : candidate
	   }
	   sendMessage(message);
}

function sendMessage(message) {
	console.log('Senging message: ', message);
	Meteor.call('send', message, onMessage);
}

function onOfferPresenter(error, offerSdp) {
    if (error) return onError(error);

	var message = {
		id : 'presenter',
		sdpOffer : offerSdp
	};
	Meteor.bindEnvironment(sendMessage(message));
}

function onMessage(message) {
    console.log(message);
    //
    // var parsedMessage = message.data;
	// console.info('Received message: ' + message.data);
    //
	// switch (parsedMessage.id) {
	// case 'presenterResponse':
	// 	presenterResponse(parsedMessage);
	// 	break;
	// case 'viewerResponse':
	// 	viewerResponse(parsedMessage);
	// 	break;
	// case 'stopCommunication':
	// 	dispose();
	// 	break;
	// case 'iceCandidate':
	// 	webRtcPeer.addIceCandidate(parsedMessage.candidate)
	// 	break;
	// default:
	// 	console.error('Unrecognized message', parsedMessage);
	// }
}

function presenterResponse(message) {
	if (message.response != 'accepted') {
		var errorMsg = message.message ? message.message : 'Unknow error';
		console.warn('Call not accepted for the following reason: ' + errorMsg);
		dispose();
	} else {
		webRtcPeer.processAnswer(message.sdpAnswer);

        Alerts.find().observe({
            added: function(doc) {
                console.log('Alert added', doc);
            }
        })
	}
}

function viewerResponse(message) {
	if (message.response != 'accepted') {
		var errorMsg = message.message ? message.message : 'Unknow error';
		console.warn('Call not accepted for the following reason: ' + errorMsg);
		dispose();
	} else {
		webRtcPeer.processAnswer(message.sdpAnswer);
	}
}

function dispose() {
	if (webRtcPeer) {
		webRtcPeer.dispose();
		webRtcPeer = null;
	}
}
