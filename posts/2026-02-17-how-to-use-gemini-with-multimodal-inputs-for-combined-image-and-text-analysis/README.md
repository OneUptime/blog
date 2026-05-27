# How to Use Gemini with Multimodal Inputs for Combined Image and Text Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Gemini, Vertex AI, Multimodal AI, Image Analysis

Description: A practical guide to using Gemini's multimodal capabilities for combined image and text analysis including visual QA, document processing, and content moderation.

---

Gemini is natively multimodal, meaning it does not just understand text - it can process images, video, and audio in the same conversation. This opens up use cases that were previously complex to build: analyzing screenshots, extracting data from charts, processing scanned documents, and building visual question-answering systems.

I have been building multimodal features for the past few months and have found Gemini's image understanding to be surprisingly capable. In this post, I will show you the patterns that work well for combined image and text analysis.

## Understanding Multimodal Inputs

Gemini processes different modalities through a unified model. You do not need separate models for vision and text - you send images and text together in one request, and the model reasons over both. This is fundamentally different from older approaches where you had to chain a vision model with a language model.

Supported image formats include JPEG, PNG, WebP, HEIC, and HEIF. You can send images from local files, Cloud Storage URIs, or base64-encoded data.

## Sending Images from Local Files

The most straightforward approach is loading an image from disk and sending it with a text prompt.

This code analyzes a local image:

```python
import mimetypes
from google import genai
from google.genai import types

# Initialize Vertex AI

client = genai.Client(
    vertexai=True,
    project="your-project-id",
    location="us-central1"
)
model = "gemini-2.5-flash"

def image_part_from_file(path):
    """Load a local image file as a Gemini content part."""
    mime_type, _ = mimetypes.guess_type(path)
    if mime_type not in {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}:
        raise ValueError(f"Unsupported image MIME type: {mime_type}")

    with open(path, "rb") as image_file:
        return types.Part.from_bytes(data=image_file.read(), mime_type=mime_type)

# Load an image from a local file
image = image_part_from_file("server-dashboard-screenshot.png")

# Send the image with a text prompt
response = client.models.generate_content(
    model=model,
    contents=[
        image,
        "Analyze this server monitoring dashboard screenshot. "
        "What metrics are shown? Are there any concerning values? "
        "What actions would you recommend based on what you see?"
    ]
)

print(response.text)
```

## Loading Images from Cloud Storage

For production applications, images are usually stored in Cloud Storage. You can reference them directly by URI.

```python
# Reference an image in Cloud Storage
image_part = types.Part.from_uri(
    file_uri="gs://your-bucket/images/architecture-diagram.png",
    mime_type="image/png"
)

# Ask the model to analyze the architecture diagram
response = client.models.generate_content(
    model=model,
    contents=[
        image_part,
        "Describe this architecture diagram in detail. "
        "List all the components, their connections, and any potential "
        "single points of failure you can identify."
    ]
)

print(response.text)
```

## Multiple Images in One Request

You can send multiple images in a single request for comparison or batch analysis. This is useful for before/after comparisons, multi-page documents, or analyzing a set of related images.

Here is how to compare two images:

```python
# Load two dashboard screenshots for comparison
before_image = image_part_from_file("dashboard-before.png")
after_image = image_part_from_file("dashboard-after.png")

# Ask the model to compare them
response = client.models.generate_content(
    model=model,
    contents=[
        "Here are two monitoring dashboard screenshots taken at different times.",
        before_image,
        "This is the BEFORE screenshot (from Monday).",
        after_image,
        "This is the AFTER screenshot (from Friday).",
        "Compare these two dashboards and describe what changed. "
        "Are there any trends or concerns visible?"
    ]
)

print(response.text)
```

## Extracting Structured Data from Images

One of the most practical uses is extracting structured data from images - receipts, invoices, business cards, or screenshots.

This code extracts data from a receipt image into JSON:

```python
from google.genai import types

# Configure JSON output
json_config = types.GenerateContentConfig(
    response_mime_type="application/json",
    response_schema={
        "type": "OBJECT",
        "properties": {
            "store_name": {"type": "STRING"},
            "date": {"type": "STRING"},
            "items": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "name": {"type": "STRING"},
                        "quantity": {"type": "INTEGER"},
                        "price": {"type": "NUMBER"}
                    },
                    "required": ["name", "quantity", "price"]
                }
            },
            "subtotal": {"type": "NUMBER"},
            "tax": {"type": "NUMBER"},
            "total": {"type": "NUMBER"}
        },
        "required": ["store_name", "date", "items", "subtotal", "tax", "total"]
    }
)

receipt_image = image_part_from_file("receipt.jpg")

response = client.models.generate_content(
    model=model,
    contents=[receipt_image, "Extract all information from this receipt."],
    config=json_config
)

import json
receipt_data = json.loads(response.text)
print(f"Store: {receipt_data['store_name']}")
print(f"Total: ${receipt_data['total']}")
```

## Building a Visual QA System

A visual question-answering system lets users upload images and ask questions about them in a conversation. The chat interface works naturally with multimodal inputs.

```python
# Create a chat session for interactive visual QA
chat = client.chats.create(model=model)

# User uploads an image and asks about it
diagram = image_part_from_file("network-diagram.png")
response = chat.send_message([
    diagram,
    "I have uploaded our network architecture diagram. "
    "Can you help me understand it?"
])
print(response.text)

# Follow-up questions use the same context
response = chat.send_message(
    "What load balancing strategy is this diagram showing?"
)
print(response.text)

# Another follow-up
response = chat.send_message(
    "If the primary database fails, what is the failover path?"
)
print(response.text)
```

## Processing Charts and Graphs

Gemini can read charts, graphs, and data visualizations with reasonable accuracy. This is useful for automated report analysis.

```python
# Analyze a chart from a monitoring tool
chart_image = image_part_from_file("cpu-usage-chart.png")

response = client.models.generate_content(
    model=model,
    contents=[
        chart_image,
        "Analyze this CPU usage chart and answer:\n"
        "1. What is the overall trend?\n"
        "2. Are there any spikes or anomalies?\n"
        "3. What time periods show the highest usage?\n"
        "4. Based on this pattern, predict what the next 24 hours might look like.\n"
        "5. Should we consider scaling up? Why or why not?"
    ]
)

print(response.text)
```

## Batch Image Processing

For processing many images, build a pipeline that handles them efficiently.

```python
import os
from concurrent.futures import ThreadPoolExecutor

def analyze_image(image_path, prompt):
    """Analyze a single image with Gemini."""
    try:
        image = image_part_from_file(image_path)
        response = client.models.generate_content(
            model=model,
            contents=[image, prompt]
        )
        return {
            "file": image_path,
            "analysis": response.text,
            "status": "success"
        }
    except Exception as e:
        return {
            "file": image_path,
            "error": str(e),
            "status": "failed"
        }

# Process a directory of images
image_dir = "screenshots/"
image_files = [
    os.path.join(image_dir, f)
    for f in os.listdir(image_dir)
    if f.endswith((".png", ".jpg", ".jpeg"))
]

analysis_prompt = (
    "Describe what is shown in this screenshot. "
    "Identify any errors, warnings, or issues visible."
)

# Process images in parallel with rate limiting
results = []
with ThreadPoolExecutor(max_workers=5) as executor:
    futures = [
        executor.submit(analyze_image, img, analysis_prompt)
        for img in image_files
    ]
    for future in futures:
        results.append(future.result())

# Report results
for r in results:
    print(f"{r['file']}: {r.get('analysis', r.get('error', 'unknown'))[:100]}")
```

## Image and Text Content Moderation

Combine image and text analysis for content moderation. The model can flag inappropriate images, check for brand consistency, or verify that uploaded images match their descriptions.

```python
import json

def moderate_user_upload(image_path, user_description):
    """Check if an uploaded image matches its description and is appropriate."""
    image = image_part_from_file(image_path)

    response = client.models.generate_content(
        model=model,
        contents=[
            image,
            f"User description: '{user_description}'\n\n"
            "Evaluate this image upload:\n"
            "1. Does the image match the user's description? (yes/no)\n"
            "2. Is the image appropriate for a professional platform? (yes/no)\n"
            "3. Does the image contain any text? If so, what does it say?\n"
            "4. Confidence level in your assessment (high/medium/low)"
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema={
                "type": "OBJECT",
                "properties": {
                    "matches_description": {"type": "BOOLEAN"},
                    "appropriate": {"type": "BOOLEAN"},
                    "text_found": {"type": "STRING"},
                    "confidence": {"type": "STRING"}
                },
                "required": [
                    "matches_description",
                    "appropriate",
                    "text_found",
                    "confidence"
                ]
            }
        )
    )

    return json.loads(response.text)

# Example usage
result = moderate_user_upload(
    "user-upload.jpg",
    "Photo of our team meeting"
)
print(f"Matches description: {result.get('matches_description')}")
print(f"Appropriate: {result.get('appropriate')}")
```

## Handling Image Processing Errors

Not every image will process successfully. Images might be corrupt, too large, or in unsupported formats. Handle these cases gracefully.

```python
import os
from google.genai import errors

def safe_image_analysis(image_path, prompt):
    """Analyze an image with proper error handling."""
    # Check file size - Gemini has limits on image size
    file_size = os.path.getsize(image_path)
    max_size = 7 * 1024 * 1024  # 7MB limit for inline image data

    if file_size > max_size:
        return {"error": f"Image too large: {file_size/1024/1024:.1f}MB (max 7MB)"}

    try:
        image = image_part_from_file(image_path)
        response = client.models.generate_content(
            model=model,
            contents=[image, prompt]
        )
        return {"result": response.text}
    except errors.APIError as e:
        if e.code == 400:
            return {"error": f"Invalid image request: {e.message}"}
        if e.code == 429:
            return {"error": "Rate limit exceeded. Try again later."}
        return {"error": f"Gemini API error {e.code}: {e.message}"}
    except ValueError as e:
        return {"error": f"Invalid image format: {str(e)}"}
    except Exception as e:
        return {"error": f"Unexpected error: {str(e)}"}
```

## Wrapping Up

Multimodal analysis with Gemini opens up a range of practical applications - from document processing to visual QA to content moderation. The key advantage is simplicity: you send images and text together in one request, and the model reasons over both. Start with simple image description tasks, then build up to structured extraction and batch processing. Track your image processing pipeline's health with monitoring tools like OneUptime to catch failures early and maintain quality.
