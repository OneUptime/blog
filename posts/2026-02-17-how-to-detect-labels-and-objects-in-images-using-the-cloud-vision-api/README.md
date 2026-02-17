# How to Detect Labels and Objects in Images Using the Cloud Vision API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Vision API, Object Detection, Label Detection, Image Analysis

Description: Learn how to use Google Cloud Vision API to detect labels, objects, and their locations in images for building intelligent image analysis applications.

---

When you need to understand what is in an image programmatically, Cloud Vision API is one of the fastest paths to a working solution. Label detection tells you what concepts appear in an image (dog, beach, sunset), while object detection goes further by identifying specific objects and drawing bounding boxes around them. Together, they power everything from photo organization to automated content moderation.

This guide covers both features in detail, with practical code examples you can adapt for your own projects.

## Label Detection vs Object Detection

These two features serve different purposes, and it is worth understanding the distinction:

**Label Detection** identifies general concepts and themes in an image. It returns labels like "dog", "outdoor", "grass", "pet" with confidence scores. Labels describe the overall scene and its contents but do not tell you where specific things are located within the image.

**Object Localization** identifies specific objects and provides bounding boxes showing exactly where each object appears. It returns results like "Dog at position (x1, y1) to (x2, y2)" with confidence scores. This is what you need when object position matters.

Use label detection when you want to categorize or tag images. Use object localization when you need to know where things are.

## Getting Started

Enable the Vision API and install the client library:

```bash
# Enable the Vision API in your project
gcloud services enable vision.googleapis.com

# Install the Python client
pip install google-cloud-vision Pillow
```

## Label Detection

Label detection is the simplest way to understand image contents. Here is how to use it:

```python
from google.cloud import vision

def detect_labels(image_path, max_results=15):
    """Detect labels in a local image and return them sorted by confidence."""
    client = vision.ImageAnnotatorClient()

    # Load the image
    with open(image_path, "rb") as image_file:
        content = image_file.read()

    image = vision.Image(content=content)

    # Call the label detection endpoint
    response = client.label_detection(
        image=image,
        max_results=max_results  # Limit the number of labels returned
    )

    if response.error.message:
        raise Exception(f"API error: {response.error.message}")

    # Print labels with confidence scores
    labels = response.label_annotations
    for label in labels:
        print(f"{label.description}: {label.score:.2f} (mid: {label.mid})")

    return labels

# Example usage
labels = detect_labels("beach_photo.jpg")
```

A typical response for a beach photo might look like:

```
Sky: 0.97
Sea: 0.96
Beach: 0.95
Water: 0.94
Cloud: 0.92
Horizon: 0.89
Ocean: 0.87
Sand: 0.85
Vacation: 0.72
Travel: 0.68
```

## Object Localization

Object localization gives you bounding boxes for detected objects:

```python
from google.cloud import vision

def detect_objects(image_path):
    """Detect and localize objects in an image with bounding boxes."""
    client = vision.ImageAnnotatorClient()

    with open(image_path, "rb") as image_file:
        content = image_file.read()

    image = vision.Image(content=content)

    # Use object localization to find objects with positions
    response = client.object_localization(image=image)
    objects = response.localized_object_annotations

    print(f"Found {len(objects)} objects:")
    for obj in objects:
        print(f"\n  {obj.name} (confidence: {obj.score:.2f})")

        # Bounding box vertices are normalized (0 to 1)
        for vertex in obj.bounding_poly.normalized_vertices:
            print(f"    Vertex: ({vertex.x:.3f}, {vertex.y:.3f})")

    return objects

objects = detect_objects("street_scene.jpg")
```

## Drawing Bounding Boxes on Images

To visualize the detection results, you can draw bounding boxes on the original image using Pillow:

```python
from google.cloud import vision
from PIL import Image, ImageDraw, ImageFont

def draw_object_boxes(image_path, output_path):
    """Detect objects and draw bounding boxes on the image."""
    # First detect objects
    client = vision.ImageAnnotatorClient()

    with open(image_path, "rb") as f:
        content = f.read()

    image = vision.Image(content=content)
    response = client.object_localization(image=image)
    objects = response.localized_object_annotations

    # Open the image with Pillow
    img = Image.open(image_path)
    draw = ImageDraw.Draw(img)
    width, height = img.size

    # Define colors for different object types
    colors = ["red", "green", "blue", "yellow", "purple", "orange"]

    for i, obj in enumerate(objects):
        color = colors[i % len(colors)]

        # Convert normalized coordinates to pixel coordinates
        vertices = obj.bounding_poly.normalized_vertices
        box = [
            (vertices[0].x * width, vertices[0].y * height),
            (vertices[2].x * width, vertices[2].y * height),
        ]

        # Draw the bounding box
        draw.rectangle(box, outline=color, width=3)

        # Add label text above the box
        label = f"{obj.name} ({obj.score:.0%})"
        draw.text((box[0][0], box[0][1] - 15), label, fill=color)

    # Save the annotated image
    img.save(output_path)
    print(f"Saved annotated image to {output_path}")

draw_object_boxes("street_scene.jpg", "annotated_output.jpg")
```

## Combining Labels and Objects

In many applications, you want both the high-level context from labels and the specific object positions. Here is how to request both in a single API call:

```python
from google.cloud import vision

def analyze_image_full(image_path):
    """Run both label detection and object localization in one call."""
    client = vision.ImageAnnotatorClient()

    with open(image_path, "rb") as f:
        content = f.read()

    image = vision.Image(content=content)

    # Request multiple features in a single API call
    features = [
        vision.Feature(type_=vision.Feature.Type.LABEL_DETECTION, max_results=10),
        vision.Feature(type_=vision.Feature.Type.OBJECT_LOCALIZATION, max_results=10),
    ]

    request = vision.AnnotateImageRequest(
        image=image,
        features=features,
    )

    # Single API call for both features
    response = client.annotate_image(request=request)

    # Process labels
    print("Labels:")
    for label in response.label_annotations:
        print(f"  {label.description}: {label.score:.2f}")

    # Process objects
    print("\nObjects:")
    for obj in response.localized_object_annotations:
        print(f"  {obj.name}: {obj.score:.2f}")

    return response

analyze_image_full("kitchen_photo.jpg")
```

## Building an Image Tagging System

Here is a practical example that builds an automatic image tagging system using label detection:

```python
from google.cloud import vision
from google.cloud import storage
import json

def tag_images_in_bucket(bucket_name, prefix="images/"):
    """Automatically tag all images in a GCS bucket."""
    vision_client = vision.ImageAnnotatorClient()
    storage_client = storage.Client()

    bucket = storage_client.bucket(bucket_name)
    blobs = bucket.list_blobs(prefix=prefix)

    tags_db = {}

    for blob in blobs:
        # Only process image files
        if not blob.name.lower().endswith((".jpg", ".jpeg", ".png")):
            continue

        print(f"Processing: {blob.name}")

        # Reference the image directly from GCS
        gcs_uri = f"gs://{bucket_name}/{blob.name}"
        image = vision.Image(
            source=vision.ImageSource(gcs_image_uri=gcs_uri)
        )

        # Detect labels
        response = vision_client.label_detection(image=image, max_results=10)

        # Store tags with confidence above 0.7
        tags = [
            {"label": label.description, "score": round(label.score, 3)}
            for label in response.label_annotations
            if label.score > 0.7
        ]

        tags_db[blob.name] = tags
        print(f"  Tags: {[t['label'] for t in tags]}")

    # Save the tags database
    output_blob = bucket.blob("image_tags.json")
    output_blob.upload_from_string(
        json.dumps(tags_db, indent=2),
        content_type="application/json"
    )

    return tags_db

# Tag all images in a bucket
tags = tag_images_in_bucket("my-photo-bucket")
```

## Performance and Cost Tips

A few practical notes from working with these APIs:

**Batching**: Use the `batch_annotate_images` method when processing multiple images. It accepts up to 16 images per request, reducing network overhead.

**Caching**: If the same image might be analyzed multiple times, cache the results. Vision API charges per request, not per unique image.

**Image Size**: Resize large images before sending them. The API works well with images around 1024x1024 pixels. Sending a 20MP photo does not improve accuracy but does increase latency and bandwidth costs.

**Confidence Thresholds**: Always filter results by confidence score. A threshold of 0.7 works well for most applications, but tune it based on your specific use case.

## Wrapping Up

Cloud Vision API's label and object detection features give you a solid foundation for building image understanding into your applications. Label detection provides quick categorization, while object localization tells you exactly where things are in the image. Combining both in a single API call keeps things efficient.

For tracking the health and response times of your Vision API integrations in production, [OneUptime](https://oneuptime.com) provides monitoring and alerting that helps you catch issues before they affect your users.
