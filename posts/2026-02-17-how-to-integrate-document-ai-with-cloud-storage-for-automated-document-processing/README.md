# How to Integrate Document AI with Cloud Storage for Automated Document Processing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Document AI, Cloud Storage, Automation, Event-Driven Architecture

Description: Learn how to build an automated document processing pipeline by integrating Google Cloud Document AI with Cloud Storage using event-driven triggers and Cloud Functions.

---

The real power of Document AI appears when you stop processing documents manually and let the system handle them automatically. The pattern is simple: a document lands in a Cloud Storage bucket, an event triggers a Cloud Function, the function sends the document to Document AI for processing, and the results get stored wherever you need them. No human intervention required for the happy path.

In this guide, I will show you how to build this end-to-end automated pipeline step by step.

## Architecture Overview

Here is the flow we are building:

```mermaid
graph LR
    A[Document Upload] --> B[Cloud Storage Bucket]
    B --> C[Eventarc Trigger]
    C --> D[Cloud Function]
    D --> E[Document AI Processor]
    E --> F[Processed Results]
    F --> G[Output Bucket / Firestore / BigQuery]
```

When a file is uploaded to the input bucket, Eventarc detects the event and triggers a Cloud Function. The function reads the document from Cloud Storage, sends it to Document AI, and writes the structured results to your destination of choice.

## Step 1: Create Cloud Storage Buckets

Set up separate buckets for input documents and processed results.

```bash
# Create the input bucket where documents will be uploaded
gsutil mb -l us-central1 gs://my-project-doc-input/

# Create the output bucket for processed results
gsutil mb -l us-central1 gs://my-project-doc-output/

# Create a folder structure for organization
gsutil cp /dev/null gs://my-project-doc-input/invoices/
gsutil cp /dev/null gs://my-project-doc-input/forms/
gsutil cp /dev/null gs://my-project-doc-input/receipts/
```

## Step 2: Create the Document AI Processor

If you do not have a processor yet, create one.

```python
from google.cloud import documentai_v1

def create_processor(project_id, location="us"):
    """Create a Document AI processor for the pipeline."""
    client = documentai_v1.DocumentProcessorServiceClient()
    parent = f"projects/{project_id}/locations/{location}"

    processor = client.create_processor(
        parent=parent,
        processor=documentai_v1.Processor(
            display_name="automated-doc-processor",
            type_="FORM_PARSER_PROCESSOR"
        )
    )

    processor_id = processor.name.split("/")[-1]
    print(f"Processor created with ID: {processor_id}")
    return processor_id
```

## Step 3: Write the Cloud Function

This is the core of the pipeline. The Cloud Function processes each uploaded document.

```python
# main.py
import json
import os
from datetime import datetime
from google.cloud import documentai_v1, storage, firestore

# Configuration from environment variables
PROJECT_ID = os.environ.get("GCP_PROJECT", "my-gcp-project")
LOCATION = os.environ.get("DOCAI_LOCATION", "us")
PROCESSOR_ID = os.environ.get("DOCAI_PROCESSOR_ID", "abc123")
OUTPUT_BUCKET = os.environ.get("OUTPUT_BUCKET", "my-project-doc-output")

# Supported MIME types
MIME_TYPE_MAP = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".tiff": "image/tiff",
    ".tif": "image/tiff",
    ".gif": "image/gif",
    ".bmp": "image/bmp",
}

import functions_framework

@functions_framework.cloud_event
def process_document(cloud_event):
    """Triggered when a document is uploaded to Cloud Storage."""
    data = cloud_event.data

    bucket_name = data["bucket"]
    file_name = data["name"]

    # Get the file extension to determine MIME type
    ext = os.path.splitext(file_name)[1].lower()

    if ext not in MIME_TYPE_MAP:
        print(f"Unsupported file type: {ext}. Skipping {file_name}")
        return

    mime_type = MIME_TYPE_MAP[ext]
    print(f"Processing: gs://{bucket_name}/{file_name} ({mime_type})")

    # Initialize Document AI client
    docai_client = documentai_v1.DocumentProcessorServiceClient()
    processor_name = (
        f"projects/{PROJECT_ID}/locations/{LOCATION}"
        f"/processors/{PROCESSOR_ID}"
    )

    # Reference the document in Cloud Storage
    gcs_document = documentai_v1.GcsDocument(
        gcs_uri=f"gs://{bucket_name}/{file_name}",
        mime_type=mime_type
    )

    # Process the document
    request = documentai_v1.ProcessRequest(
        name=processor_name,
        gcs_document=gcs_document
    )

    try:
        result = docai_client.process_document(request=request)
        document = result.document
    except Exception as e:
        print(f"Error processing {file_name}: {e}")
        # Move the file to an error folder
        move_to_error_folder(bucket_name, file_name)
        return

    # Extract structured data
    extracted_data = extract_data(document, file_name)

    # Save results to Cloud Storage
    save_results_to_gcs(extracted_data, file_name)

    # Save results to Firestore
    save_results_to_firestore(extracted_data, file_name)

    print(f"Successfully processed {file_name}")

def extract_data(document, source_file):
    """Extract structured data from the processed document."""
    data = {
        "source_file": source_file,
        "processed_at": datetime.utcnow().isoformat(),
        "page_count": len(document.pages),
        "text_length": len(document.text),
        "entities": [],
        "form_fields": [],
        "tables": []
    }

    # Extract entities
    for entity in document.entities:
        data["entities"].append({
            "type": entity.type_,
            "value": entity.mention_text,
            "confidence": round(entity.confidence, 3)
        })

    # Extract form fields from each page
    for page in document.pages:
        for field in page.form_fields:
            name_text = get_text(field.field_name, document.text)
            value_text = get_text(field.field_value, document.text)

            data["form_fields"].append({
                "name": name_text,
                "value": value_text,
                "confidence": round(field.field_value.confidence, 3)
            })

    return data

def get_text(element, full_text):
    """Extract text from a document element."""
    text = ""
    if element and element.text_anchor:
        for segment in element.text_anchor.text_segments:
            start = int(segment.start_index) if segment.start_index else 0
            end = int(segment.end_index)
            text += full_text[start:end]
    return text.strip()

def save_results_to_gcs(data, source_file):
    """Save extraction results as JSON in the output bucket."""
    storage_client = storage.Client()
    bucket = storage_client.bucket(OUTPUT_BUCKET)

    # Create output path mirroring the input path
    output_name = source_file.rsplit(".", 1)[0] + "_extracted.json"
    blob = bucket.blob(output_name)

    blob.upload_from_string(
        json.dumps(data, indent=2),
        content_type="application/json"
    )
    print(f"Results saved to gs://{OUTPUT_BUCKET}/{output_name}")

def save_results_to_firestore(data, source_file):
    """Save extraction results to Firestore for querying."""
    db = firestore.Client()

    doc_id = source_file.replace("/", "_").rsplit(".", 1)[0]
    db.collection("processed_documents").document(doc_id).set(data)
    print(f"Results saved to Firestore: {doc_id}")

def move_to_error_folder(bucket_name, file_name):
    """Move failed documents to an error folder for investigation."""
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)

    source_blob = bucket.blob(file_name)
    error_path = f"errors/{file_name}"

    bucket.copy_blob(source_blob, bucket, error_path)
    source_blob.delete()
    print(f"Moved failed document to gs://{bucket_name}/{error_path}")
```

## Step 4: Deploy the Cloud Function

Create the requirements file and deploy.

```bash
# Create requirements.txt
cat > requirements.txt << 'EOF'
functions-framework==3.*
google-cloud-documentai==2.*
google-cloud-storage==2.*
google-cloud-firestore==2.*
EOF
```

```bash
# Deploy the Cloud Function with an Eventarc trigger
gcloud functions deploy process-document \
  --gen2 \
  --runtime python311 \
  --region us-central1 \
  --source . \
  --entry-point process_document \
  --trigger-event-filters="type=google.cloud.storage.object.v1.finalized" \
  --trigger-event-filters="bucket=my-project-doc-input" \
  --memory 1Gi \
  --timeout 300s \
  --set-env-vars="GCP_PROJECT=my-gcp-project,DOCAI_LOCATION=us,DOCAI_PROCESSOR_ID=abc123,OUTPUT_BUCKET=my-project-doc-output"
```

## Step 5: Test the Pipeline

Upload a test document and verify the pipeline works end to end.

```bash
# Upload a test document
gsutil cp test_invoice.pdf gs://my-project-doc-input/invoices/

# Check the Cloud Function logs
gcloud functions logs read process-document --region us-central1 --limit 20

# Verify output was created
gsutil ls gs://my-project-doc-output/invoices/
```

## Adding Error Handling and Retries

For production robustness, add retry logic and dead-letter handling.

```python
from google.api_core import retry
from google.api_core.exceptions import ResourceExhausted, ServiceUnavailable

# Configure retry for Document AI calls
RETRY_CONFIG = retry.Retry(
    initial=1.0,        # Start with 1 second delay
    maximum=60.0,       # Max 60 seconds between retries
    multiplier=2.0,     # Double the delay each time
    deadline=300.0,     # Give up after 5 minutes
    predicate=retry.if_exception_type(
        ResourceExhausted,
        ServiceUnavailable
    )
)

def process_with_retry(docai_client, request):
    """Process a document with automatic retry on transient errors."""
    return docai_client.process_document(
        request=request,
        retry=RETRY_CONFIG
    )
```

## Monitoring the Pipeline

Set up monitoring to track document processing health.

```bash
# Create a log-based metric for processing errors
gcloud logging metrics create docai-processing-errors \
  --description="Document AI processing errors" \
  --filter='resource.type="cloud_function"
    resource.labels.function_name="process-document"
    severity>=ERROR'

# Create an alert policy
gcloud alpha monitoring policies create \
  --display-name="Document Processing Errors" \
  --condition-display-name="Error rate too high" \
  --condition-filter='metric.type="logging.googleapis.com/user/docai-processing-errors"' \
  --condition-threshold-value=5 \
  --condition-threshold-duration=300s
```

## Wrapping Up

Integrating Document AI with Cloud Storage creates a hands-off document processing pipeline that scales with your document volume. The event-driven architecture means documents are processed within seconds of upload, and the Cloud Function handles all the orchestration. By storing results in both Cloud Storage (for archival) and Firestore (for querying), you have flexible access patterns for downstream applications. Add monitoring and error handling to make it production-ready, and you have a system that can process thousands of documents per day without any manual intervention.
