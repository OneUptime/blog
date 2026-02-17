# How to Use Safe Search Detection with the Cloud Vision API to Filter Explicit Content

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Vision API, Safe Search, Content Moderation, Image Filtering

Description: Learn how to use Google Cloud Vision API Safe Search detection to automatically filter explicit, violent, and inappropriate image content from your platform.

---

If you run any platform where users upload images - social media, marketplaces, forums, dating apps, or classified ads - content moderation is not optional. You need to catch explicit, violent, and otherwise inappropriate images before they reach other users. Doing this manually does not scale, and training your own content classification model is a major investment.

Cloud Vision API's Safe Search detection provides a ready-to-use solution. It evaluates images across five categories and returns likelihood ratings that you can use to automatically flag or block problematic content.

## What Safe Search Detection Covers

The API evaluates images across five categories:

- **Adult**: Explicit sexual content
- **Spoof**: Likelihood that the image is a parody or has been manipulated
- **Medical**: Medical or graphic anatomical imagery
- **Violence**: Violent or graphic content
- **Racy**: Suggestive content that is not explicitly adult but still potentially inappropriate

Each category returns one of five likelihood levels: VERY_UNLIKELY, UNLIKELY, POSSIBLE, LIKELY, or VERY_LIKELY. You decide what thresholds make sense for your platform.

## Basic Implementation

Here is how to run Safe Search detection on an image:

```python
from google.cloud import vision

def check_safe_search(image_path):
    """Run Safe Search detection on a local image."""
    client = vision.ImageAnnotatorClient()

    # Load the image
    with open(image_path, "rb") as image_file:
        content = image_file.read()

    image = vision.Image(content=content)

    # Run Safe Search detection
    response = client.safe_search_detection(image=image)

    if response.error.message:
        raise Exception(f"API error: {response.error.message}")

    safe = response.safe_search_annotation

    # Print results for each category
    print(f"Adult:    {safe.adult.name}")
    print(f"Spoof:    {safe.spoof.name}")
    print(f"Medical:  {safe.medical.name}")
    print(f"Violence: {safe.violence.name}")
    print(f"Racy:     {safe.racy.name}")

    return safe

result = check_safe_search("uploaded_image.jpg")
```

## Building a Content Moderation Pipeline

In practice, you need a moderation pipeline that makes automated decisions based on the API results. Here is a more complete implementation:

```python
from google.cloud import vision
from enum import IntEnum

class ContentRating(IntEnum):
    """Numeric mapping of likelihood levels for comparison."""
    UNKNOWN = 0
    VERY_UNLIKELY = 1
    UNLIKELY = 2
    POSSIBLE = 3
    LIKELY = 4
    VERY_LIKELY = 5

class ModerationResult:
    """Container for moderation decisions."""
    APPROVED = "approved"
    FLAGGED = "flagged"
    REJECTED = "rejected"

def moderate_image(image_content, strict_mode=False):
    """
    Evaluate an image and return a moderation decision.

    strict_mode: When True, uses lower thresholds for flagging content.
    """
    client = vision.ImageAnnotatorClient()
    image = vision.Image(content=image_content)

    response = client.safe_search_detection(image=image)
    safe = response.safe_search_annotation

    # Convert likelihood names to numeric values for comparison
    scores = {
        "adult": ContentRating[safe.adult.name],
        "violence": ContentRating[safe.violence.name],
        "racy": ContentRating[safe.racy.name],
        "medical": ContentRating[safe.medical.name],
        "spoof": ContentRating[safe.spoof.name],
    }

    # Define thresholds based on mode
    if strict_mode:
        reject_threshold = ContentRating.POSSIBLE
        flag_threshold = ContentRating.UNLIKELY
    else:
        reject_threshold = ContentRating.LIKELY
        flag_threshold = ContentRating.POSSIBLE

    # Auto-reject if adult or violence scores are above threshold
    if scores["adult"] >= reject_threshold or scores["violence"] >= reject_threshold:
        return {
            "decision": ModerationResult.REJECTED,
            "reason": "Content exceeds safety thresholds",
            "scores": scores,
        }

    # Flag for manual review if borderline
    if scores["adult"] >= flag_threshold or scores["violence"] >= flag_threshold or scores["racy"] >= flag_threshold:
        return {
            "decision": ModerationResult.FLAGGED,
            "reason": "Content flagged for manual review",
            "scores": scores,
        }

    return {
        "decision": ModerationResult.APPROVED,
        "reason": "Content passed all safety checks",
        "scores": scores,
    }
```

## Integrating with Cloud Storage Uploads

A common pattern is to moderate images as they are uploaded to Cloud Storage. Here is how to set this up with a Cloud Function:

```python
import functions_framework
from google.cloud import vision
from google.cloud import storage

# Initialize clients outside the function for reuse
vision_client = vision.ImageAnnotatorClient()
storage_client = storage.Client()

@functions_framework.cloud_event
def moderate_upload(cloud_event):
    """Cloud Function triggered by new uploads to a GCS bucket."""
    data = cloud_event.data

    bucket_name = data["bucket"]
    file_name = data["name"]

    # Only process image files
    if not file_name.lower().endswith((".jpg", ".jpeg", ".png", ".gif", ".webp")):
        print(f"Skipping non-image file: {file_name}")
        return

    print(f"Moderating: gs://{bucket_name}/{file_name}")

    # Run Safe Search on the uploaded image
    gcs_uri = f"gs://{bucket_name}/{file_name}"
    image = vision.Image(
        source=vision.ImageSource(gcs_image_uri=gcs_uri)
    )

    response = vision_client.safe_search_detection(image=image)
    safe = response.safe_search_annotation

    # Check for explicit content
    likelihood_map = {
        "UNKNOWN": 0, "VERY_UNLIKELY": 1, "UNLIKELY": 2,
        "POSSIBLE": 3, "LIKELY": 4, "VERY_LIKELY": 5
    }

    adult_score = likelihood_map[safe.adult.name]
    violence_score = likelihood_map[safe.violence.name]

    if adult_score >= 4 or violence_score >= 4:
        # Move the file to a quarantine bucket
        source_bucket = storage_client.bucket(bucket_name)
        quarantine_bucket = storage_client.bucket(f"{bucket_name}-quarantine")

        source_blob = source_bucket.blob(file_name)
        source_bucket.copy_blob(source_blob, quarantine_bucket, file_name)
        source_blob.delete()

        print(f"REJECTED: {file_name} moved to quarantine (adult={safe.adult.name}, violence={safe.violence.name})")
    else:
        print(f"APPROVED: {file_name} (adult={safe.adult.name}, violence={safe.violence.name})")
```

## Batch Processing with the Async API

For large volumes of images, use the asynchronous batch API to avoid timeouts and improve throughput:

```python
from google.cloud import vision

def batch_moderate(image_paths, batch_size=16):
    """Moderate multiple images in batches."""
    client = vision.ImageAnnotatorClient()
    all_results = []

    # Process in batches of 16 (API maximum per request)
    for i in range(0, len(image_paths), batch_size):
        batch = image_paths[i:i + batch_size]

        # Build batch request
        requests = []
        for path in batch:
            with open(path, "rb") as f:
                content = f.read()

            requests.append(
                vision.AnnotateImageRequest(
                    image=vision.Image(content=content),
                    features=[
                        vision.Feature(type_=vision.Feature.Type.SAFE_SEARCH_DETECTION)
                    ],
                )
            )

        # Execute batch request
        response = client.batch_annotate_images(requests=requests)

        # Process results
        for j, result in enumerate(response.responses):
            safe = result.safe_search_annotation
            all_results.append({
                "file": batch[j],
                "adult": safe.adult.name,
                "violence": safe.violence.name,
                "racy": safe.racy.name,
            })

    return all_results

# Process a directory of images
import glob
images = glob.glob("/uploads/*.jpg")
results = batch_moderate(images)

# Print summary
rejected = [r for r in results if r["adult"] in ("LIKELY", "VERY_LIKELY") or r["violence"] in ("LIKELY", "VERY_LIKELY")]
print(f"Total: {len(results)}, Rejected: {len(rejected)}")
```

## Setting Up Moderation Dashboards

Track moderation metrics over time to understand content patterns:

```python
from google.cloud import monitoring_v3
import time

def report_moderation_metric(project_id, decision, category):
    """Report a custom metric for content moderation decisions."""
    client = monitoring_v3.MetricServiceClient()
    project_name = f"projects/{project_id}"

    # Create a time series for the moderation metric
    series = monitoring_v3.TimeSeries()
    series.metric.type = "custom.googleapis.com/content_moderation/decisions"
    series.metric.labels["decision"] = decision  # approved, flagged, rejected
    series.metric.labels["category"] = category  # adult, violence, racy

    series.resource.type = "global"
    series.resource.labels["project_id"] = project_id

    # Add the data point
    now = time.time()
    point = monitoring_v3.Point(
        interval=monitoring_v3.TimeInterval(
            end_time={"seconds": int(now)}
        ),
        value=monitoring_v3.TypedValue(int64_value=1),
    )
    series.points = [point]

    # Write the metric
    client.create_time_series(
        name=project_name,
        time_series=[series]
    )
```

## Handling Edge Cases

Safe Search detection is good but not perfect. Keep these things in mind:

- Artistic nudity, medical images, and news photographs can trigger false positives. Consider a manual review queue for borderline cases.
- Very small images or heavily compressed images may produce less accurate results.
- The API evaluates images independently. It does not consider context from surrounding content or captions.
- Animated GIFs are evaluated as a single frame, not as a sequence.
- Results can differ slightly between the same image at different resolutions.

## Wrapping Up

Safe Search detection from Cloud Vision API is a practical tool for automated content moderation. It covers the major categories of inappropriate content and returns structured likelihood ratings that you can map to your own moderation policies. The key is setting thresholds that match your platform's tolerance level and always having a human review queue for borderline cases.

To monitor your content moderation pipeline and ensure your moderation Cloud Functions are running reliably, [OneUptime](https://oneuptime.com) offers uptime monitoring and alerting that keeps you informed when any part of your system needs attention.
