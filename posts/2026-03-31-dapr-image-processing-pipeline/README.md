# How to Build an Image Processing Pipeline with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Image Processing, Pipeline, Pub/Sub, Microservice

Description: Build an image processing pipeline with Dapr for resizing, format conversion, watermarking, CDN upload, and metadata extraction using chained pub/sub microservices.

---

## Image Processing Pipeline Design

Image processing involves multiple independent transformations that can be applied sequentially or in parallel. Dapr's pub/sub and workflow building blocks are ideal for orchestrating these steps with reliable delivery and retry support.

Pipeline stages:
1. **Upload** - Receive and validate image
2. **Analyze** - Extract metadata (dimensions, format, EXIF)
3. **Resize** - Generate multiple size variants
4. **Optimize** - Compress and convert format
5. **Watermark** - Apply branding (optional)
6. **Store** - Upload to CDN/object storage

## Upload and Validation Service

```python
# upload_service.py
from fastapi import FastAPI, UploadFile, File, HTTPException
from dapr.clients import DaprClient
import uuid, json, base64
from PIL import Image
import io

app = FastAPI()

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE_MB = 10

@app.post("/api/images/upload")
async def upload_image(file: UploadFile = File(...), user_id: str = ""):
    # Validate content type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"Unsupported image type: {file.content_type}")

    content = await file.read()

    if len(content) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(400, f"Image exceeds {MAX_SIZE_MB}MB limit")

    # Quick validation - can Pillow open it?
    try:
        img = Image.open(io.BytesIO(content))
        width, height = img.size
        img_format = img.format
    except Exception:
        raise HTTPException(400, "Invalid or corrupted image file")

    image_id = str(uuid.uuid4())

    with DaprClient() as client:
        client.save_state("statestore", f"image-raw-{image_id}", json.dumps({
            "imageId": image_id,
            "filename": file.filename,
            "contentType": file.content_type,
            "originalWidth": width,
            "originalHeight": height,
            "format": img_format,
            "sizeBytes": len(content),
            "data": base64.b64encode(content).decode('ascii'),
            "uploadedBy": user_id
        }))

        client.publish_event("pubsub", "image-uploaded", json.dumps({
            "imageId": image_id,
            "filename": file.filename,
            "contentType": file.content_type,
            "width": width, "height": height,
            "sizeBytes": len(content)
        }), data_content_type='application/json')

    return {"imageId": image_id, "status": "processing",
            "dimensions": f"{width}x{height}"}
```

## Resize Service

```go
// resize/main.go
package main

import (
    "bytes"
    "context"
    "encoding/base64"
    "encoding/json"
    "fmt"
    "image"
    "image/jpeg"
    _ "image/png"

    dapr "github.com/dapr/go-sdk/client"
    common "github.com/dapr/go-sdk/service/common"
    daprd "github.com/dapr/go-sdk/service/http"
    "golang.org/x/image/draw"
)

var sizeVariants = []struct{ Name string; Width, Height int }{
    {"thumbnail", 150, 150},
    {"small", 320, 240},
    {"medium", 800, 600},
    {"large", 1920, 1080},
}

func handleImageUploaded(ctx context.Context, e *common.TopicEvent) (bool, error) {
    var event map[string]interface{}
    json.Unmarshal(e.RawData, &event)
    imageID := event["imageId"].(string)

    client, _ := dapr.NewClient()
    defer client.Close()

    // Get raw image
    rawState, _ := client.GetState(ctx, "statestore", "image-raw-"+imageID, nil)
    var rawData map[string]interface{}
    json.Unmarshal(rawState.Value, &rawData)

    imageBytes, _ := base64.StdEncoding.DecodeString(rawData["data"].(string))

    completedVariants := []string{}

    for _, variant := range sizeVariants {
        resized, err := resizeImage(imageBytes, variant.Width, variant.Height)
        if err != nil {
            return true, fmt.Errorf("resize to %s failed: %w", variant.Name, err)
        }

        variantData := map[string]interface{}{
            "imageId":   imageID,
            "variant":   variant.Name,
            "width":     variant.Width,
            "height":    variant.Height,
            "data":      base64.StdEncoding.EncodeToString(resized),
        }
        variantJSON, _ := json.Marshal(variantData)
        client.SaveState(ctx, "statestore",
            fmt.Sprintf("image-%s-%s", imageID, variant.Name), variantJSON, nil)

        completedVariants = append(completedVariants, variant.Name)
    }

    client.PublishEvent(ctx, "pubsub", "image-resized", map[string]interface{}{
        "imageId":  imageID,
        "variants": completedVariants,
    })
    return false, nil
}
```

## Optimize and Convert Service

```javascript
// optimize-service.js
const sharp = require('sharp');
const { DaprServer, DaprClient } = require('@dapr/dapr');

const server = new DaprServer({ serverPort: '3001' });
const client = new DaprClient();

server.pubsub.subscribe('pubsub', 'image-resized', async (data) => {
  const { imageId, variants } = data;

  const optimizedVariants = [];

  for (const variant of variants) {
    const stateRaw = await client.state.get(
      'statestore', `image-${imageId}-${variant}`
    );
    const state = JSON.parse(stateRaw);
    const imgBuffer = Buffer.from(state.data, 'base64');

    // Convert to WebP for best compression
    const optimized = await sharp(imgBuffer)
      .webp({ quality: 82, effort: 4 })
      .toBuffer();

    await client.state.save('statestore', [{
      key: `image-webp-${imageId}-${variant}`,
      value: JSON.stringify({
        imageId, variant,
        format: 'webp',
        data: optimized.toString('base64'),
        originalSize: imgBuffer.length,
        optimizedSize: optimized.length,
        compressionRatio: (1 - optimized.length / imgBuffer.length).toFixed(2)
      })
    }]);
    optimizedVariants.push(variant);
  }

  await client.pubsub.publish('pubsub', 'image-optimized', {
    imageId, variants: optimizedVariants
  });
});

server.start();
```

## Summary

A Dapr image processing pipeline uses chained pub/sub events to pass images through upload validation, resizing, optimization, and storage stages. Each stage is an independent microservice that consumes its input event, processes the image data from Dapr state, stores its output, and publishes a completion event to trigger the next stage. The parallel resize variants are processed within the resize service, while Dapr's retry policies handle transient failures in image manipulation libraries.
