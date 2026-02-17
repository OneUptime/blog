# How to Set Up Human Review for Document AI Processing Results

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Document AI, Human Review, HITL, Quality Assurance

Description: Learn how to configure and use the Human-in-the-Loop (HITL) review feature in Google Cloud Document AI to validate and correct automated extraction results.

---

Automated document processing is powerful, but it is not perfect. Even the best models will occasionally misread a handwritten field, confuse similar-looking characters, or miss a value in a cluttered layout. For high-stakes processes like financial document processing, medical records, or legal contracts, you need human reviewers to catch and correct these errors. Document AI's Human-in-the-Loop (HITL) feature provides exactly this - a built-in review workflow that routes low-confidence extractions to human operators.

This guide covers how to set up, configure, and integrate HITL review into your Document AI pipeline.

## How Human Review Works

The HITL flow works like this:

1. A document is processed by a Document AI processor
2. The system checks confidence scores against your configured thresholds
3. If any extraction falls below the threshold, the document is routed to a review queue
4. Human reviewers see the original document alongside the extracted data
5. Reviewers correct any mistakes and approve the document
6. The corrected data is returned to your application

You control the confidence threshold, which means you can balance between speed (fewer reviews) and accuracy (more reviews).

## Prerequisites

Before setting up HITL, you need:

- A Document AI processor (any type - OCR, Form Parser, Invoice, etc.)
- The Document AI API enabled
- Appropriate IAM roles for reviewers

```bash
# Enable the Document AI API
gcloud services enable documentai.googleapis.com

# Grant the Document AI reviewer role to your review team
gcloud projects add-iam-policy-binding my-gcp-project \
  --member="group:document-reviewers@mycompany.com" \
  --role="roles/documentai.humanReviewReviewer"
```

## Step 1: Enable Human Review on Your Processor

Human review is configured at the processor level. You can enable it through the console or the API.

```python
from google.cloud import documentai_v1

def enable_human_review(project_id, location, processor_id):
    """Check if human review is enabled for a processor."""
    client = documentai_v1.DocumentProcessorServiceClient()

    processor_name = (
        f"projects/{project_id}/locations/{location}"
        f"/processors/{processor_id}"
    )

    processor = client.get_processor(name=processor_name)

    print(f"Processor: {processor.display_name}")
    print(f"Type: {processor.type_}")

    # Human review config is part of the processor settings
    # It is configured through the Console UI under the processor settings
    # Navigate to: Document AI > Processors > Your Processor > Human Review

    return processor

enable_human_review("my-gcp-project", "us", "my-processor-id")
```

In the Document AI Console:

1. Navigate to your processor
2. Click on "Enable Human Review"
3. Set your confidence threshold (e.g., 0.8)
4. Choose which fields should trigger review when below threshold
5. Save the configuration

## Step 2: Process Documents with Human Review

When sending documents for processing, include the human review configuration in your request.

```python
from google.cloud import documentai_v1

def process_with_human_review(project_id, location, processor_id,
                               file_path, mime_type):
    """Process a document and trigger human review if needed."""
    client = documentai_v1.DocumentProcessorServiceClient()
    name = f"projects/{project_id}/locations/{location}/processors/{processor_id}"

    with open(file_path, "rb") as f:
        content = f.read()

    raw_document = documentai_v1.RawDocument(
        content=content,
        mime_type=mime_type
    )

    # Enable human review in the process request
    request = documentai_v1.ProcessRequest(
        name=name,
        raw_document=raw_document,
        process_options=documentai_v1.ProcessOptions(
            # This tells Document AI to check if human review is needed
            # based on the processor's HITL configuration
        )
    )

    result = client.process_document(request=request)
    document = result.document

    # Check the human review status
    human_review_status = result.human_review_status

    print(f"Human review state: {human_review_status.state}")

    if human_review_status.state == documentai_v1.HumanReviewStatus.State.SKIPPED:
        print("All fields met confidence threshold - no review needed")
    elif human_review_status.state == documentai_v1.HumanReviewStatus.State.IN_PROGRESS:
        print("Document sent to human review queue")
        print(f"Review operation: {human_review_status.human_review_operation}")

    return result

result = process_with_human_review(
    "my-gcp-project", "us", "my-processor-id",
    "unclear_invoice.pdf", "application/pdf"
)
```

## Step 3: Manually Trigger Human Review

Sometimes you want to send a document for review regardless of confidence scores. You can trigger review explicitly.

```python
from google.cloud import documentai_v1

def trigger_manual_review(project_id, location, processor_id,
                           file_path, mime_type):
    """Explicitly send a document for human review."""
    client = documentai_v1.DocumentProcessorServiceClient()

    # First, process the document normally
    processor_name = (
        f"projects/{project_id}/locations/{location}"
        f"/processors/{processor_id}"
    )

    with open(file_path, "rb") as f:
        content = f.read()

    # Process it first to get initial extraction
    raw_document = documentai_v1.RawDocument(
        content=content,
        mime_type=mime_type
    )

    process_request = documentai_v1.ProcessRequest(
        name=processor_name,
        raw_document=raw_document
    )

    process_result = client.process_document(request=process_request)

    # Now send it for human review explicitly
    review_request = documentai_v1.ReviewDocumentRequest(
        human_review_config=(
            f"{processor_name}/humanReviewConfig"
        ),
        inline_document=process_result.document,
        enable_schema_validation=True
    )

    # This is a long-running operation
    operation = client.review_document(request=review_request)
    print(f"Review operation started: {operation.operation.name}")

    return operation

# Force a document into the review queue
operation = trigger_manual_review(
    "my-gcp-project", "us", "my-processor-id",
    "ambiguous_form.pdf", "application/pdf"
)
```

## Step 4: Check Review Status and Get Corrected Results

After a human reviewer processes the document, retrieve the corrected output.

```python
from google.cloud import documentai_v1

def get_review_result(operation_name):
    """Check if a human review is complete and get corrected results."""
    client = documentai_v1.DocumentProcessorServiceClient()
    operations_client = client.transport.operations_client

    operation = operations_client.get_operation(operation_name)

    if not operation.done:
        print("Review still in progress...")
        return None

    if operation.error.code != 0:
        print(f"Review failed: {operation.error.message}")
        return None

    # Deserialize the corrected document
    result = documentai_v1.ReviewDocumentResponse.deserialize(
        operation.response.value
    )

    print("Review complete!")

    # The corrected document is in the response
    # Access it to get the human-verified data
    if result.gcs_destination:
        print(f"Corrected document stored at: {result.gcs_destination}")

    return result

# Poll for completion
result = get_review_result("projects/my-project/locations/us/operations/12345")
```

## Building an End-to-End Review Pipeline

Here is a complete pipeline that processes documents, routes uncertain ones for review, and collects the final results.

```python
from google.cloud import documentai_v1, firestore
import time

db = firestore.Client()

def document_processing_pipeline(project_id, location, processor_id,
                                  file_path, document_id):
    """Complete pipeline with automatic human review routing."""
    client = documentai_v1.DocumentProcessorServiceClient()
    processor_name = f"projects/{project_id}/locations/{location}/processors/{processor_id}"

    # Step 1: Process the document
    with open(file_path, "rb") as f:
        content = f.read()

    raw_document = documentai_v1.RawDocument(
        content=content,
        mime_type="application/pdf"
    )

    result = client.process_document(
        request=documentai_v1.ProcessRequest(
            name=processor_name,
            raw_document=raw_document
        )
    )

    document = result.document

    # Step 2: Check if any field needs review
    needs_review = False
    low_confidence_fields = []

    for entity in document.entities:
        if entity.confidence < 0.8:
            needs_review = True
            low_confidence_fields.append({
                "field": entity.type_,
                "value": entity.mention_text,
                "confidence": round(entity.confidence, 3)
            })

    # Step 3: Store initial results
    record = {
        "document_id": document_id,
        "status": "needs_review" if needs_review else "complete",
        "extracted_fields": {
            entity.type_: {
                "value": entity.mention_text,
                "confidence": round(entity.confidence, 3)
            }
            for entity in document.entities
        },
        "low_confidence_fields": low_confidence_fields
    }

    db.collection("documents").document(document_id).set(record)

    # Step 4: Trigger review if needed
    if needs_review:
        print(f"Document {document_id} sent for human review. "
              f"{len(low_confidence_fields)} fields below threshold.")

        review_request = documentai_v1.ReviewDocumentRequest(
            human_review_config=f"{processor_name}/humanReviewConfig",
            inline_document=document,
            enable_schema_validation=True
        )

        operation = client.review_document(request=review_request)

        # Store the operation name so we can check back later
        db.collection("documents").document(document_id).update({
            "review_operation": operation.operation.name
        })
    else:
        print(f"Document {document_id} processed successfully. "
              f"All fields above confidence threshold.")

    return record
```

## Monitoring Your Review Queue

Keep track of your review queue to ensure documents do not sit unreviewed.

```python
def get_review_queue_stats():
    """Get statistics about the current review queue."""
    docs = (
        db.collection("documents")
        .where("status", "==", "needs_review")
        .stream()
    )

    pending = []
    for doc in docs:
        data = doc.to_dict()
        pending.append({
            "id": doc.id,
            "low_confidence_count": len(data.get("low_confidence_fields", []))
        })

    print(f"Documents awaiting review: {len(pending)}")
    for item in pending[:10]:
        print(f"  {item['id']}: {item['low_confidence_count']} uncertain fields")

    return pending
```

## Wrapping Up

Human-in-the-Loop review is what makes Document AI production-ready for mission-critical workflows. The combination of automated extraction with human verification gives you speed where the model is confident and accuracy where it is not. Set your confidence thresholds based on your tolerance for errors, monitor your review queue to prevent bottlenecks, and use the corrected data to track which document types need the most human intervention. Over time, you can use patterns from human corrections to improve your training data and retrain custom processors, gradually reducing the review burden.
