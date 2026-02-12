# How to Set Up AWS Interactive Video Service (IVS) for Live Streaming

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, IVS, Live Streaming, Video, Interactive, Real-Time

Description: Learn how to set up AWS Interactive Video Service (IVS) for low-latency live streaming with built-in chat, timed metadata, and viewer interaction features.

---

Building a live streaming platform used to require assembling a complex stack of video encoding, packaging, CDN distribution, and player integration. AWS Interactive Video Service (IVS) collapses all of this into a single managed service that gets you from zero to live streaming in minutes. It is designed specifically for interactive use cases like live shopping, gaming streams, fitness classes, and educational broadcasts where low latency and viewer engagement matter.

This guide covers setting up IVS channels, streaming from common tools, integrating the player, and adding interactive features like chat and timed metadata.

## What Is AWS IVS?

IVS is a managed live streaming service that provides:

- **Ultra-low latency streaming** - Under 3 seconds glass-to-glass latency
- **Built-in player SDK** - Web, iOS, and Android players with automatic quality adjustment
- **Timed metadata** - Send synchronized data alongside your video stream
- **Chat** - Built-in chat rooms with moderation capabilities
- **Auto-scaling** - Handles any number of concurrent viewers without configuration
- **Global distribution** - Content delivered through the AWS global edge network

Unlike MediaLive + MediaPackage, which give you granular control over every encoding parameter, IVS abstracts away the video pipeline and focuses on simplicity and interactivity.

## Prerequisites

- An AWS account with IVS permissions
- A streaming tool (OBS Studio, FFmpeg, or any RTMPS-compatible encoder)
- For player integration: a web application or mobile app

## Step 1: Create an IVS Channel

A channel represents a single live stream. Each channel gets a unique stream key and ingest endpoint.

```bash
# Create a standard latency channel
aws ivs create-channel \
  --name "my-live-channel" \
  --latency-mode LOW \
  --type STANDARD \
  --tags Environment=production,UseCase=gaming

# Response includes the channel ARN and playback URL
```

The `latency-mode` options are:
- **LOW** - Under 3 seconds latency (recommended for interactive streams)
- **NORMAL** - 5-10 seconds latency (more buffer, better quality in poor networks)

The `type` options are:
- **STANDARD** - Transcodes to multiple quality levels (adaptive bitrate)
- **BASIC** - Passes through the original quality only (lower cost)

## Step 2: Get the Stream Key

The stream key is what your encoder uses to authenticate and push video:

```bash
# Create a stream key for the channel
aws ivs create-stream-key \
  --channel-arn "arn:aws:ivs:us-east-1:123456789012:channel/abc123"
```

The response includes the stream key value. Treat this like a password - anyone with the stream key can push video to your channel.

```bash
# List stream keys for a channel
aws ivs list-stream-keys \
  --channel-arn "arn:aws:ivs:us-east-1:123456789012:channel/abc123"
```

## Step 3: Start Streaming

### Using OBS Studio

1. Open OBS Studio
2. Go to Settings > Stream
3. Set Service to "Custom"
4. Server: `rtmps://ingest.ivs.us-east-1.amazonaws.com:443/app/`
5. Stream Key: Your stream key from Step 2
6. Click "Start Streaming"

### Using FFmpeg

```bash
# Stream a test pattern using FFmpeg
ffmpeg -re -f lavfi -i "testsrc=size=1280x720:rate=30" \
  -f lavfi -i "sine=frequency=440:sample_rate=44100" \
  -c:v libx264 -preset veryfast -b:v 3000k -maxrate 3000k -bufsize 6000k \
  -pix_fmt yuv420p -g 60 \
  -c:a aac -b:a 128k -ar 44100 \
  -f flv "rtmps://ingest.ivs.us-east-1.amazonaws.com:443/app/YOUR_STREAM_KEY"
```

### Using a file as input

```bash
# Stream a video file to IVS
ffmpeg -re -i input-video.mp4 \
  -c:v libx264 -preset veryfast -b:v 3000k -maxrate 3000k -bufsize 6000k \
  -pix_fmt yuv420p -g 60 \
  -c:a aac -b:a 128k -ar 44100 \
  -f flv "rtmps://ingest.ivs.us-east-1.amazonaws.com:443/app/YOUR_STREAM_KEY"
```

## Step 4: Integrate the IVS Player

IVS provides player SDKs for web, iOS, and Android. Here is the web integration:

```html
<!-- Simple IVS web player -->
<!DOCTYPE html>
<html>
<head>
    <title>Live Stream</title>
    <!-- Load the IVS player SDK -->
    <script src="https://player.live-video.net/1.24.0/amazon-ivs-player.min.js"></script>
    <style>
        #video-player {
            width: 100%;
            max-width: 960px;
            aspect-ratio: 16/9;
            background: #000;
        }
    </style>
</head>
<body>
    <video id="video-player" playsinline controls></video>

    <script>
        // Initialize the IVS player
        const player = IVSPlayer.create();
        const videoElement = document.getElementById('video-player');

        // Attach the player to the video element
        player.attachHTMLVideoElement(videoElement);

        // Load the stream (use the playback URL from channel creation)
        player.load("https://abc123.us-east-1.playback.live-video.net/api/video/v1/us-east-1.123456789012.channel.abc123.m3u8");

        // Handle player events
        player.addEventListener(IVSPlayer.PlayerState.READY, () => {
            console.log("Player is ready");
        });

        player.addEventListener(IVSPlayer.PlayerState.PLAYING, () => {
            console.log("Stream is playing");
        });

        player.addEventListener(IVSPlayer.PlayerState.ENDED, () => {
            console.log("Stream has ended");
        });

        player.addEventListener(IVSPlayer.PlayerEventType.ERROR, (error) => {
            console.error("Player error:", error);
        });

        // Auto-play when ready
        player.addEventListener(IVSPlayer.PlayerState.READY, () => {
            player.play();
        });
    </script>
</body>
</html>
```

## Step 5: Add Timed Metadata

Timed metadata lets you send data that is synchronized with your video stream. This is how you implement features like live polls, product overlays, trivia questions, or score updates.

```bash
# Send timed metadata to a live stream
aws ivs put-metadata \
  --channel-arn "arn:aws:ivs:us-east-1:123456789012:channel/abc123" \
  --metadata '{"type":"poll","question":"Who will win?","options":["Team A","Team B"]}'
```

Handle the metadata in the player:

```javascript
// Listen for timed metadata events
player.addEventListener(IVSPlayer.PlayerEventType.TEXT_METADATA_CUE, (cue) => {
    const metadata = JSON.parse(cue.text);

    switch (metadata.type) {
        case 'poll':
            showPollOverlay(metadata.question, metadata.options);
            break;
        case 'product':
            showProductCard(metadata.productId, metadata.price);
            break;
        case 'score':
            updateScoreboard(metadata.homeScore, metadata.awayScore);
            break;
    }
});

function showPollOverlay(question, options) {
    // Render poll UI synchronized with the video
    const pollDiv = document.createElement('div');
    pollDiv.className = 'poll-overlay';
    pollDiv.innerHTML = `
        <h3>${question}</h3>
        ${options.map(opt => `<button onclick="votePoll('${opt}')">${opt}</button>`).join('')}
    `;
    document.getElementById('overlay-container').appendChild(pollDiv);
}
```

## Step 6: Set Up IVS Chat

IVS includes a built-in chat service:

```bash
# Create a chat room
aws ivschat create-room \
  --name "my-stream-chat" \
  --maximum-message-length 500 \
  --maximum-message-rate-per-second 10 \
  --tags Environment=production
```

Integrate chat in your web application:

```javascript
// Initialize IVS Chat
import { ChatRoom } from 'amazon-ivs-chat-messaging';

const chatRoom = new ChatRoom({
    regionOrUrl: 'us-east-1',
    tokenProvider: async () => {
        // Call your backend to get a chat token
        const response = await fetch('/api/chat-token', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                roomId: 'arn:aws:ivschat:us-east-1:123456789012:room/abc123',
                userId: currentUser.id,
                displayName: currentUser.name
            })
        });
        return response.json();
    }
});

// Connect to the chat room
chatRoom.connect();

// Listen for messages
chatRoom.addListener('message', (message) => {
    appendChatMessage(message.sender.displayName, message.content);
});

// Send a message
async function sendMessage(text) {
    await chatRoom.sendMessage({ content: text });
}
```

The backend token provider:

```python
# Backend endpoint to generate chat tokens
import boto3

ivschat = boto3.client('ivschat')

def generate_chat_token(room_arn, user_id, display_name, capabilities):
    """Generate a chat token for a user to join a room."""
    response = ivschat.create_chat_token(
        roomIdentifier=room_arn,
        userId=user_id,
        attributes={
            'displayName': display_name
        },
        capabilities=capabilities  # ['SEND_MESSAGE'] or ['SEND_MESSAGE', 'DELETE_MESSAGE', 'DISCONNECT_USER']
    )
    return {
        'token': response['token'],
        'sessionExpirationTime': response['sessionExpirationTime'].isoformat(),
        'tokenExpirationTime': response['tokenExpirationTime'].isoformat()
    }
```

## Step 7: Enable Recording

Record your live streams to S3 for later playback:

```bash
# Create a recording configuration
aws ivs create-recording-configuration \
  --name "stream-recordings" \
  --destination-configuration '{
    "s3": {
      "bucketName": "my-stream-recordings-123456789012"
    }
  }' \
  --thumbnail-configuration '{
    "recordingMode": "INTERVAL",
    "targetIntervalSeconds": 60,
    "storage": ["LATEST", "SEQUENTIAL"]
  }'

# Associate the recording config with a channel
aws ivs update-channel \
  --arn "arn:aws:ivs:us-east-1:123456789012:channel/abc123" \
  --recording-configuration-arn "arn:aws:ivs:us-east-1:123456789012:recording-configuration/def456"
```

Recorded streams are saved as HLS segments in S3, ready for on-demand playback.

## Monitoring Streams

```bash
# Check if a channel is currently live
aws ivs get-stream \
  --channel-arn "arn:aws:ivs:us-east-1:123456789012:channel/abc123"

# List all live streams
aws ivs list-streams

# Get stream metrics
aws cloudwatch get-metric-data \
  --metric-data-queries '[
    {
      "Id": "viewers",
      "MetricStat": {
        "Metric": {
          "Namespace": "AWS/IVS",
          "MetricName": "ConcurrentViews",
          "Dimensions": [
            {"Name": "Channel", "Value": "arn:aws:ivs:us-east-1:123456789012:channel/abc123"}
          ]
        },
        "Period": 60,
        "Stat": "Maximum"
      }
    }
  ]' \
  --start-time 2026-02-12T00:00:00Z \
  --end-time 2026-02-12T23:59:59Z
```

## IVS vs. MediaLive + MediaPackage

| Feature | IVS | MediaLive + MediaPackage |
|---------|-----|------------------------|
| Setup complexity | Minutes | Hours |
| Latency | 2-5 seconds | 10-30 seconds |
| Encoding control | Automatic | Full control |
| Built-in chat | Yes | No |
| Timed metadata | Yes | Limited |
| DRM support | Token-based | Full DRM |
| Cost | Per hour streamed | Per channel hour + packaging |
| Best for | Interactive streams | Broadcast-quality production |

## Best Practices

1. **Use LOW latency mode for interactive content.** The sub-3-second latency makes real-time interaction possible.

2. **Rotate stream keys regularly.** If a stream key is compromised, anyone can push content to your channel. Rotate keys after each event.

3. **Enable recording for all channels.** Even if you do not plan to offer VOD immediately, having the recordings available is valuable for content repurposing.

4. **Use timed metadata creatively.** Product showcases, live polls, quiz questions, and synchronized animations all become possible with timed metadata.

5. **Implement chat moderation.** Use the chat capabilities system to give moderators the ability to delete messages and disconnect users.

## Wrapping Up

AWS IVS dramatically lowers the barrier to building live streaming applications. What used to require a team of video engineers and weeks of integration work can now be set up in an afternoon. The combination of low-latency streaming, built-in chat, timed metadata, and player SDKs gives you everything you need for interactive live experiences. Start with a single channel and the web player, add chat and timed metadata for interactivity, and scale to as many viewers as you need without changing a single configuration.
