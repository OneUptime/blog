# How to Detect Explicit Content in Uploaded Videos Using Video Intelligence API SafeSearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Video Intelligence API, Content Moderation, SafeSearch, Video Analysis

Description: Automatically detect explicit and inappropriate content in uploaded videos using Google Cloud Video Intelligence API SafeSearch detection.

---

If your platform accepts user-uploaded videos, content moderation is not optional. Manual review does not scale, and missing explicit content creates legal and brand risks. The Video Intelligence API's SafeSearch detection feature analyzes video frames and flags content across five categories: adult, spoof, medical, violence, and racy. You can use these signals to automatically quarantine, flag, or reject problematic uploads.

In this guide, I will build an automated content moderation pipeline that screens every uploaded video and takes action based on the detection results.

## What SafeSearch Detects

The API evaluates each frame against five categories:

- **Adult**: Explicit sexual content
- **Spoof**: Parody or comic content
- **Medical**: Medical or surgical content
- **Violence**: Violent or graphic content
- **Racy**: Suggestive or provocative content (not explicit, but borderline)

Each category returns a likelihood level: UNKNOWN, VERY_UNLIKELY, UNLIKELY, POSSIBLE, LIKELY, or VERY_LIKELY.

## Prerequisites

- GCP project with Video Intelligence API enabled
- Cloud Storage bucket for uploaded videos
- Python 3.8+

```bash
gcloud services enable videointelligence.googleapis.com
pip install google-cloud-videointelligence google-cloud-storage google-cloud-firestore
```

## Step 1: Basic SafeSearch Detection

```python
# safesearch.py - Detects explicit content in a video

from google.cloud import videointelligence_v1 as vi

def detect_explicit_content(video_uri):
    """Analyzes a video for explicit content across all SafeSearch categories.
    Returns frame-level annotations with likelihood ratings.

    Args:
        video_uri: GCS path to the video (gs://bucket/video.mp4)
    """

    client = vi.VideoIntelligenceServiceClient()

    features = [vi.Feature.EXPLICIT_CONTENT_DETECTION]

    print(f"Analyzing video for explicit content: {video_uri}")
    operation = client.annotate_video(
        request={
            "features": features,
            "input_uri": video_uri,
        }
    )

    result = operation.result(timeout=300)
    annotation = result.annotation_results[0]

    # Process frame-level annotations
    explicit_annotation = annotation.explicit_annotation

    # Map likelihood values to readable strings
    likelihood_name = {
        0: "UNKNOWN",
        1: "VERY_UNLIKELY",
        2: "UNLIKELY",
        3: "POSSIBLE",
        4: "LIKELY",
        5: "VERY_LIKELY",
    }

    flagged_frames = []

    for frame in explicit_annotation.frames:
        time_sec = frame.time_offset.seconds + frame.time_offset.microseconds / 1e6
        pornography = frame.pornography_likelihood

        # Flag frames where explicit content is POSSIBLE or higher
        if pornography >= vi.Likelihood.POSSIBLE:
            flagged_frames.append({
                "time_seconds": time_sec,
                "pornography": likelihood_name.get(pornography, "UNKNOWN"),
            })

    if flagged_frames:
        print(f"Found {len(flagged_frames)} potentially explicit frames:")
        for frame in flagged_frames[:10]:  # Show first 10
            print(f"  {frame['time_seconds']:.2f}s - {frame['pornography']}")
    else:
        print("No explicit content detected")

    return explicit_annotation, flagged_frames

results, flags = detect_explicit_content("gs://your-bucket/uploaded-video.mp4")
```

## Step 2: Build a Comprehensive Content Scoring System

A single frame detection is not enough. You need to look at the overall pattern to make moderation decisions:

```python
from google.cloud import videointelligence_v1 as vi
from collections import Counter

# Define severity levels for moderation decisions
SEVERITY_THRESHOLDS = {
    "adult": {
        vi.Likelihood.VERY_LIKELY: "block",
        vi.Likelihood.LIKELY: "review",
        vi.Likelihood.POSSIBLE: "flag",
    },
    "violence": {
        vi.Likelihood.VERY_LIKELY: "block",
        vi.Likelihood.LIKELY: "review",
        vi.Likelihood.POSSIBLE: "flag",
    },
}

def score_video_content(video_uri):
    """Performs a comprehensive content analysis and returns a moderation score.
    The score considers both the severity and frequency of flagged frames."""

    client = vi.VideoIntelligenceServiceClient()

    operation = client.annotate_video(
        request={
            "features": [vi.Feature.EXPLICIT_CONTENT_DETECTION],
            "input_uri": video_uri,
        }
    )

    result = operation.result(timeout=600)
    annotation = result.annotation_results[0].explicit_annotation

    total_frames = len(annotation.frames)
    if total_frames == 0:
        return {"decision": "approve", "reason": "No frames analyzed"}

    # Count frames by likelihood level
    adult_counts = Counter()

    max_adult = vi.Likelihood.VERY_UNLIKELY

    for frame in annotation.frames:
        adult_counts[frame.pornography_likelihood] += 1
        if frame.pornography_likelihood > max_adult:
            max_adult = frame.pornography_likelihood

    # Calculate the percentage of flagged frames
    flagged_count = sum(
        count for likelihood, count in adult_counts.items()
        if likelihood >= vi.Likelihood.POSSIBLE
    )
    flagged_percentage = (flagged_count / total_frames) * 100

    # Make a moderation decision
    decision = "approve"
    reasons = []

    if max_adult >= vi.Likelihood.VERY_LIKELY:
        decision = "block"
        reasons.append(f"Very likely adult content detected")
    elif max_adult >= vi.Likelihood.LIKELY and flagged_percentage > 5:
        decision = "block"
        reasons.append(f"Likely adult content in {flagged_percentage:.1f}% of frames")
    elif max_adult >= vi.Likelihood.LIKELY:
        decision = "review"
        reasons.append(f"Likely adult content detected in some frames")
    elif max_adult >= vi.Likelihood.POSSIBLE and flagged_percentage > 20:
        decision = "review"
        reasons.append(f"Possible adult content in {flagged_percentage:.1f}% of frames")

    score = {
        "decision": decision,
        "reasons": reasons,
        "total_frames_analyzed": total_frames,
        "flagged_frames": flagged_count,
        "flagged_percentage": round(flagged_percentage, 2),
        "max_adult_likelihood": max_adult,
        "frame_breakdown": {
            "very_unlikely": adult_counts.get(vi.Likelihood.VERY_UNLIKELY, 0),
            "unlikely": adult_counts.get(vi.Likelihood.UNLIKELY, 0),
            "possible": adult_counts.get(vi.Likelihood.POSSIBLE, 0),
            "likely": adult_counts.get(vi.Likelihood.LIKELY, 0),
            "very_likely": adult_counts.get(vi.Likelihood.VERY_LIKELY, 0),
        },
    }

    return score
```

## Step 3: Automated Moderation Pipeline

Set up an event-driven pipeline that automatically screens uploaded videos:

```python
# moderation_pipeline/main.py - Cloud Function for automatic video moderation

import json
import base64
from google.cloud import videointelligence_v1 as vi
from google.cloud import firestore, storage, pubsub_v1
from collections import Counter
import functions_framework

db = firestore.Client()
storage_client = storage.Client()
publisher = pubsub_v1.PublisherClient()
PROJECT_ID = "your-project-id"

@functions_framework.cloud_event
def moderate_video(cloud_event):
    """Triggered when a new video is uploaded to the upload bucket.
    Runs SafeSearch detection and takes moderation action."""

    data = cloud_event.data
    bucket = data["bucket"]
    name = data["name"]

    # Only process video files
    video_extensions = (".mp4", ".mov", ".avi", ".mkv", ".webm")
    if not name.lower().endswith(video_extensions):
        return

    video_uri = f"gs://{bucket}/{name}"
    video_id = name.rsplit(".", 1)[0].replace("/", "_")

    print(f"Moderating video: {video_uri}")

    # Update status in Firestore
    doc_ref = db.collection("video_moderation").document(video_id)
    doc_ref.set({
        "video_uri": video_uri,
        "status": "analyzing",
        "uploaded_at": firestore.SERVER_TIMESTAMP,
    })

    # Run SafeSearch detection
    client = vi.VideoIntelligenceServiceClient()
    operation = client.annotate_video(
        request={
            "features": [vi.Feature.EXPLICIT_CONTENT_DETECTION],
            "input_uri": video_uri,
        }
    )

    result = operation.result(timeout=600)
    annotation = result.annotation_results[0].explicit_annotation

    # Score the video
    total_frames = len(annotation.frames)
    flagged_frames = 0
    max_likelihood = 0

    for frame in annotation.frames:
        if frame.pornography_likelihood >= vi.Likelihood.POSSIBLE:
            flagged_frames += 1
        if frame.pornography_likelihood > max_likelihood:
            max_likelihood = frame.pornography_likelihood

    flagged_pct = (flagged_frames / total_frames * 100) if total_frames > 0 else 0

    # Determine action
    if max_likelihood >= vi.Likelihood.VERY_LIKELY:
        action = "blocked"
    elif max_likelihood >= vi.Likelihood.LIKELY and flagged_pct > 5:
        action = "blocked"
    elif max_likelihood >= vi.Likelihood.LIKELY:
        action = "needs_review"
    elif flagged_pct > 20:
        action = "needs_review"
    else:
        action = "approved"

    # Update Firestore with the result
    doc_ref.update({
        "status": action,
        "analysis": {
            "total_frames": total_frames,
            "flagged_frames": flagged_frames,
            "flagged_percentage": round(flagged_pct, 2),
            "max_likelihood": max_likelihood,
        },
        "analyzed_at": firestore.SERVER_TIMESTAMP,
    })

    # Take action based on the result
    if action == "blocked":
        # Move to quarantine bucket
        source_bucket = storage_client.bucket(bucket)
        quarantine_bucket = storage_client.bucket("your-quarantine-bucket")
        source_blob = source_bucket.blob(name)
        source_bucket.copy_blob(source_blob, quarantine_bucket, name)
        source_blob.delete()
        print(f"Video blocked and quarantined: {name}")

    elif action == "approved":
        # Move to the approved/public bucket
        source_bucket = storage_client.bucket(bucket)
        public_bucket = storage_client.bucket("your-public-bucket")
        source_blob = source_bucket.blob(name)
        source_bucket.copy_blob(source_blob, public_bucket, name)
        source_blob.delete()
        print(f"Video approved: {name}")

    elif action == "needs_review":
        # Notify the moderation team
        topic_path = publisher.topic_path(PROJECT_ID, "moderation-reviews")
        publisher.publish(
            topic_path,
            data=json.dumps({
                "video_id": video_id,
                "video_uri": video_uri,
                "flagged_percentage": flagged_pct,
                "max_likelihood": max_likelihood,
            }).encode("utf-8"),
        )
        print(f"Video flagged for review: {name}")
```

Deploy the pipeline:

```bash
# Create the upload notification topic
gsutil notification create -t video-uploads -f json \
  -e OBJECT_FINALIZE gs://your-upload-bucket

# Deploy the moderation function
gcloud functions deploy moderate-video \
  --gen2 \
  --runtime=python311 \
  --trigger-topic=video-uploads \
  --region=us-central1 \
  --memory=512MB \
  --timeout=540s \
  --entry-point=moderate_video
```

## Step 4: Build a Moderation Dashboard Query

Query the moderation results in Firestore for a dashboard:

```python
def get_moderation_stats():
    """Retrieves moderation statistics for the dashboard."""

    approved = len(list(db.collection("video_moderation")
        .where("status", "==", "approved").stream()))
    blocked = len(list(db.collection("video_moderation")
        .where("status", "==", "blocked").stream()))
    reviewing = len(list(db.collection("video_moderation")
        .where("status", "==", "needs_review").stream()))
    analyzing = len(list(db.collection("video_moderation")
        .where("status", "==", "analyzing").stream()))

    total = approved + blocked + reviewing + analyzing
    print(f"Total videos processed: {total}")
    print(f"  Approved: {approved} ({approved/total*100:.1f}%)")
    print(f"  Blocked: {blocked} ({blocked/total*100:.1f}%)")
    print(f"  Needs review: {reviewing} ({reviewing/total*100:.1f}%)")
    print(f"  Analyzing: {analyzing}")
```

## Tips for Production

- **Sample rate**: The API does not analyze every frame. It samples at regular intervals, which is sufficient for detecting sustained explicit content but might miss brief flashes.
- **Combine with label detection**: Use label detection alongside SafeSearch for a more complete content understanding.
- **Human review loop**: Always have a human review path for borderline content. Automated systems make mistakes, and false positives frustrate legitimate users.
- **Appeals process**: Let users appeal blocked content. Store the original video in quarantine rather than deleting it immediately.
- **Regional compliance**: Different regions have different content standards. You might need stricter thresholds for some markets.

## Wrapping Up

The Video Intelligence API SafeSearch detection gives you a scalable first line of defense for content moderation. By automating the initial screening and routing flagged content to human reviewers, you can handle high upload volumes without a massive moderation team. The key is setting appropriate thresholds for your platform - too strict and you frustrate users with false positives, too lenient and you miss genuinely problematic content. Start conservative and adjust based on the false positive rate in your review queue.
