# How to Use Amazon Rekognition for Image Analysis

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Amazon Rekognition, Image Analysis, Computer Vision

Description: Learn how to use Amazon Rekognition to detect objects, scenes, text, and inappropriate content in images with practical Python code examples.

---

Amazon Rekognition is AWS's computer vision service, and it's remarkably capable for something you can start using in five minutes. No model training, no GPU management, no computer vision expertise needed. You pass it an image, and it tells you what's in it - objects, scenes, text, faces, celebrities, and even inappropriate content. It works great for content moderation, image cataloging, visual search, and accessibility features.

Let's walk through the major features with practical code you can use right away.

## Getting Started

Rekognition can analyze images from S3 or from raw bytes. For most production use cases, S3 is the way to go, but for quick testing, you can send image bytes directly.

```python
import boto3
import json

rekognition = boto3.client('rekognition', region_name='us-east-1')

def analyze_from_s3(bucket, key):
    """Analyze an image stored in S3."""
    return {
        'S3Object': {
            'Bucket': bucket,
            'Name': key
        }
    }

def analyze_from_file(file_path):
    """Load an image from a local file for analysis."""
    with open(file_path, 'rb') as f:
        return {'Bytes': f.read()}
```

## Object and Scene Detection

Label detection identifies objects, scenes, concepts, and activities in an image. Each label comes with a confidence score and, when applicable, bounding box coordinates.

```python
def detect_labels(image, max_labels=20, min_confidence=75):
    """Detect objects and scenes in an image."""
    response = rekognition.detect_labels(
        Image=image,
        MaxLabels=max_labels,
        MinConfidence=min_confidence,
        Features=['GENERAL_LABELS']
    )

    labels = response['Labels']

    for label in labels:
        print(f"{label['Name']} ({label['Confidence']:.1f}%)")

        # Some labels include bounding boxes for specific instances
        for instance in label.get('Instances', []):
            box = instance['BoundingBox']
            print(f"  Location: ({box['Left']:.2f}, {box['Top']:.2f}) "
                  f"Size: {box['Width']:.2f} x {box['Height']:.2f}")

        # Category information
        for category in label.get('Categories', []):
            print(f"  Category: {category['Name']}")

    return labels

# Detect labels in an S3 image
image = analyze_from_s3('my-images-bucket', 'photos/office.jpg')
labels = detect_labels(image)
```

## Text Detection in Images (OCR)

Rekognition can read text in images - signs, labels, documents, screenshots. It returns both the detected text and its location.

```python
def detect_text(image):
    """Detect and extract text from an image."""
    response = rekognition.detect_text(Image=image)

    detections = response['TextDetections']

    # Separate LINE and WORD detections
    lines = [d for d in detections if d['Type'] == 'LINE']
    words = [d for d in detections if d['Type'] == 'WORD']

    print(f"Found {len(lines)} lines, {len(words)} words\n")

    print("Lines detected:")
    for line in lines:
        box = line['Geometry']['BoundingBox']
        print(f"  '{line['DetectedText']}' "
              f"(confidence: {line['Confidence']:.1f}%, "
              f"position: ({box['Left']:.2f}, {box['Top']:.2f}))")

    return detections

# Read text from a photo of a sign or document
image = analyze_from_s3('my-images-bucket', 'photos/store-sign.jpg')
text_results = detect_text(image)
```

## Content Moderation

Automatically detect inappropriate or unwanted content. This is essential for any platform that accepts user-uploaded images.

```python
def moderate_content(image, min_confidence=60):
    """Check an image for inappropriate content."""
    response = rekognition.detect_moderation_labels(
        Image=image,
        MinConfidence=min_confidence
    )

    labels = response['ModerationLabels']

    if not labels:
        print("No inappropriate content detected")
        return True, []

    print("Moderation flags:")
    for label in labels:
        print(f"  {label['Name']} "
              f"(parent: {label.get('ParentName', 'none')}, "
              f"confidence: {label['Confidence']:.1f}%)")

    # Return whether the image is safe and the flags found
    is_safe = len(labels) == 0
    return is_safe, labels

# Check uploaded images before displaying them
image = analyze_from_s3('user-uploads', 'image-123.jpg')
is_safe, flags = moderate_content(image)

if not is_safe:
    print("Image blocked - flagged for review")
```

## Building an Image Cataloging System

Combine label detection with a database to build searchable image catalogs.

```python
import boto3
from datetime import datetime

class ImageCatalog:
    """Catalog images with auto-detected labels for search."""

    def __init__(self):
        self.rekognition = boto3.client('rekognition', region_name='us-east-1')
        self.dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
        self.table = self.dynamodb.Table('image-catalog')

    def index_image(self, bucket, key, metadata=None):
        """Analyze an image and store its labels for searching."""
        # Detect labels
        label_response = self.rekognition.detect_labels(
            Image={'S3Object': {'Bucket': bucket, 'Name': key}},
            MaxLabels=30,
            MinConfidence=70
        )

        # Detect text
        text_response = self.rekognition.detect_text(
            Image={'S3Object': {'Bucket': bucket, 'Name': key}}
        )

        # Run moderation check
        mod_response = self.rekognition.detect_moderation_labels(
            Image={'S3Object': {'Bucket': bucket, 'Name': key}}
        )

        # Extract label names
        labels = [l['Name'].lower() for l in label_response['Labels']]
        text_lines = [
            d['DetectedText'] for d in text_response['TextDetections']
            if d['Type'] == 'LINE'
        ]
        mod_flags = [l['Name'] for l in mod_response['ModerationLabels']]

        # Store in DynamoDB
        item = {
            'image_key': f"{bucket}/{key}",
            'bucket': bucket,
            's3_key': key,
            'labels': labels,
            'text_content': text_lines,
            'moderation_flags': mod_flags,
            'is_safe': len(mod_flags) == 0,
            'indexed_at': datetime.utcnow().isoformat(),
            'metadata': metadata or {}
        }

        self.table.put_item(Item=item)
        print(f"Indexed {key}: {len(labels)} labels, {len(text_lines)} text lines")
        return item

    def search_by_label(self, label):
        """Search for images containing a specific label."""
        # In production, use a proper search index like OpenSearch
        response = self.table.scan(
            FilterExpression='contains(labels, :label)',
            ExpressionAttributeValues={':label': label.lower()}
        )
        return response['Items']

# Usage
catalog = ImageCatalog()
catalog.index_image('my-photos', 'vacation/beach.jpg')
results = catalog.search_by_label('beach')
```

## Processing Images from a Lambda Function

Here's a Lambda function that automatically analyzes images when they're uploaded to S3.

```python
def lambda_handler(event, context):
    """Triggered by S3 upload - analyze the image automatically."""
    rekognition = boto3.client('rekognition')

    for record in event['Records']:
        bucket = record['s3']['bucket']['name']
        key = record['s3']['object']['key']

        # Skip non-image files
        if not key.lower().endswith(('.jpg', '.jpeg', '.png')):
            continue

        image = {'S3Object': {'Bucket': bucket, 'Name': key}}

        # Run content moderation first
        mod_response = rekognition.detect_moderation_labels(
            Image=image,
            MinConfidence=70
        )

        if mod_response['ModerationLabels']:
            # Move flagged images to a quarantine bucket
            s3 = boto3.client('s3')
            s3.copy_object(
                Bucket='quarantine-bucket',
                Key=key,
                CopySource={'Bucket': bucket, 'Key': key}
            )
            s3.delete_object(Bucket=bucket, Key=key)
            print(f"Quarantined {key}")
            continue

        # Image is safe - detect labels
        label_response = rekognition.detect_labels(
            Image=image,
            MaxLabels=20,
            MinConfidence=75
        )

        labels = [l['Name'] for l in label_response['Labels']]
        print(f"Processed {key}: {', '.join(labels)}")

    return {'statusCode': 200}
```

## Cost Optimization

Rekognition charges per image processed, with different rates for each feature. A few tips for managing costs:

- Only call the APIs you actually need - don't run moderation checks if you don't need them
- Set appropriate `MinConfidence` thresholds to reduce noise
- Use `MaxLabels` to limit the number of labels returned
- Cache results if you might analyze the same image multiple times
- For batch processing, consider running jobs during off-peak hours

For monitoring your Rekognition usage and costs alongside other AWS services, check out our guide on [monitoring AWS infrastructure](https://oneuptime.com/blog/post/2026-02-02-pulumi-aws-infrastructure/view).

If you need face detection and comparison specifically, take a look at our dedicated guide on [Amazon Rekognition for face detection](https://oneuptime.com/blog/post/2026-02-12-amazon-rekognition-face-detection-comparison/view). And for video analysis, see [Amazon Rekognition for video analysis](https://oneuptime.com/blog/post/2026-02-12-amazon-rekognition-video-analysis/view).

Rekognition is one of those services that's easy to underestimate until you start using it. The combination of label detection, OCR, and content moderation covers a surprising range of real-world image analysis needs.
