# How to Process Documents with Google Cloud Document AI OCR Processor

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Document AI, OCR, Document Processing, Machine Learning

Description: Learn how to use Google Cloud Document AI OCR Processor to extract text from scanned documents, PDFs, and images with high accuracy and structured output.

---

Dealing with scanned documents, PDFs, and images that contain text is a common headache. Traditional OCR tools often produce messy output that requires significant cleanup. Google Cloud Document AI takes a different approach - it combines optical character recognition with machine learning to not only extract text but also understand the document's structure, including paragraphs, tables, and form fields.

In this guide, I will walk you through setting up and using the Document AI OCR Processor to extract text from various document types.

## What Makes Document AI Different from Basic OCR

Standard OCR just converts pixel patterns to characters. Document AI goes further:

- It preserves document layout and structure
- It identifies paragraphs, headings, and blocks
- It detects tables and their cell contents
- It recognizes form fields and checkboxes
- It provides confidence scores for each detected element
- It supports over 200 languages

The OCR Processor is the general-purpose processor in Document AI. It works on any document type without needing specialized training.

## Setting Up Document AI

First, enable the Document AI API and create a processor.

```bash
# Enable the Document AI API
gcloud services enable documentai.googleapis.com

# Install the Python client library
pip install google-cloud-documentai
```

You need to create a processor instance. You can do this through the console or via the API.

```python
from google.cloud import documentai_v1

def create_ocr_processor(project_id, location="us"):
    """Create a new OCR processor in Document AI."""
    client = documentai_v1.DocumentProcessorServiceClient()

    # The parent resource where the processor will be created
    parent = f"projects/{project_id}/locations/{location}"

    # Create the processor with the OCR type
    processor = client.create_processor(
        parent=parent,
        processor=documentai_v1.Processor(
            display_name="my-ocr-processor",
            type_="OCR_PROCESSOR"
        )
    )

    print(f"Processor created: {processor.name}")
    return processor

# Replace with your project ID
processor = create_ocr_processor("my-gcp-project")
```

## Processing a Single Document

Here is how to send a document to the OCR Processor and get the extracted text.

```python
from google.cloud import documentai_v1

def process_document(project_id, location, processor_id, file_path, mime_type):
    """Process a single document with the OCR processor."""
    client = documentai_v1.DocumentProcessorServiceClient()

    # Build the processor resource name
    name = f"projects/{project_id}/locations/{location}/processors/{processor_id}"

    # Read the file into memory
    with open(file_path, "rb") as f:
        content = f.read()

    # Create the raw document object
    raw_document = documentai_v1.RawDocument(
        content=content,
        mime_type=mime_type
    )

    # Build the request
    request = documentai_v1.ProcessRequest(
        name=name,
        raw_document=raw_document
    )

    # Send the request and get the result
    result = client.process_document(request=request)
    document = result.document

    print(f"Full text extracted ({len(document.text)} characters):")
    print(document.text[:500])

    return document

# Process a PDF file
document = process_document(
    project_id="my-gcp-project",
    location="us",
    processor_id="abc123def456",
    file_path="invoice.pdf",
    mime_type="application/pdf"
)
```

## Understanding the Document Structure

The response from Document AI is rich with structural information. Here is how to navigate it.

```python
def explore_document_structure(document):
    """Walk through the structural elements of a processed document."""

    # Pages contain the visual layout information
    for page_num, page in enumerate(document.pages):
        print(f"\n--- Page {page_num + 1} ---")
        print(f"Dimensions: {page.dimension.width} x {page.dimension.height}")

        # Paragraphs detected on this page
        print(f"Paragraphs found: {len(page.paragraphs)}")
        for i, paragraph in enumerate(page.paragraphs):
            # Extract the text for this paragraph using layout references
            para_text = get_text_from_layout(paragraph.layout, document.text)
            confidence = paragraph.layout.confidence
            print(f"  Paragraph {i+1} (confidence: {confidence:.2f}): {para_text[:80]}...")

        # Blocks detected on this page
        print(f"Blocks found: {len(page.blocks)}")

        # Lines detected on this page
        print(f"Lines found: {len(page.lines)}")

        # Tables detected on this page
        if page.tables:
            print(f"Tables found: {len(page.tables)}")

def get_text_from_layout(layout, full_text):
    """Extract text corresponding to a layout element using text anchors."""
    text = ""
    for segment in layout.text_anchor.text_segments:
        start = int(segment.start_index)
        end = int(segment.end_index)
        text += full_text[start:end]
    return text.strip()

# Explore the structure
explore_document_structure(document)
```

## Processing Documents from Cloud Storage

For production workflows, documents usually live in Cloud Storage rather than on a local disk.

```python
from google.cloud import documentai_v1

def process_from_gcs(project_id, location, processor_id, gcs_uri, mime_type):
    """Process a document stored in Google Cloud Storage."""
    client = documentai_v1.DocumentProcessorServiceClient()

    name = f"projects/{project_id}/locations/{location}/processors/{processor_id}"

    # Reference the document in GCS instead of reading it locally
    gcs_document = documentai_v1.GcsDocument(
        gcs_uri=gcs_uri,
        mime_type=mime_type
    )

    request = documentai_v1.ProcessRequest(
        name=name,
        gcs_document=gcs_document
    )

    result = client.process_document(request=request)
    return result.document

# Process a file from Cloud Storage
doc = process_from_gcs(
    project_id="my-gcp-project",
    location="us",
    processor_id="abc123def456",
    gcs_uri="gs://my-bucket/documents/scan.pdf",
    mime_type="application/pdf"
)
```

## Batch Processing Multiple Documents

When you have many documents to process, use the batch processing API to handle them asynchronously.

```python
from google.cloud import documentai_v1
import time

def batch_process_documents(project_id, location, processor_id,
                             gcs_input_uri, gcs_output_uri):
    """Process multiple documents in batch mode."""
    client = documentai_v1.DocumentProcessorServiceClient()

    name = f"projects/{project_id}/locations/{location}/processors/{processor_id}"

    # Configure input - a GCS prefix containing multiple documents
    gcs_prefix = documentai_v1.GcsPrefix(gcs_uri_prefix=gcs_input_uri)
    input_config = documentai_v1.BatchDocumentsInputConfig(
        gcs_prefix=gcs_prefix
    )

    # Configure output location for results
    gcs_output = documentai_v1.DocumentOutputConfig.GcsOutputConfig(
        gcs_uri=gcs_output_uri
    )
    output_config = documentai_v1.DocumentOutputConfig(
        gcs_output_config=gcs_output
    )

    # Start the batch operation
    request = documentai_v1.BatchProcessRequest(
        name=name,
        input_documents=input_config,
        document_output_config=output_config
    )

    # This returns a long-running operation
    operation = client.batch_process_documents(request=request)

    print("Batch processing started. Waiting for completion...")

    # Poll for completion
    result = operation.result(timeout=300)
    print("Batch processing complete!")

    return result

# Process all documents in a GCS folder
batch_process_documents(
    project_id="my-gcp-project",
    location="us",
    processor_id="abc123def456",
    gcs_input_uri="gs://my-bucket/input-docs/",
    gcs_output_uri="gs://my-bucket/ocr-results/"
)
```

## Handling Different Document Types

Document AI OCR supports several input formats. Here is a quick reference for the MIME types you will use most often.

| Format | MIME Type |
|--------|-----------|
| PDF | application/pdf |
| TIFF | image/tiff |
| GIF | image/gif |
| JPEG | image/jpeg |
| PNG | image/png |
| BMP | image/bmp |
| WebP | image/webp |

## Extracting Text with Confidence Filtering

Not all OCR output is equally reliable. Use confidence scores to filter out low-quality results.

```python
def extract_high_confidence_text(document, min_confidence=0.85):
    """Only include text blocks that meet the confidence threshold."""
    high_conf_text = []

    for page in document.pages:
        for paragraph in page.paragraphs:
            if paragraph.layout.confidence >= min_confidence:
                text = get_text_from_layout(paragraph.layout, document.text)
                high_conf_text.append(text)

    return "\n".join(high_conf_text)

# Get only high-confidence text
clean_text = extract_high_confidence_text(document, min_confidence=0.9)
print(clean_text)
```

## Wrapping Up

Google Cloud Document AI OCR Processor provides a powerful way to extract text from documents while preserving layout and structure. The combination of high-accuracy OCR with structural understanding means you get usable output without hours of post-processing cleanup. Start with the synchronous API for single documents, and move to batch processing when you need to handle volumes. Use confidence scores to filter noisy results, and always check the structured page elements if you need more than just raw text.
