# How to Extract Text and OCR from Video Frames with Video Intelligence API Text Detection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Video Intelligence API, OCR, Text Detection, Video Analysis

Description: Extract and track text appearing in video frames using Google Cloud Video Intelligence API text detection for indexing and content analysis.

---

Text in videos carries a lot of information - news tickers, street signs, presentation slides, product labels, license plates, and subtitles all contain searchable content that standard label detection cannot capture. The Video Intelligence API's text detection feature performs OCR on video frames, extracts the text content, and tracks it across frames with bounding box coordinates.

This guide walks through using text detection to extract text from videos, track text elements as they move, and build practical applications around the extracted content.

## What Text Detection Provides

The API returns three types of information for each detected text:

1. **The text content** - the actual characters recognized by OCR
2. **Bounding box coordinates** - where the text appears in each frame (normalized coordinates from 0 to 1)
3. **Temporal tracking** - which frames the text appears in and how its position changes

This means you can extract text from a news broadcast and know exactly when each headline appeared and how long it was on screen.

## Prerequisites

- GCP project with Video Intelligence API enabled
- Python 3.8+
- Video files in Cloud Storage

```bash
gcloud services enable videointelligence.googleapis.com
pip install google-cloud-videointelligence
```

## Step 1: Basic Text Detection

```python
# text_detection.py - Extracts text from video frames

from google.cloud import videointelligence_v1 as vi

def detect_text(video_uri):
    """Detects and extracts all text appearing in a video.
    Returns text content with frame positions and timestamps.

    Args:
        video_uri: GCS path to the video file
    """

    client = vi.VideoIntelligenceServiceClient()

    features = [vi.Feature.TEXT_DETECTION]

    # Configure text detection for better accuracy
    text_config = vi.TextDetectionConfig()
    # Language hints help the OCR engine with specific scripts
    text_config.language_hints = ["en"]

    video_context = vi.VideoContext()
    video_context.text_detection_config = text_config

    print(f"Detecting text in: {video_uri}")
    operation = client.annotate_video(
        request={
            "features": features,
            "input_uri": video_uri,
            "video_context": video_context,
        }
    )

    print("Processing... (this may take several minutes)")
    result = operation.result(timeout=600)
    annotation = result.annotation_results[0]

    # Process each detected text element
    print(f"\nFound {len(annotation.text_annotations)} text elements\n")

    for text_annotation in annotation.text_annotations:
        # The full text that was recognized
        text = text_annotation.text
        print(f'Text: "{text}"')

        # Each text annotation has multiple segments (time ranges where it appears)
        for segment in text_annotation.segments:
            start = segment.segment.start_time_offset
            end = segment.segment.end_time_offset
            start_sec = start.seconds + start.microseconds / 1e6
            end_sec = end.seconds + end.microseconds / 1e6
            confidence = segment.confidence

            print(f"  Visible: {start_sec:.2f}s - {end_sec:.2f}s "
                  f"(confidence: {confidence:.2f})")

            # Show the bounding box for the first frame of this segment
            if segment.frames:
                first_frame = segment.frames[0]
                vertices = first_frame.rotated_bounding_box.vertices
                print(f"  Position (first frame):")
                for i, vertex in enumerate(vertices):
                    print(f"    Corner {i}: ({vertex.x:.3f}, {vertex.y:.3f})")

        print()

    return annotation

results = detect_text("gs://your-bucket/video-with-text.mp4")
```

## Step 2: Track Text Movement Across Frames

For moving text (like scrolling tickers or text on moving objects), you can track position changes:

```python
def track_text_movement(video_uri):
    """Tracks how text elements move across video frames.
    Useful for scrolling text, captions, or text on moving objects."""

    client = vi.VideoIntelligenceServiceClient()

    operation = client.annotate_video(
        request={
            "features": [vi.Feature.TEXT_DETECTION],
            "input_uri": video_uri,
        }
    )

    result = operation.result(timeout=600)
    annotation = result.annotation_results[0]

    text_tracks = []

    for text_ann in annotation.text_annotations:
        for segment in text_ann.segments:
            track = {
                "text": text_ann.text,
                "confidence": segment.confidence,
                "frames": [],
            }

            # Record position in each frame
            for frame in segment.frames:
                time_sec = (
                    frame.time_offset.seconds +
                    frame.time_offset.microseconds / 1e6
                )
                vertices = frame.rotated_bounding_box.vertices

                # Calculate center point of the bounding box
                center_x = sum(v.x for v in vertices) / 4
                center_y = sum(v.y for v in vertices) / 4

                # Calculate approximate width and height
                width = abs(vertices[1].x - vertices[0].x)
                height = abs(vertices[2].y - vertices[1].y)

                track["frames"].append({
                    "time": time_sec,
                    "center": (center_x, center_y),
                    "size": (width, height),
                })

            # Determine if the text is stationary or moving
            if len(track["frames"]) >= 2:
                first = track["frames"][0]["center"]
                last = track["frames"][-1]["center"]
                movement = ((last[0] - first[0])**2 + (last[1] - first[1])**2)**0.5
                track["is_moving"] = movement > 0.05  # 5% of frame = moving
                track["total_movement"] = movement
            else:
                track["is_moving"] = False
                track["total_movement"] = 0

            text_tracks.append(track)

    # Report results
    stationary = [t for t in text_tracks if not t["is_moving"]]
    moving = [t for t in text_tracks if t["is_moving"]]

    print(f"Stationary text elements: {len(stationary)}")
    for t in stationary:
        print(f'  "{t["text"]}" ({len(t["frames"])} frames)')

    print(f"\nMoving text elements: {len(moving)}")
    for t in moving:
        print(f'  "{t["text"]}" (moved {t["total_movement"]:.3f} units)')

    return text_tracks
```

## Step 3: Extract Text for Indexing

Build a function that extracts all unique text from a video for search indexing:

```python
import json
from google.cloud import bigquery
from datetime import datetime

def extract_text_for_index(video_uri, video_id):
    """Extracts all text from a video and creates a searchable index.
    Deduplicates text and records time ranges."""

    client = vi.VideoIntelligenceServiceClient()

    operation = client.annotate_video(
        request={
            "features": [vi.Feature.TEXT_DETECTION],
            "input_uri": video_uri,
            "video_context": vi.VideoContext(
                text_detection_config=vi.TextDetectionConfig(
                    language_hints=["en"],
                )
            ),
        }
    )

    result = operation.result(timeout=600)
    annotation = result.annotation_results[0]

    # Build a text index with timestamps
    text_index = {}
    for text_ann in annotation.text_annotations:
        text = text_ann.text.strip()
        if len(text) < 2:  # Skip single characters
            continue

        if text not in text_index:
            text_index[text] = {
                "text": text,
                "appearances": [],
                "total_duration_seconds": 0,
                "max_confidence": 0,
            }

        for segment in text_ann.segments:
            start_sec = segment.segment.start_time_offset.seconds
            end_sec = segment.segment.end_time_offset.seconds
            duration = end_sec - start_sec

            text_index[text]["appearances"].append({
                "start_seconds": start_sec,
                "end_seconds": end_sec,
            })
            text_index[text]["total_duration_seconds"] += duration
            text_index[text]["max_confidence"] = max(
                text_index[text]["max_confidence"],
                segment.confidence,
            )

    # Store in BigQuery for search
    bq_client = bigquery.Client()
    table_id = "your-project.video_index.text_content"

    rows = []
    for text, info in text_index.items():
        rows.append({
            "video_id": video_id,
            "video_uri": video_uri,
            "text_content": info["text"],
            "appearance_count": len(info["appearances"]),
            "total_visible_seconds": info["total_duration_seconds"],
            "max_confidence": info["max_confidence"],
            "first_appearance_seconds": info["appearances"][0]["start_seconds"],
            "appearances_json": json.dumps(info["appearances"]),
            "indexed_at": datetime.utcnow().isoformat(),
        })

    if rows:
        errors = bq_client.insert_rows_json(table_id, rows)
        if errors:
            print(f"BigQuery errors: {errors}")
        else:
            print(f"Indexed {len(rows)} unique text elements from {video_id}")

    return text_index
```

## Step 4: Process a Specific Video Segment

For long videos, you might only need text from a specific section:

```python
def detect_text_in_segment(video_uri, start_seconds, end_seconds):
    """Detects text only within a specified time range of the video.
    This saves processing time and cost for long videos."""

    client = vi.VideoIntelligenceServiceClient()

    # Define the segment to analyze
    segment = vi.VideoSegment()
    segment.start_time_offset = {"seconds": start_seconds}
    segment.end_time_offset = {"seconds": end_seconds}

    video_context = vi.VideoContext()
    video_context.segments = [segment]
    video_context.text_detection_config = vi.TextDetectionConfig(
        language_hints=["en"],
    )

    operation = client.annotate_video(
        request={
            "features": [vi.Feature.TEXT_DETECTION],
            "input_uri": video_uri,
            "video_context": video_context,
        }
    )

    result = operation.result(timeout=300)
    annotation = result.annotation_results[0]

    texts = []
    for text_ann in annotation.text_annotations:
        texts.append(text_ann.text)

    print(f"Found {len(texts)} text elements between {start_seconds}s and {end_seconds}s:")
    for t in texts:
        print(f'  "{t}"')

    return texts

# Extract text from a 30-second segment
texts = detect_text_in_segment(
    "gs://your-bucket/long-video.mp4",
    start_seconds=60,
    end_seconds=90,
)
```

## Step 5: Batch Processing Multiple Videos

For processing a library of videos, use an async approach:

```python
from concurrent.futures import ThreadPoolExecutor, as_completed

def batch_text_detection(video_uris, max_concurrent=5):
    """Processes multiple videos in parallel for text detection.
    Respects API quotas by limiting concurrent requests."""

    client = vi.VideoIntelligenceServiceClient()
    operations = {}

    # Submit all jobs
    for uri in video_uris:
        operation = client.annotate_video(
            request={
                "features": [vi.Feature.TEXT_DETECTION],
                "input_uri": uri,
            }
        )
        operations[uri] = operation
        print(f"Submitted: {uri}")

    # Collect results
    results = {}
    for uri, operation in operations.items():
        try:
            result = operation.result(timeout=600)
            annotation = result.annotation_results[0]
            text_count = len(annotation.text_annotations)
            results[uri] = annotation
            print(f"Completed: {uri} ({text_count} text elements)")
        except Exception as e:
            print(f"Failed: {uri} - {e}")
            results[uri] = None

    return results
```

## Use Cases

- **News archive search**: Index text from news broadcasts (headlines, lower thirds, stock tickers) to make historical news searchable
- **License plate recognition**: Extract plate numbers from traffic camera footage
- **Presentation indexing**: OCR text from slide deck recordings for meeting search
- **Accessibility**: Generate text descriptions of on-screen text for accessibility compliance
- **Content compliance**: Detect regulated content like disclaimers, age ratings, or required disclosures in video ads

## Wrapping Up

Text detection in the Video Intelligence API opens up a whole category of video analysis that visual labels cannot cover. The ability to OCR text, track it across frames, and index it for search makes video content as searchable as documents. For media companies, this means your entire video library becomes searchable by the text that appears on screen, not just by manually assigned tags.
