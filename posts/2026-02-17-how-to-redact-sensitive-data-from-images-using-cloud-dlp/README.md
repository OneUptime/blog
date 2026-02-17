# How to Redact Sensitive Data from Images Using Cloud DLP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud DLP, Image Redaction, Data Security, Privacy

Description: A step-by-step guide to using Cloud DLP's image redaction API to automatically detect and black out sensitive information like SSNs, credit cards, and PII in images.

---

Images are a blind spot in many data protection strategies. Your organization might carefully scan databases and text files for sensitive data, but what about screenshots of customer records, photos of ID cards uploaded through support tickets, or scanned documents with patient information? All of that sensitive data sitting in images goes undetected by traditional text-based DLP scanning.

Cloud DLP's image redaction feature solves this. It uses optical character recognition (OCR) to find text in images, runs DLP detection on that text, and then produces a new image with the sensitive portions blacked out. In this post, I will show you how to use it.

## How Image Redaction Works

The process is straightforward:

1. You send an image to the Cloud DLP `redactImage` API
2. DLP runs OCR to extract text from the image
3. DLP inspects the extracted text for sensitive data (same InfoTypes as text inspection)
4. DLP generates a new image with colored rectangles covering the sensitive regions
5. You get the redacted image back

Supported image formats include PNG, JPEG, BMP, and SVG.

## Step 1: Basic Image Redaction with Python

Here is a simple example that redacts all detected PII from an image:

```python
from google.cloud import dlp_v2
import base64

def redact_image(project_id, input_path, output_path):
    """Redact sensitive data from an image file."""

    dlp_client = dlp_v2.DlpServiceClient()

    # Read the image file
    with open(input_path, "rb") as f:
        image_data = f.read()

    # Define which sensitive data types to redact
    info_types = [
        {"name": "EMAIL_ADDRESS"},
        {"name": "PHONE_NUMBER"},
        {"name": "US_SOCIAL_SECURITY_NUMBER"},
        {"name": "CREDIT_CARD_NUMBER"},
        {"name": "PERSON_NAME"},
        {"name": "STREET_ADDRESS"},
    ]

    # Configure the inspection
    inspect_config = {
        "info_types": info_types,
        "min_likelihood": dlp_v2.Likelihood.POSSIBLE,
    }

    # Configure the image to redact
    byte_item = {
        "type_": "IMAGE_PNG",  # or IMAGE_JPEG, IMAGE_BMP, IMAGE_SVG
        "data": image_data,
    }

    # Define redaction color (black by default)
    image_redaction_configs = [
        {
            "info_type": info_type,
            "redaction_color": {
                "red": 0.0,
                "green": 0.0,
                "blue": 0.0,
            },
        }
        for info_type in info_types
    ]

    parent = f"projects/{project_id}/locations/global"

    # Call the redact API
    response = dlp_client.redact_image(
        request={
            "parent": parent,
            "inspect_config": inspect_config,
            "byte_item": byte_item,
            "image_redaction_configs": image_redaction_configs,
        }
    )

    # Save the redacted image
    with open(output_path, "wb") as f:
        f.write(response.redacted_image)

    print(f"Redacted image saved to {output_path}")

    # Report what was found
    if response.inspect_result and response.inspect_result.findings:
        print(f"\nFindings redacted:")
        for finding in response.inspect_result.findings:
            print(f"  {finding.info_type.name}: {finding.likelihood.name}")

    return response

# Redact PII from a screenshot
redact_image(
    "my-project",
    "customer_record_screenshot.png",
    "customer_record_redacted.png"
)
```

## Step 2: Color-Code Redactions by Type

Instead of blacking out everything, you can use different colors for different types of sensitive data. This is useful when reviewing redacted images to understand what was found:

```python
def redact_image_color_coded(project_id, input_path, output_path):
    """Redact with different colors per InfoType for visual distinction."""

    dlp_client = dlp_v2.DlpServiceClient()

    with open(input_path, "rb") as f:
        image_data = f.read()

    # Map each InfoType to a different redaction color
    redaction_configs = [
        {
            # Red for SSN
            "info_type": {"name": "US_SOCIAL_SECURITY_NUMBER"},
            "redaction_color": {"red": 0.8, "green": 0.0, "blue": 0.0},
        },
        {
            # Blue for email
            "info_type": {"name": "EMAIL_ADDRESS"},
            "redaction_color": {"red": 0.0, "green": 0.0, "blue": 0.8},
        },
        {
            # Green for phone
            "info_type": {"name": "PHONE_NUMBER"},
            "redaction_color": {"red": 0.0, "green": 0.6, "blue": 0.0},
        },
        {
            # Orange for credit card
            "info_type": {"name": "CREDIT_CARD_NUMBER"},
            "redaction_color": {"red": 1.0, "green": 0.5, "blue": 0.0},
        },
        {
            # Purple for names
            "info_type": {"name": "PERSON_NAME"},
            "redaction_color": {"red": 0.5, "green": 0.0, "blue": 0.5},
        },
    ]

    info_types = [{"name": c["info_type"]["name"]} for c in redaction_configs]

    inspect_config = {
        "info_types": info_types,
        "min_likelihood": dlp_v2.Likelihood.POSSIBLE,
    }

    byte_item = {
        "type_": "IMAGE_PNG",
        "data": image_data,
    }

    parent = f"projects/{project_id}/locations/global"

    response = dlp_client.redact_image(
        request={
            "parent": parent,
            "inspect_config": inspect_config,
            "byte_item": byte_item,
            "image_redaction_configs": redaction_configs,
        }
    )

    with open(output_path, "wb") as f:
        f.write(response.redacted_image)

    print(f"Color-coded redacted image saved to {output_path}")
    return response
```

## Step 3: Redact All Text from an Image

Sometimes you want to remove all text regardless of whether it is sensitive. This is useful for heavily redacted documents:

```python
def redact_all_text(project_id, input_path, output_path):
    """Remove all detected text from an image."""

    dlp_client = dlp_v2.DlpServiceClient()

    with open(input_path, "rb") as f:
        image_data = f.read()

    byte_item = {
        "type_": "IMAGE_PNG",
        "data": image_data,
    }

    # Use redact_all_text flag instead of specific InfoTypes
    image_redaction_configs = [
        {
            "redact_all_text": True,
            "redaction_color": {"red": 0.0, "green": 0.0, "blue": 0.0},
        }
    ]

    parent = f"projects/{project_id}/locations/global"

    response = dlp_client.redact_image(
        request={
            "parent": parent,
            "byte_item": byte_item,
            "image_redaction_configs": image_redaction_configs,
        }
    )

    with open(output_path, "wb") as f:
        f.write(response.redacted_image)

    print(f"All-text-redacted image saved to {output_path}")
    return response
```

## Step 4: Batch Process Images from Cloud Storage

For processing many images, read from Cloud Storage and write back the redacted versions:

```python
from google.cloud import storage, dlp_v2

def batch_redact_images(project_id, source_bucket, source_prefix,
                         dest_bucket, dest_prefix):
    """Batch redact images from Cloud Storage."""

    storage_client = storage.Client()
    dlp_client = dlp_v2.DlpServiceClient()

    source_bkt = storage_client.bucket(source_bucket)
    dest_bkt = storage_client.bucket(dest_bucket)

    # List all image files in the source prefix
    blobs = source_bkt.list_blobs(prefix=source_prefix)
    image_extensions = ('.png', '.jpg', '.jpeg', '.bmp')

    info_types = [
        {"name": "EMAIL_ADDRESS"},
        {"name": "PHONE_NUMBER"},
        {"name": "US_SOCIAL_SECURITY_NUMBER"},
        {"name": "CREDIT_CARD_NUMBER"},
        {"name": "PERSON_NAME"},
    ]

    inspect_config = {
        "info_types": info_types,
        "min_likelihood": dlp_v2.Likelihood.POSSIBLE,
    }

    processed = 0

    for blob in blobs:
        # Skip non-image files
        if not blob.name.lower().endswith(image_extensions):
            continue

        print(f"Processing: {blob.name}")

        # Determine image type from extension
        ext = blob.name.lower().split('.')[-1]
        image_type_map = {
            'png': 'IMAGE_PNG',
            'jpg': 'IMAGE_JPEG',
            'jpeg': 'IMAGE_JPEG',
            'bmp': 'IMAGE_BMP',
        }
        image_type = image_type_map.get(ext, 'IMAGE_PNG')

        # Download the image
        image_data = blob.download_as_bytes()

        byte_item = {
            "type_": image_type,
            "data": image_data,
        }

        image_redaction_configs = [
            {
                "info_type": it,
                "redaction_color": {"red": 0.0, "green": 0.0, "blue": 0.0},
            }
            for it in info_types
        ]

        parent = f"projects/{project_id}/locations/global"

        # Redact the image
        response = dlp_client.redact_image(
            request={
                "parent": parent,
                "inspect_config": inspect_config,
                "byte_item": byte_item,
                "image_redaction_configs": image_redaction_configs,
            }
        )

        # Upload the redacted image to the destination
        dest_path = blob.name.replace(source_prefix, dest_prefix, 1)
        dest_blob = dest_bkt.blob(dest_path)
        dest_blob.upload_from_string(
            response.redacted_image,
            content_type=blob.content_type,
        )

        processed += 1
        print(f"  Redacted and saved to gs://{dest_bucket}/{dest_path}")

    print(f"\nProcessed {processed} images")
```

## Step 5: Automate with Cloud Functions

Trigger image redaction automatically when images are uploaded:

```python
import functions_framework
from google.cloud import dlp_v2, storage

@functions_framework.cloud_event
def redact_uploaded_image(cloud_event):
    """Automatically redact images uploaded to a Cloud Storage bucket."""

    data = cloud_event.data
    bucket_name = data["bucket"]
    file_name = data["name"]

    # Only process image files
    image_extensions = ('.png', '.jpg', '.jpeg', '.bmp')
    if not file_name.lower().endswith(image_extensions):
        return

    # Skip files in the redacted output folder
    if file_name.startswith("redacted/"):
        return

    project_id = "my-project"
    dlp_client = dlp_v2.DlpServiceClient()
    storage_client = storage.Client()

    # Download the image
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(file_name)
    image_data = blob.download_as_bytes()

    # Determine image type
    ext = file_name.lower().split('.')[-1]
    type_map = {'png': 'IMAGE_PNG', 'jpg': 'IMAGE_JPEG',
                'jpeg': 'IMAGE_JPEG', 'bmp': 'IMAGE_BMP'}

    # Redact the image
    parent = f"projects/{project_id}/locations/global"
    response = dlp_client.redact_image(
        request={
            "parent": parent,
            "inspect_config": {
                "info_types": [
                    {"name": "US_SOCIAL_SECURITY_NUMBER"},
                    {"name": "CREDIT_CARD_NUMBER"},
                    {"name": "PHONE_NUMBER"},
                    {"name": "EMAIL_ADDRESS"},
                ],
                "min_likelihood": dlp_v2.Likelihood.POSSIBLE,
            },
            "byte_item": {
                "type_": type_map.get(ext, 'IMAGE_PNG'),
                "data": image_data,
            },
            "image_redaction_configs": [
                {"redact_all_text": False},
            ],
        }
    )

    # Save the redacted version
    redacted_blob = bucket.blob(f"redacted/{file_name}")
    redacted_blob.upload_from_string(
        response.redacted_image,
        content_type=blob.content_type,
    )

    print(f"Redacted {file_name} and saved to redacted/{file_name}")
```

## Limitations to Know About

**Image size limits.** The `redactImage` API has a 4 MB request size limit. For larger images, you will need to resize them first or split them into smaller regions.

**OCR accuracy.** The text detection depends on image quality. Low-resolution images, handwriting, or unusual fonts may result in missed detections. High-quality, well-lit images with standard fonts work best.

**No PDF support directly.** The `redactImage` API works on individual images, not PDFs. To redact PDFs, you need to convert pages to images first, redact each page, and reassemble.

**Synchronous API.** Unlike inspection jobs, image redaction is synchronous - you send the image and wait for the response. For batch processing, you need to handle parallelism yourself or use Cloud Tasks to manage the workload.

## Summary

Cloud DLP image redaction fills an important gap in data protection by handling sensitive data in images. Use it to redact PII from screenshots, scanned documents, and uploaded photos. For production use, automate the process with Cloud Functions triggered by file uploads, and be mindful of the image size limits and OCR accuracy constraints. Color-coded redactions help during reviews, and batch processing scripts handle high-volume scenarios.
