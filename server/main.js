var kurento = Meteor.npmRequire("kurento-client");
var sessionId = 123;
var candidatesQueue = {};
var kurentoClient = null;
var presenter = null;
var viewers = [];
var noPresenterMessage = 'No active presenter. Try again later...';
var ws_uri = 'ws://localhost:8888/kurento';


Meteor.methods({
    send: function(msg) {
        var message = msg;
        console.log('Connection ' + sessionId + ' received message ', message);

        switch (message.id) {
        case 'presenter':
			startPresenter(sessionId, /*ws,*/ message.sdpOffer, function(error, sdpAnswer) {
				if (error) {
					return {
						id : 'presenterResponse',
						response : 'rejected',
						message : error
					};
				}

				return {
					id : 'presenterResponse',
					response : 'accepted',
					sdpAnswer : sdpAnswer
				};
			});
			break;

    //     case 'viewer':
	// 		startViewer(sessionId, ws, message.sdpOffer, function(error, sdpAnswer) {
	// 			if (error) {
	// 				return ws.send(JSON.stringify({
	// 					id : 'viewerResponse',
	// 					response : 'rejected',
	// 					message : error
	// 				}));
	// 			}
    //
	// 			ws.send(JSON.stringify({
	// 				id : 'viewerResponse',
	// 				response : 'accepted',
	// 				sdpAnswer : sdpAnswer
	// 			}));
	// 		});
	// 		break;
    //
    //     case 'stop':
    //         stop(sessionId);
    //         break;
    //
        // case 'onIceCandidate':
        //     onIceCandidate(sessionId, message.candidate);
        //     break;

        // default:
    //         ws.send(JSON.stringify({
    //             id : 'error',
    //             message : 'Invalid message ' + message
    //         }));
    //         break;
        }
    }
});

function startPresenter(sessionId, /*ws,*/ sdpOffer, callback) {
    console.log('---------sdpOffer', sdpOffer);
	clearCandidatesQueue(sessionId);

	if (presenter !== null) {
		// stop(sessionId);
		return callback("Another user is currently acting as presenter. Try again later ...");
	}

	presenter = {
		id : sessionId,
		pipeline : null,
		webRtcEndpoint : null
	}

	getKurentoClient(function(error, kurentoClient) {
		if (error) {
			stop(sessionId);
			return callback(error);
		}

		if (presenter === null) {
			stop(sessionId);
			return callback(noPresenterMessage);
		}

		kurentoClient.create('MediaPipeline', function(error, pipeline) {
			if (error) {
				stop(sessionId);
				return callback(error);
			}

			if (presenter === null) {
				stop(sessionId);
				return callback(noPresenterMessage);
			}

			presenter.pipeline = pipeline;
			pipeline.create('WebRtcEndpoint', function(error, webRtcEndpoint) {
				if (error) {
					stop(sessionId);
					return callback(error);
				}

				if (presenter === null) {
					stop(sessionId);
					return callback(noPresenterMessage);
				}

				presenter.webRtcEndpoint = webRtcEndpoint;

                if (candidatesQueue[sessionId]) {
                    while(candidatesQueue[sessionId].length) {
                        var candidate = candidatesQueue[sessionId].shift();
                        webRtcEndpoint.addIceCandidate(candidate);
                    }
                }

                webRtcEndpoint.on('OnIceCandidate', function(event) {
                    var candidate = kurento.register.complexTypes.IceCandidate(event.candidate);

                    Alerts.insert({
                        id : 'iceCandidate',
                        candidate : candidate
                    });
                    // ws.send(JSON.stringify({
                    //     id : 'iceCandidate',
                    //     candidate : candidate
                    // }));
                });

				webRtcEndpoint.processOffer(sdpOffer, function(error, sdpAnswer) {
					if (error) {
						stop(sessionId);
						return callback(error);
					}

					if (presenter === null) {
						stop(sessionId);
						return callback(noPresenterMessage);
					}

					callback(null, sdpAnswer);
				});

                webRtcEndpoint.gatherCandidates(function(error) {
                    if (error) {
                        stop(sessionId);
                        return callback(error);
                    }
                });
            });
        });
	});
}

function clearCandidatesQueue(sessionId) {
	if (candidatesQueue[sessionId]) {
		delete candidatesQueue[sessionId];
	}
}

function getKurentoClient(callback) {
    if (kurentoClient !== null) {
        return callback(null, kurentoClient);
    }

    kurento(ws_uri, Meteor.bindEnvironment(function(error, _kurentoClient) {
        if (error) {
            console.log("Could not find media server at address " + ws_uri);
            return callback("Could not find media server at address" + ws_uri
                    + ". Exiting with error " + error);
        }

        kurentoClient = _kurentoClient;
        Meteor.bindEnvironment(callback(null, kurentoClient));
    }));
}
