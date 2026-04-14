# How to Build a Video Processing Pipeline with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Video, Pipeline, Pub/Sub, Media Processing

Description: Design a video processing pipeline with Dapr for upload, transcoding, thumbnail generation, and CDN distribution using event-driven microservices and workflow orchestration.

---

## Video Pipeline Architecture

Video processing is a classic example of a long-running, resource-intensive pipeline where each stage can scale independently. With Dapr, the pipeline stages communicate via pub/sub, enabling parallel processing (multiple resolutions simultaneously) and resilient retry behavior.

```text
Upload Service --> [video-uploaded]
    |
    +--> Transcoding Service (360p, 720p, 1080p) [parallel]
    +--> Thumbnail Service [parallel]
    |
    +--> [transcoding-complete] --> Packaging Service (HLS/DASH)
    |
    +--> [packaging-complete] --> CDN Distribution Service
    |
    +--> [cdn-ready] --> Notification Service
```

## Upload and Job Initialization

```python
# upload_service.py
from fastapi import FastAPI, UploadFile, File
from dapr.clients import DaprClient
import uuid, json, base64

app = FastAPI()

QUALITY_PROFILES = [
    {"name": "360p",  "width": 640,  "height": 360,  "bitrate": "800k"},
    {"name": "720p",  "width": 1280, "height": 720,  "bitrate": "2500k"},
    {"name": "1080p", "width": 1920, "height": 1080, "bitrate": "5000k"},
]

@app.post("/api/videos/upload")
async def upload_video(
    file: UploadFile = File(...),
    title: str = "",
    user_id: str = ""
):
    video_id = str(uuid.uuid4())
    content = await file.read()

    with DaprClient() as client:
        # Store original video in state
        client.save_state("statestore", f"video-raw-{video_id}", json.dumps({
            "videoId": video_id,
            "filename": file.filename,
            "title": title,
            "contentType": file.content_type,
            "sizeBytes": len(content),
            "content": base64.b64encode(content).decode('ascii')
        }))

        # Initialize pipeline job
        client.save_state("statestore", f"video-job-{video_id}", json.dumps({
            "videoId": video_id,
            "title": title,
            "uploadedBy": user_id,
            "status": "uploaded",
            "qualityProfiles": QUALITY_PROFILES,
            "completedProfiles": [],
            "thumbnailGenerated": False,
            "packaged": False,
            "cdnDistributed": False
        }))

        # Trigger pipeline start
        client.publish_event("pubsub", "video-uploaded", json.dumps({
            "videoId": video_id,
            "filename": file.filename,
            "title": title,
            "sizeBytes": len(content),
            "qualityProfiles": QUALITY_PROFILES
        }), data_content_type="application/json")

    return {"videoId": video_id, "status": "processing"}
```

## Transcoding Service (Parallel Per Quality)

```go
// transcoding/main.go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "log"
    "os/exec"

    dapr "github.com/dapr/go-sdk/client"
    "github.com/dapr/go-sdk/service/common"
)

type TranscodeEvent struct {
    VideoID  string `json:"videoId"`
    Quality  string `json:"quality"`
    Width    int    `json:"width"`
    Height   int    `json:"height"`
    Bitrate  string `json:"bitrate"`
}

func handleVideoUploaded(ctx context.Context, e *common.TopicEvent) (bool, error) {
    var event map[string]interface{}
    json.Unmarshal(e.RawData, &event)

    videoID := event["videoId"].(string)
    profiles := event["qualityProfiles"].([]interface{})

    client, _ := dapr.NewClient()
    defer client.Close()

    // Publish a transcode job for each quality profile in parallel
    for _, p := range profiles {
        profile := p.(map[string]interface{})
        client.PublishEvent(ctx, "pubsub", "transcode-job-queued", TranscodeEvent{
            VideoID: videoID,
            Quality: profile["name"].(string),
            Width:   int(profile["width"].(float64)),
            Height:  int(profile["height"].(float64)),
            Bitrate: profile["bitrate"].(string),
        })
    }

    return false, nil
}

func handleTranscodeJob(ctx context.Context, e *common.TopicEvent) (bool, error) {
    var job TranscodeEvent
    json.Unmarshal(e.RawData, &job)

    log.Printf("Transcoding videoId=%s quality=%s", job.VideoID, job.Quality)

    // FFmpeg transcode
    outputPath := fmt.Sprintf("/tmp/%s_%s.mp4", job.VideoID, job.Quality)
    cmd := exec.CommandContext(ctx, "ffmpeg",
        "-i", fmt.Sprintf("/tmp/raw_%s.mp4", job.VideoID),
        "-vf", fmt.Sprintf("scale=%d:%d", job.Width, job.Height),
        "-b:v", job.Bitrate,
        "-c:v", "libx264",
        "-preset", "fast",
        outputPath,
    )

    if err := cmd.Run(); err != nil {
        log.Printf("Transcode failed: %v", err)
        return true, err // retry
    }

    // Notify completion
    client, _ := dapr.NewClient()
    client.PublishEvent(ctx, "pubsub", "transcode-completed", map[string]interface{}{
        "videoId": job.VideoID,
        "quality": job.Quality,
        "path":    outputPath,
    })
    client.Close()

    return false, nil
}
```

## Thumbnail Generation Service

```javascript
// thumbnail-service.js
const { DaprServer, DaprClient } = require('@dapr/dapr');
const sharp = require('sharp');

const server = new DaprServer({ serverPort: '3001' });
const client = new DaprClient();

server.pubsub.subscribe('pubsub', 'video-uploaded', async (data) => {
  const { videoId, filename } = data;

  // Extract frame at 5 seconds using FFmpeg
  const framePath = `/tmp/frame_${videoId}.jpg`;
  // ...FFmpeg extract frame command...

  // Generate multiple thumbnail sizes
  const thumbnails = await Promise.all([
    sharp(framePath).resize(320, 180).toBuffer(),
    sharp(framePath).resize(640, 360).toBuffer(),
    sharp(framePath).resize(1280, 720).toBuffer(),
  ]);

  // Store thumbnails in state
  for (const [i, thumb] of thumbnails.entries()) {
    await client.state.save('statestore', [
      { key: `thumb-${videoId}-${i}`,
        value: Buffer.from(thumb).toString('base64') }
    ]);
  }

  await client.pubsub.publish('pubsub', 'thumbnails-generated', {
    videoId,
    thumbnailCount: thumbnails.length
  });
});

server.start();
```

## Summary

A Dapr video processing pipeline uses pub/sub fan-out to launch parallel transcoding jobs for multiple quality profiles simultaneously. Each quality transcode runs in a separate service instance, enabling true parallelism without shared state. The pipeline tracks progress through Dapr state management, and completion events chain stages from transcoding to packaging and CDN distribution. Dapr's retry policies handle transient FFmpeg failures automatically.
