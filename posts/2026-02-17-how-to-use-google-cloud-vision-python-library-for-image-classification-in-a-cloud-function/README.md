# How to Use the google-cloud-vision Python Library for Image Classification in a Cloud Function

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Vision, Python, Cloud Functions, Image Recognition

Description: Learn how to use the google-cloud-vision Python library to classify images in a Cloud Function triggered by Cloud Storage uploads.

---

Google Cloud Vision API can analyze images for labels, objects, text, faces, and more. Combining it with Cloud Functions creates a powerful pattern: an image gets uploaded to Cloud Storage, a function triggers automatically, Vision API analyzes it, and the results get stored somewhere useful. I have used this pattern for content moderation, automatic tagging in media libraries, and extracting text from scanned documents.

## Setup

Install the Vision API client library.

```bash
# Install the Vision API Python client
pip install google-cloud-vision google-cloud-storage google-cloud-firestore

# Enable the Vision API in your project
gcloud services enable vision.googleapis.com
```

## Basic Image Label Detection

Let me start with the fundamentals. Here is how to detect labels (categories) in an image.

```python
from google.cloud import vision

def detect_labels(image_uri):
    """Detect labels in an image from a Cloud Storage URI."""
    client = vision.ImageAnnotatorClient()

    # Create an Image object pointing to Cloud Storage
    image = vision.Image()
    image.source.image_uri = image_uri

    # Request label detection
    response = client.label_detection(image=image)

    if response.error.message:
        raise RuntimeError(f"Vision API error: {response.error.message}")

    # Extract labels with their confidence scores
    labels = []
    for label in response.label_annotations:
        labels.append({
            "description": label.description,
            "score": round(label.score, 4),
            "topicality": round(label.topicality, 4),
        })

    return labels

# Test with a Cloud Storage image
labels = detect_labels("gs://my-bucket/photos/sunset.jpg")
for label in labels:
    print(f"{label['description']}: {label['score']:.1%}")
```

## Building the Cloud Function

Here is a Cloud Function that triggers when an image is uploaded to a Cloud Storage bucket.

```python
# main.py - Cloud Function for image classification
import functions_framework
from google.cloud import vision, firestore, storage
import logging
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize clients once (reused across invocations)
vision_client = vision.ImageAnnotatorClient()
firestore_client = firestore.Client()
storage_client = storage.Client()

# Image extensions we want to process
SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"}

@functions_framework.cloud_event
def classify_image(cloud_event):
    """Classify an uploaded image when it lands in Cloud Storage."""
    data = cloud_event.data

    bucket_name = data["bucket"]
    file_name = data["name"]

    # Check if the uploaded file is an image
    extension = "." + file_name.rsplit(".", 1)[-1].lower() if "." in file_name else ""
    if extension not in SUPPORTED_EXTENSIONS:
        logger.info(f"Skipping non-image file: {file_name}")
        return

    logger.info(f"Processing image: gs://{bucket_name}/{file_name}")

    # Build the Cloud Storage URI
    image_uri = f"gs://{bucket_name}/{file_name}"

    try:
        # Run multiple Vision API analyses in one call
        results = analyze_image(image_uri)

        # Store the classification results in Firestore
        store_results(bucket_name, file_name, results)

        logger.info(f"Classification complete for {file_name}: {len(results['labels'])} labels found")

    except Exception as e:
        logger.error(f"Failed to classify {file_name}: {str(e)}")
        raise  # Retry on failure
```

## Multi-Feature Image Analysis

You can request multiple types of analysis in a single API call, which is more efficient than making separate calls.

```python
def analyze_image(image_uri):
    """Run multiple Vision API analyses on an image."""
    image = vision.Image()
    image.source.image_uri = image_uri

    # Request multiple feature types in one call
    features = [
        vision.Feature(type_=vision.Feature.Type.LABEL_DETECTION, max_results=15),
        vision.Feature(type_=vision.Feature.Type.OBJECT_LOCALIZATION, max_results=10),
        vision.Feature(type_=vision.Feature.Type.IMAGE_PROPERTIES),
        vision.Feature(type_=vision.Feature.Type.SAFE_SEARCH_DETECTION),
        vision.Feature(type_=vision.Feature.Type.TEXT_DETECTION),
    ]

    request = vision.AnnotateImageRequest(image=image, features=features)
    response = vision_client.annotate_image(request=request)

    if response.error.message:
        raise RuntimeError(f"Vision API error: {response.error.message}")

    # Process label detection results
    labels = [
        {"name": label.description, "confidence": round(label.score, 4)}
        for label in response.label_annotations
    ]

    # Process object localization results
    objects = [
        {
            "name": obj.name,
            "confidence": round(obj.score, 4),
            "bounding_box": [
                {"x": vertex.x, "y": vertex.y}
                for vertex in obj.bounding_poly.normalized_vertices
            ],
        }
        for obj in response.localized_object_annotations
    ]

    # Process safe search results
    safe_search = response.safe_search_annotation
    safety = {
        "adult": safe_search.adult.name,
        "violence": safe_search.violence.name,
        "racy": safe_search.racy.name,
        "medical": safe_search.medical.name,
        "spoof": safe_search.spoof.name,
    }

    # Process text detection results
    texts = []
    if response.text_annotations:
        texts = [response.text_annotations[0].description]  # Full text

    # Process dominant colors
    colors = []
    if response.image_properties_annotation:
        for color_info in response.image_properties_annotation.dominant_colors.colors[:5]:
            colors.append({
                "red": int(color_info.color.red),
                "green": int(color_info.color.green),
                "blue": int(color_info.color.blue),
                "score": round(color_info.score, 4),
                "pixel_fraction": round(color_info.pixel_fraction, 4),
            })

    return {
        "labels": labels,
        "objects": objects,
        "safety": safety,
        "text": texts,
        "dominant_colors": colors,
    }
```

## Storing Results in Firestore

Store the classification results so they can be queried later.

```python
def store_results(bucket_name, file_name, results):
    """Store image classification results in Firestore."""
    # Use the file path as the document ID (replacing slashes with dashes)
    doc_id = f"{bucket_name}_{file_name}".replace("/", "_")

    doc_data = {
        "bucket": bucket_name,
        "file_name": file_name,
        "image_uri": f"gs://{bucket_name}/{file_name}",
        "labels": results["labels"],
        "objects": results["objects"],
        "safety": results["safety"],
        "text": results["text"],
        "dominant_colors": results["dominant_colors"],
        "classified_at": firestore.SERVER_TIMESTAMP,
        # Create a searchable list of label names
        "label_names": [label["name"].lower() for label in results["labels"]],
    }

    firestore_client.collection("image_classifications").document(doc_id).set(doc_data)
```

## Content Moderation

A practical use case is automatic content moderation for user-uploaded images.

```python
def check_content_safety(image_uri):
    """Check if an image is safe for display."""
    image = vision.Image()
    image.source.image_uri = image_uri

    response = vision_client.safe_search_detection(image=image)
    safe_search = response.safe_search_annotation

    # Define which levels are acceptable
    # UNKNOWN=0, VERY_UNLIKELY=1, UNLIKELY=2, POSSIBLE=3, LIKELY=4, VERY_LIKELY=5
    unsafe_threshold = vision.Likelihood.LIKELY

    is_safe = all([
        safe_search.adult < unsafe_threshold,
        safe_search.violence < unsafe_threshold,
        safe_search.racy < unsafe_threshold,
    ])

    return {
        "is_safe": is_safe,
        "adult": safe_search.adult.name,
        "violence": safe_search.violence.name,
        "racy": safe_search.racy.name,
    }

# Usage in the Cloud Function
def classify_and_moderate(cloud_event):
    """Classify and moderate an uploaded image."""
    data = cloud_event.data
    image_uri = f"gs://{data['bucket']}/{data['name']}"

    safety = check_content_safety(image_uri)

    if not safety["is_safe"]:
        logger.warning(f"Unsafe content detected in {data['name']}: {safety}")
        # Move the image to a quarantine bucket
        source_bucket = storage_client.bucket(data["bucket"])
        source_blob = source_bucket.blob(data["name"])
        quarantine_bucket = storage_client.bucket("quarantine-bucket")

        source_bucket.copy_blob(source_blob, quarantine_bucket, data["name"])
        source_blob.delete()

        logger.info(f"Moved unsafe image to quarantine: {data['name']}")
        return

    # Continue with normal classification for safe images
    results = analyze_image(image_uri)
    store_results(data["bucket"], data["name"], results)
```

## Deploying the Function

Deploy the Cloud Function with a Cloud Storage trigger.

```bash
# Deploy with Cloud Storage trigger
gcloud functions deploy classify-image \
    --gen2 \
    --runtime=python311 \
    --region=us-central1 \
    --source=. \
    --entry-point=classify_image \
    --trigger-event-filters="type=google.cloud.storage.object.v1.finalized" \
    --trigger-event-filters="bucket=my-upload-bucket" \
    --memory=512Mi \
    --timeout=120s \
    --max-instances=10
```

## Querying Classification Results

Once images are classified, query the results from Firestore.

```python
from google.cloud import firestore

db = firestore.Client()

# Find all images containing a specific label
def find_images_by_label(label_name):
    """Find images that contain a specific label."""
    docs = (
        db.collection("image_classifications")
        .where("label_names", "array_contains", label_name.lower())
        .stream()
    )

    results = []
    for doc in docs:
        data = doc.to_dict()
        results.append({
            "image_uri": data["image_uri"],
            "labels": data["labels"][:5],
            "classified_at": data["classified_at"],
        })

    return results

# Find images with dogs
dog_images = find_images_by_label("dog")
for img in dog_images:
    print(f"  {img['image_uri']}")
```

## Monitoring Your Vision Pipeline

Image classification pipelines can fail silently - maybe the Vision API quota is exhausted, or images are arriving faster than your function can process them. OneUptime (https://oneuptime.com) can monitor your Cloud Functions and alert you when error rates increase or when processing latency suggests a backlog is building up.

## Summary

The Vision API combined with Cloud Functions and Cloud Storage creates a fully automated image classification pipeline. Images arrive, they get analyzed, and the results are stored for querying. The key decisions are: request multiple feature types in a single API call for efficiency, store results in a queryable format like Firestore, implement content moderation for user-uploaded content, and set appropriate memory and timeout limits on your Cloud Function since image processing can be resource-intensive.
