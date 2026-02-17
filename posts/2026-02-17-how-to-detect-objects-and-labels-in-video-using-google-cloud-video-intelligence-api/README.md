# How to Detect Objects and Labels in Video Using Google Cloud Video Intelligence API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Video Intelligence API, Object Detection, Machine Learning, Video Analysis

Description: Use Google Cloud Video Intelligence API to automatically detect objects and labels in video content with frame-level and segment-level annotations.

---

Manually tagging and categorizing video content does not scale. Whether you are managing a media library, building a content moderation system, or analyzing surveillance footage, the Video Intelligence API lets you automatically detect objects and classify scenes in your videos. It identifies everything from common objects like cars and people to more specific items like musical instruments or food, and it tells you exactly where and when each object appears.

This guide covers how to use the Video Intelligence API for both label detection (what is in the video) and object tracking (where things are moving across frames).

## What the API Can Detect

The Video Intelligence API provides several annotation features:

- **Label detection**: Identifies entities in the video (e.g., "dog," "beach," "running") at both the segment and frame level
- **Object tracking**: Detects and tracks specific objects across frames with bounding boxes
- **Shot change detection**: Identifies transitions between camera shots
- **Logo detection**: Recognizes brand logos
- **Person detection**: Detects people with pose estimation

In this post, I will focus on label detection and object tracking since those are the most commonly used features.

## Prerequisites

- GCP project with the Video Intelligence API enabled
- Source videos in Cloud Storage or accessible locally
- Python 3.8+

```bash
# Enable the API
gcloud services enable videointelligence.googleapis.com

# Install the client library
pip install google-cloud-videointelligence
```

## Step 1: Basic Label Detection

Label detection identifies what is happening in a video at two levels: shot-level (what happens in each scene) and frame-level (what is visible in individual frames).

```python
# label_detection.py - Detects labels in a video stored in Cloud Storage

from google.cloud import videointelligence_v1 as vi

def detect_labels(video_uri):
    """Analyzes a video and returns detected labels at both
    the shot/segment level and the frame level.

    Args:
        video_uri: GCS path to the video (gs://bucket/video.mp4)
    """

    client = vi.VideoIntelligenceServiceClient()

    # Configure the request for label detection
    features = [vi.Feature.LABEL_DETECTION]

    # Configure label detection settings
    config = vi.LabelDetectionConfig()
    config.label_detection_mode = vi.LabelDetectionMode.SHOT_AND_FRAME_MODE
    config.frame_confidence_threshold = 0.5  # Only return labels with 50%+ confidence
    config.stationary_camera = False  # Set True for fixed-camera footage

    video_context = vi.VideoContext()
    video_context.label_detection_config = config

    # Start the annotation operation (this runs asynchronously)
    print(f"Analyzing video: {video_uri}")
    operation = client.annotate_video(
        request={
            "features": features,
            "input_uri": video_uri,
            "video_context": video_context,
        }
    )

    # Wait for the operation to complete
    print("Waiting for analysis to complete...")
    result = operation.result(timeout=300)

    # Process the results
    annotation_result = result.annotation_results[0]

    # Print segment-level labels (what happens across the whole video or shots)
    print("\n--- Segment-Level Labels ---")
    for label in annotation_result.segment_label_annotations:
        print(f"\nLabel: {label.entity.description}")
        for category in label.category_entities:
            print(f"  Category: {category.description}")
        for segment in label.segments:
            start = segment.segment.start_time_offset.seconds
            end = segment.segment.end_time_offset.seconds
            confidence = segment.confidence
            print(f"  Segment: {start}s - {end}s (confidence: {confidence:.2f})")

    # Print frame-level labels (what is visible in specific frames)
    print("\n--- Frame-Level Labels ---")
    for label in annotation_result.frame_label_annotations:
        print(f"\nLabel: {label.entity.description}")
        # Show first 5 frames where this label was detected
        for frame in label.frames[:5]:
            time_offset = frame.time_offset.seconds + frame.time_offset.microseconds / 1e6
            print(f"  Frame at {time_offset:.2f}s (confidence: {frame.confidence:.2f})")

    return annotation_result

# Analyze a video
results = detect_labels("gs://your-bucket/your-video.mp4")
```

## Step 2: Object Tracking

Object tracking goes beyond labels by providing bounding box coordinates for each detected object across frames:

```python
# object_tracking.py - Tracks objects with bounding boxes across video frames

from google.cloud import videointelligence_v1 as vi

def track_objects(video_uri):
    """Tracks objects in a video, providing bounding box coordinates
    for each detected object across frames.

    Returns object tracks with frame-by-frame position data."""

    client = vi.VideoIntelligenceServiceClient()

    features = [vi.Feature.OBJECT_TRACKING]

    # Configure object tracking
    config = vi.ObjectTrackingConfig()
    config.max_bounding_box_count = 10  # Maximum objects to track per frame

    video_context = vi.VideoContext()
    video_context.object_tracking_config = config

    print(f"Tracking objects in: {video_uri}")
    operation = client.annotate_video(
        request={
            "features": features,
            "input_uri": video_uri,
            "video_context": video_context,
        }
    )

    result = operation.result(timeout=600)
    annotation_result = result.annotation_results[0]

    print(f"\nFound {len(annotation_result.object_annotations)} object tracks")

    for obj in annotation_result.object_annotations:
        description = obj.entity.description
        confidence = obj.confidence
        track_id = obj.track_id

        # Time range where this object was tracked
        start = obj.segment.start_time_offset.seconds
        end = obj.segment.end_time_offset.seconds

        print(f"\nObject: {description} (track #{track_id})")
        print(f"  Confidence: {confidence:.2f}")
        print(f"  Tracked from {start}s to {end}s")
        print(f"  Total frames: {len(obj.frames)}")

        # Show bounding box for the first few frames
        for frame in obj.frames[:3]:
            box = frame.normalized_bounding_box
            time_offset = frame.time_offset.seconds + frame.time_offset.microseconds / 1e6
            print(f"  Frame {time_offset:.2f}s: "
                  f"box=({box.left:.3f}, {box.top:.3f}) - "
                  f"({box.right:.3f}, {box.bottom:.3f})")

    return annotation_result

results = track_objects("gs://your-bucket/your-video.mp4")
```

## Step 3: Analyze Local Video Files

You can also analyze videos stored locally by sending the file content directly:

```python
def detect_labels_local(video_path):
    """Analyzes a local video file for labels.
    Reads the file and sends it directly to the API."""

    client = vi.VideoIntelligenceServiceClient()

    # Read the video file content
    with open(video_path, "rb") as f:
        input_content = f.read()

    print(f"Analyzing local video: {video_path}")
    print(f"File size: {len(input_content) / 1024 / 1024:.1f} MB")

    operation = client.annotate_video(
        request={
            "features": [vi.Feature.LABEL_DETECTION],
            "input_content": input_content,
        }
    )

    result = operation.result(timeout=300)
    return result.annotation_results[0]
```

## Step 4: Combine Multiple Features

You can request multiple annotation types in a single API call:

```python
def full_video_analysis(video_uri):
    """Runs a comprehensive analysis combining label detection,
    object tracking, and shot detection in a single API call."""

    client = vi.VideoIntelligenceServiceClient()

    # Request multiple features at once
    features = [
        vi.Feature.LABEL_DETECTION,
        vi.Feature.OBJECT_TRACKING,
        vi.Feature.SHOT_CHANGE_DETECTION,
    ]

    operation = client.annotate_video(
        request={
            "features": features,
            "input_uri": video_uri,
        }
    )

    result = operation.result(timeout=600)
    annotation = result.annotation_results[0]

    # Build a summary of the video
    summary = {
        "segment_labels": [],
        "objects_tracked": [],
        "shots": [],
    }

    # Collect top labels
    for label in annotation.segment_label_annotations:
        max_confidence = max(s.confidence for s in label.segments)
        summary["segment_labels"].append({
            "label": label.entity.description,
            "confidence": round(max_confidence, 3),
        })

    # Sort by confidence and take top 20
    summary["segment_labels"].sort(key=lambda x: x["confidence"], reverse=True)
    summary["segment_labels"] = summary["segment_labels"][:20]

    # Collect tracked objects
    for obj in annotation.object_annotations:
        summary["objects_tracked"].append({
            "object": obj.entity.description,
            "confidence": round(obj.confidence, 3),
            "duration_seconds": (
                obj.segment.end_time_offset.seconds -
                obj.segment.start_time_offset.seconds
            ),
        })

    # Collect shot boundaries
    for shot in annotation.shot_annotations:
        summary["shots"].append({
            "start": shot.start_time_offset.seconds,
            "end": shot.end_time_offset.seconds,
        })

    return summary

# Run full analysis
summary = full_video_analysis("gs://your-bucket/your-video.mp4")
print(f"\nVideo has {len(summary['shots'])} shots")
print(f"Top labels: {[l['label'] for l in summary['segment_labels'][:10]]}")
print(f"Objects tracked: {len(summary['objects_tracked'])}")
```

## Step 5: Process Results for a Searchable Index

If you are building a video search system, store the annotation results in BigQuery:

```python
from google.cloud import bigquery
from datetime import datetime

def index_video_labels(video_id, video_uri, annotation_result):
    """Stores video label annotations in BigQuery for search.
    Creates one row per label per segment for granular querying."""

    bq_client = bigquery.Client()
    table_id = "your-project.video_index.labels"

    rows = []
    for label in annotation_result.segment_label_annotations:
        for segment in label.segments:
            rows.append({
                "video_id": video_id,
                "video_uri": video_uri,
                "label": label.entity.description,
                "categories": [c.description for c in label.category_entities],
                "confidence": float(segment.confidence),
                "start_seconds": segment.segment.start_time_offset.seconds,
                "end_seconds": segment.segment.end_time_offset.seconds,
                "indexed_at": datetime.utcnow().isoformat(),
            })

    errors = bq_client.insert_rows_json(table_id, rows)
    if errors:
        print(f"Errors inserting rows: {errors}")
    else:
        print(f"Indexed {len(rows)} label annotations for video {video_id}")
```

## Cost and Performance Tips

- Label detection takes roughly 50% of the video duration to process
- Object tracking takes longer, especially for dense scenes
- Requesting multiple features in one call is cheaper than separate calls
- Use `segments` in the video context to analyze only portions of a video
- Frame-level labels generate much more data than segment-level, so disable them if you do not need that granularity

## Wrapping Up

The Video Intelligence API turns unstructured video into structured, searchable metadata. Label detection tells you what is in the video, object tracking tells you where things are, and shot detection gives you the editorial structure. Combined with BigQuery for indexing and search, you can build a video catalog that lets users find specific moments across thousands of hours of content based on what appears in the video rather than relying on manual tags.
