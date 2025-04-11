


let DID_API;






//// Compatibility code for RTCPeerConnection across different browsers
//same  - No edits from Github example from D-ID Team for this section
const RTCPeerConnection = (
  window.RTCPeerConnection ||
  window.webkitRTCPeerConnection ||
  window.mozRTCPeerConnection
).bind(window);

// Variables for managing the peer connection and streaming
let peerConnection;
let streamId;
let sessionId;
let sessionClientAnswer;

let statsIntervalId;
let videoIsPlaying;
let lastBytesReceived;

// Getting references to various elements on the page
const talkVideo = document.getElementById('talk-video');
talkVideo.setAttribute('playsinline', '');
const peerStatusLabel = document.getElementById('peer-status-label');
const iceStatusLabel = document.getElementById('ice-status-label');
const iceGatheringStatusLabel = document.getElementById('ice-gathering-status-label');
const signalingStatusLabel = document.getElementById('signaling-status-label');
const streamingStatusLabel = document.getElementById('streaming-status-label');

// Event handler for the connect button - to set up connections
const connectButton = document.getElementById('connect-button');

connectButton.onclick = async () => {
  try {
    // Early return if already connected
    if (peerConnection && peerConnection.connectionState === 'connected') {
      return;
    }

    // Setup and initiate streaming
    stopAllStreams();
    closePC();
    
    const sessionResponse = await fetch('/did-proxy/talks/streams', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        source_url: "https://raw.githubusercontent.com/Moudathirou/QRCODE_generator_/main/data_scientist.png",
      }),
    });

    if (!sessionResponse.ok) {
      const errorText = await sessionResponse.text();
      throw new Error(`Session creation failed: ${errorText}`);
    }

    const sessionData = await sessionResponse.json();
    console.log('Session data:', JSON.stringify(sessionData, null, 2));

    const { id: newStreamId, offer, ice_servers: iceServers, session_id: newSessionId } = sessionData;
    streamId = newStreamId;
    sessionId = newSessionId;
    
    sessionClientAnswer = await createPeerConnection(offer, iceServers);

    const sdpResponse = await fetch(`/did-proxy/talks/streams/${streamId}/sdp`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        answer: sessionClientAnswer,
        session_id: sessionId
      })
    });

    if (!sdpResponse.ok) {
      const errorText = await sdpResponse.text();
      throw new Error(`SDP exchange failed: ${errorText}`);
    }

  } catch (error) {
    console.error('Connection setup error:', error);
    stopAllStreams();
    closePC();
  }
};



  // This is the event listener that checks the "Send to D-ID" checkbox os checked before proceeding
   document.addEventListener('chatResponse', async (event) => {
    console.log("chatResponse event triggered");
    const chatResponse = event.detail; // The detail property contains the response data
  
    // Check if the "Send to DID" checkbox is checked
    const toggleDIDCheckbox = document.getElementById('toggleDID');
    
    if (toggleDIDCheckbox && toggleDIDCheckbox.checked) {
      // Only call handleDIDStreaming if the checkbox is checked
      handleDIDStreaming(chatResponse);
    } else {
      console.log("DID streaming is toggled off. Not sending to DID.");
    }
    });

    
// Handle the streaming logic with D-ID API
//fr-FR-HenriNeural,fr-FR-VivienneMultilingualNeural
export async function handleDIDStreaming(chatResponse) {
    console.log("Entered handleDIDStreaming function");
  try {
    const requestUrl = `/did-proxy/talks/streams/${streamId}`;
    const requestBody = {
      script: {
        type: 'text',
        subtitles: 'false',
        provider: { type: 'microsoft', voice_id: 'fr-FR-HenriNeural' },
        ssml: false,
        input: chatResponse  // Send the chatResponse to D-ID
      },
      config: {
        fluent: true,
        pad_audio: .0,
        driver_expressions: {
          expressions: [{ expression: 'neutral', start_frame: 0, intensity: 0 }],
          transition_frames: 0
        },
        align_driver: true,
        align_expand_factor: 0,
        auto_match: true,
        motion_factor: 0,
        normalization_factor: 0,
        sharpen: true,
        stitch: true,
        result_format: 'mp4'
      },
      'driver_url': 'bank://subtle/driver-03',
      'config': {
        'stitch': true,
      },
      'session_id': sessionId
    };
  
    console.log('Sending request to D-ID API:', requestUrl);
    console.log('Request body:', JSON.stringify(requestBody, null, 2));

   

    const talkResponse = await fetch(requestUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    

    if (!talkResponse.ok) {
      throw new Error(`D-ID streaming request failed with status ${talkResponse.status}`);
    }

    const responseData = await talkResponse.json();
    console.log('D-ID Streaming Response:', responseData);

  } catch (error) {
    console.error('Error during D-ID streaming:', error);
  }
}


function onIceGatheringStateChange() {
  iceGatheringStatusLabel.innerText = peerConnection.iceGatheringState;
  iceGatheringStatusLabel.className = 'iceGatheringState-' + peerConnection.iceGatheringState;
}
function onIceCandidate(event) {
  console.log('onIceCandidate', event);
  if (event.candidate) {
    const { candidate, sdpMid, sdpMLineIndex } = event.candidate;

    fetch(`/did-proxy/talks/streams/${streamId}/ice`, {
      method: 'POST',
      headers: {
        //Authorization: `Basic ${DID_API.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        candidate,
        sdpMid,
        sdpMLineIndex,
        session_id: sessionId,
      }),
    });
  }
}
function onIceConnectionStateChange() {
  iceStatusLabel.innerText = peerConnection.iceConnectionState;
  iceStatusLabel.className = 'iceConnectionState-' + peerConnection.iceConnectionState;
  if (peerConnection.iceConnectionState === 'failed' || peerConnection.iceConnectionState === 'closed') {
    stopAllStreams();
    closePC();
  }
}
function onConnectionStateChange() {
  // not supported in firefox
  peerStatusLabel.innerText = peerConnection.connectionState;
  peerStatusLabel.className = 'peerConnectionState-' + peerConnection.connectionState;
}
function onSignalingStateChange() {
  signalingStatusLabel.innerText = peerConnection.signalingState;
  signalingStatusLabel.className = 'signalingState-' + peerConnection.signalingState;
}

function onVideoStatusChange(videoIsPlaying, stream) {
  let status;
  if (videoIsPlaying) {
    status = 'streaming';
    const remoteStream = stream;
    setVideoElement(remoteStream);
  } else {
    status = 'empty';
    playIdleVideo();
  }
  streamingStatusLabel.innerText = status;
  streamingStatusLabel.className = 'streamingState-' + status;
}



function onTrack(event) {
  if (!event.track) return;

  const receiver = peerConnection.getReceivers().find(r => r.track === event.track);
  if (!receiver) {
    console.warn('Aucun récepteur associé à la piste.');
    return;
  }

  statsIntervalId = setInterval(async () => {
    try {
      const stats = await receiver.getStats();
      stats.forEach((report) => {
        if (report.type === 'inbound-rtp' && report.kind === 'video') {
          const bytesReceived = report.bytesReceived || 0;
          const videoStatusChanged = videoIsPlaying !== (bytesReceived > lastBytesReceived);

          if (videoStatusChanged) {
            videoIsPlaying = bytesReceived > lastBytesReceived;
            onVideoStatusChange(videoIsPlaying, event.streams[0]);
          }
          lastBytesReceived = bytesReceived;
        }
      });
    } catch (error) {
      console.error('Erreur lors de l\'obtention des statistiques :', error);
    }
  }, 500);
}


async function createPeerConnection(offer, iceServers) {
  if (!peerConnection) {
    peerConnection = new RTCPeerConnection({ iceServers });
    peerConnection.addEventListener('icegatheringstatechange', onIceGatheringStateChange, true);
    peerConnection.addEventListener('icecandidate', onIceCandidate, true);
    peerConnection.addEventListener('iceconnectionstatechange', onIceConnectionStateChange, true);
    peerConnection.addEventListener('connectionstatechange', onConnectionStateChange, true);
    peerConnection.addEventListener('signalingstatechange', onSignalingStateChange, true);
    peerConnection.addEventListener('track', onTrack, true);
  }

  try {
    // Validate and parse the offer
    if (!offer || typeof offer !== 'object') {
      throw new Error('Invalid offer object');
    }

    console.log('Offer details:', JSON.stringify(offer, null, 2));

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    console.log('set remote sdp OK');

    const sessionClientAnswer = await peerConnection.createAnswer();
    console.log('create local sdp OK');

    await peerConnection.setLocalDescription(sessionClientAnswer);
    console.log('set local sdp OK');

    return sessionClientAnswer;
  } catch (error) {
    console.error('Error in createPeerConnection:', error);
    throw error;
  }
}

function setVideoElement(stream) {
  if (!stream) return;
  talkVideo.srcObject = stream;
  talkVideo.loop = false;

  // safari hotfix
  if (talkVideo.paused) {
    talkVideo
      .play()
      .then((_) => {})
      .catch((e) => {});
  }
}

function playIdleVideo() {
  talkVideo.srcObject = undefined;
  talkVideo.src = '/videos/mouda3.mp4';
  talkVideo.loop = true;
}

function stopAllStreams() {
  if (talkVideo.srcObject) {
    console.log('stopping video streams');
    talkVideo.srcObject.getTracks().forEach((track) => track.stop());
    talkVideo.srcObject = null;
  }
}

function closePC(pc = peerConnection) {
  if (!pc) return;
  console.log('stopping peer connection');
  pc.close();
  pc.removeEventListener('icegatheringstatechange', onIceGatheringStateChange, true);
  pc.removeEventListener('icecandidate', onIceCandidate, true);
  pc.removeEventListener('iceconnectionstatechange', onIceConnectionStateChange, true);
  pc.removeEventListener('connectionstatechange', onConnectionStateChange, true);
  pc.removeEventListener('signalingstatechange', onSignalingStateChange, true);
  pc.removeEventListener('track', onTrack, true);
  clearInterval(statsIntervalId);
  iceGatheringStatusLabel.innerText = '';
  signalingStatusLabel.innerText = '';
  iceStatusLabel.innerText = '';
  peerStatusLabel.innerText = '';
  console.log('stopped peer connection');
  if (pc === peerConnection) {
    peerConnection = null;
  }
}

// Function for fetch with retries logic
const maxRetryCount = 5;
const maxDelaySec = 4;
// Default of 1 moved to 3
async function fetchWithRetries(url, options, retries = 3) {
  try {
    return await fetch(url, options);
  } catch (err) {
    if (retries <= maxRetryCount) {
      const delay = Math.min(Math.pow(2, retries) / 4 + Math.random(), maxDelaySec) * 1000;

      await new Promise((resolve) => setTimeout(resolve, delay));

      console.log(`Request failed, retrying ${retries}/${maxRetryCount}. Error ${err}`);
      return fetchWithRetries(url, options, retries + 1);
    } else {
      throw new Error(`Max retries exceeded. error: ${err}`);
    }
  }
}