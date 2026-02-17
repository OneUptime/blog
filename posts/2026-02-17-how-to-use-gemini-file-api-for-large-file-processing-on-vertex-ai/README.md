# How to Use Gemini File API for Large File Processing on Vertex AI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Gemini, Vertex AI, File API, Large File Processing

Description: Learn how to use the Gemini File API on Vertex AI to upload, manage, and process large files including videos, audio, and documents for AI analysis.

---

When you need to process files that are too large to send inline with your API requests, the Gemini File API is the answer. It lets you upload files separately, get a reference URI, and then use that reference in your Gemini requests. This is essential for video analysis, long audio transcription, and large document processing.

I use the File API regularly for processing video content and large PDF collections. It simplifies the workflow considerably compared to managing file uploads yourself. Let me walk you through how it works.

## Why Use the File API?

Gemini's standard API accepts inline data up to a certain size limit. For anything larger - videos, long audio files, or collections of documents - you need the File API. It handles the upload, stores the file temporarily, and gives you a URI that you can reference in subsequent API calls.

The File API stores files for up to 48 hours by default. You do not need to manage storage yourself, though you can delete files earlier if you want to clean up.

## Uploading a File

The upload process is straightforward. You specify the file path and MIME type, and the API returns a file reference.

This code uploads a video file for analysis:

```python
import vertexai
from vertexai.generative_models import GenerativeModel, Part
from google.cloud import aiplatform

# Initialize Vertex AI
vertexai.init(project="your-project-id", location="us-central1")

# Upload a video file using the File API
# For Vertex AI, we typically use Cloud Storage URIs
from google.cloud import storage

def upload_file_to_gcs(local_path, bucket_name, destination_blob):
    """Upload a file to Cloud Storage for use with Gemini."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(destination_blob)
    blob.upload_from_filename(local_path)
    return f"gs://{bucket_name}/{destination_blob}"

# Upload a large video file
gcs_uri = upload_file_to_gcs(
    "product-demo.mp4",
    "your-media-bucket",
    "uploads/product-demo.mp4"
)

print(f"File uploaded to: {gcs_uri}")

# Now use the file in a Gemini request
model = GenerativeModel("gemini-2.0-flash")

video_part = Part.from_uri(uri=gcs_uri, mime_type="video/mp4")

response = model.generate_content([
    video_part,
    "Analyze this product demo video. Describe what is being demonstrated, "
    "identify the key features shown, and note any usability issues you observe."
])

print(response.text)
```

## Processing Video Files

Video analysis is one of the primary use cases for the File API. Gemini can understand video content including visual elements, text on screen, and audio.

```python
def analyze_video(gcs_uri, analysis_type="general"):
    """Analyze a video with different analysis modes."""
    model = GenerativeModel("gemini-2.0-flash")

    video_part = Part.from_uri(uri=gcs_uri, mime_type="video/mp4")

    prompts = {
        "general": (
            "Provide a comprehensive analysis of this video including: "
            "main content, key moments, visual quality, and overall message."
        ),
        "transcript": (
            "Transcribe all spoken words in this video. "
            "Include timestamps for each speaker change."
        ),
        "summary": (
            "Create a concise summary of this video in 5 bullet points. "
            "Focus on the main takeaways."
        ),
        "accessibility": (
            "Generate audio description text for this video. "
            "Describe visual elements that would help a visually "
            "impaired viewer understand the content."
        )
    }

    prompt = prompts.get(analysis_type, prompts["general"])
    response = model.generate_content([video_part, prompt])
    return response.text

# Analyze the same video in different ways
for mode in ["general", "summary", "transcript"]:
    print(f"\n=== {mode.upper()} ===")
    result = analyze_video(gcs_uri, mode)
    print(result[:500])
```

## Processing Audio Files

Long audio files benefit from the File API as well. Gemini handles audio analysis including transcription, speaker identification, and content analysis.

```python
# Upload an audio file
audio_uri = upload_file_to_gcs(
    "meeting-recording.mp3",
    "your-media-bucket",
    "uploads/meeting-recording.mp3"
)

audio_part = Part.from_uri(uri=audio_uri, mime_type="audio/mp3")

# Transcribe and analyze the meeting
response = model.generate_content([
    audio_part,
    "Transcribe this meeting recording and provide:\n"
    "1. Full transcript with speaker labels\n"
    "2. Meeting summary\n"
    "3. Action items identified\n"
    "4. Key decisions made"
])

print(response.text)
```

## Managing Uploaded Files

Keep track of your uploaded files and clean them up when you are done to manage storage costs.

```python
class FileManager:
    """Manage files uploaded for Gemini processing."""

    def __init__(self, bucket_name):
        self.bucket_name = bucket_name
        self.client = storage.Client()
        self.bucket = self.client.bucket(bucket_name)
        self.uploaded_files = []

    def upload(self, local_path, destination=None):
        """Upload a file and track it."""
        if destination is None:
            filename = local_path.split("/")[-1]
            destination = f"gemini-uploads/{filename}"

        blob = self.bucket.blob(destination)
        blob.upload_from_filename(local_path)

        uri = f"gs://{self.bucket_name}/{destination}"
        self.uploaded_files.append({
            "local_path": local_path,
            "gcs_uri": uri,
            "blob_name": destination
        })

        return uri

    def delete(self, gcs_uri):
        """Delete a specific uploaded file."""
        blob_name = gcs_uri.replace(f"gs://{self.bucket_name}/", "")
        blob = self.bucket.blob(blob_name)
        blob.delete()
        self.uploaded_files = [
            f for f in self.uploaded_files if f["gcs_uri"] != gcs_uri
        ]

    def cleanup_all(self):
        """Delete all tracked uploaded files."""
        for file_info in self.uploaded_files:
            try:
                blob_name = file_info["blob_name"]
                blob = self.bucket.blob(blob_name)
                blob.delete()
            except Exception as e:
                print(f"Failed to delete {file_info['gcs_uri']}: {e}")
        self.uploaded_files = []

    def list_files(self):
        """List all tracked uploaded files."""
        for f in self.uploaded_files:
            print(f"  {f['gcs_uri']}")

# Usage
fm = FileManager("your-media-bucket")

# Upload files
video_uri = fm.upload("presentation.mp4")
audio_uri = fm.upload("narration.mp3")
doc_uri = fm.upload("slides.pdf")

# Process files with Gemini...

# Clean up when done
fm.cleanup_all()
```

## Processing Large PDF Collections

For document processing at scale, upload multiple PDFs and process them in sequence or batch.

```python
import os

def process_pdf_collection(pdf_directory, bucket_name, analysis_prompt):
    """Process a collection of PDFs through Gemini."""
    fm = FileManager(bucket_name)
    model_instance = GenerativeModel("gemini-2.0-flash")
    results = []

    # Get all PDF files
    pdf_files = [
        os.path.join(pdf_directory, f)
        for f in os.listdir(pdf_directory)
        if f.endswith(".pdf")
    ]

    print(f"Processing {len(pdf_files)} PDF files...")

    for pdf_path in pdf_files:
        try:
            # Upload to GCS
            uri = fm.upload(pdf_path)

            # Create a part from the GCS URI
            pdf_part = Part.from_uri(uri=uri, mime_type="application/pdf")

            # Analyze with Gemini
            response = model_instance.generate_content([
                pdf_part,
                analysis_prompt
            ])

            results.append({
                "file": pdf_path,
                "analysis": response.text,
                "status": "success"
            })

        except Exception as e:
            results.append({
                "file": pdf_path,
                "error": str(e),
                "status": "failed"
            })

    # Clean up uploaded files
    fm.cleanup_all()

    return results

# Process all invoices
results = process_pdf_collection(
    pdf_directory="invoices/",
    bucket_name="your-media-bucket",
    analysis_prompt=(
        "Extract the following from this invoice: "
        "vendor name, invoice number, date, line items, and total amount. "
        "Return as JSON."
    )
)
```

## Handling Large Image Sets

The File API is useful for processing large batches of images too, especially when they are high resolution.

```python
def analyze_image_batch(image_uris, prompt):
    """Analyze a batch of images together."""
    model_instance = GenerativeModel("gemini-2.0-flash")

    parts = [f"I am providing {len(image_uris)} images for analysis.\n\n"]

    for i, uri in enumerate(image_uris, 1):
        # Determine MIME type from extension
        ext = uri.rsplit(".", 1)[-1].lower()
        mime_map = {"jpg": "image/jpeg", "jpeg": "image/jpeg",
                    "png": "image/png", "gif": "image/gif"}
        mime_type = mime_map.get(ext, "image/jpeg")

        parts.append(f"Image {i}:")
        parts.append(Part.from_uri(uri=uri, mime_type=mime_type))

    parts.append(f"\n{prompt}")

    response = model_instance.generate_content(parts)
    return response.text

# Analyze a set of product images
image_uris = [
    "gs://your-bucket/products/item-001.jpg",
    "gs://your-bucket/products/item-002.jpg",
    "gs://your-bucket/products/item-003.jpg",
]

analysis = analyze_image_batch(
    image_uris,
    "Compare these product images. Are they consistent in style? "
    "Note any quality issues or inconsistencies."
)
print(analysis)
```

## Setting Up Lifecycle Policies

For production systems, set up lifecycle policies on your Cloud Storage bucket to automatically clean up old uploads.

```python
def setup_lifecycle_policy(bucket_name, max_age_days=2):
    """Set up automatic cleanup for uploaded files."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    bucket.reload()

    # Add a lifecycle rule to delete files after N days
    rule = {
        "action": {"type": "Delete"},
        "condition": {
            "age": max_age_days,
            "matchesPrefix": ["gemini-uploads/"]
        }
    }

    rules = list(bucket.lifecycle_rules)
    rules.append(rule)
    bucket.lifecycle_rules = rules
    bucket.patch()

    print(f"Lifecycle policy set: files in gemini-uploads/ deleted after {max_age_days} days")

# Set up auto-cleanup
setup_lifecycle_policy("your-media-bucket", max_age_days=2)
```

## Wrapping Up

The Gemini File API (via Cloud Storage on Vertex AI) extends what you can process with Gemini to large files - videos, long audio recordings, and large document collections. The pattern is simple: upload to Cloud Storage, reference by URI, process with Gemini, and clean up. Build a file manager to track uploads, set up lifecycle policies for automatic cleanup, and handle errors gracefully. Monitor your file processing pipeline with tools like OneUptime to track success rates and processing times across your media analysis workloads.
