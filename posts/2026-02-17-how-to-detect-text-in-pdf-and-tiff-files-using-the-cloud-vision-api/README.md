# How to Detect Text in PDF and TIFF Files Using the Cloud Vision API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Vision API, PDF OCR, TIFF Processing, Document AI

Description: Learn how to extract text from multi-page PDF and TIFF documents using Google Cloud Vision API async batch annotation for large-scale document processing.

---

Processing PDFs and TIFFs for text extraction is a common requirement in document digitization, invoice processing, and record management. Unlike single images, PDFs and TIFFs can have hundreds of pages, so you need an approach that handles multi-page documents efficiently. Cloud Vision API provides an asynchronous batch annotation feature specifically designed for this use case.

In this guide, I will show you how to set up async document processing, handle the results, and build a practical document text extraction pipeline.

## Why Async Processing?

Single-image Vision API calls are synchronous - you send an image, wait a few seconds, and get the result. That works fine for one-off images, but PDFs can have hundreds of pages. Processing them synchronously would mean extremely long request times and potential timeouts.

The async batch annotation API works differently. You submit the document, the API processes it in the background, and writes the results to Cloud Storage as JSON files. Your code can then read those results when they are ready. This handles documents up to 2000 pages.

## Prerequisites

You need a Cloud Storage bucket to store both your input documents and the API output:

```bash
# Enable the Vision API
gcloud services enable vision.googleapis.com

# Create buckets for input and output
gsutil mb -l us-central1 gs://your-documents-bucket
gsutil mb -l us-central1 gs://your-ocr-output-bucket

# Install the Python client
pip install google-cloud-vision google-cloud-storage
```

## Processing a PDF Document

Here is how to submit a PDF for text extraction:

```python
from google.cloud import vision
import json

def extract_text_from_pdf(gcs_source_uri, gcs_destination_uri):
    """Extract text from a PDF stored in Cloud Storage."""
    client = vision.ImageAnnotatorClient()

    # Configure the input - the PDF in GCS
    gcs_source = vision.GcsSource(uri=gcs_source_uri)

    # Set MIME type based on file format
    # Use "application/pdf" for PDFs, "image/tiff" for TIFFs
    input_config = vision.InputConfig(
        gcs_source=gcs_source,
        mime_type="application/pdf",
    )

    # Configure the output - where results will be written
    gcs_destination = vision.GcsDestination(uri=gcs_destination_uri)

    # batch_size controls how many pages per output JSON file
    output_config = vision.OutputConfig(
        gcs_destination=gcs_destination,
        batch_size=5,  # 5 pages per output file
    )

    # Request document text detection on the PDF
    feature = vision.Feature(type_=vision.Feature.Type.DOCUMENT_TEXT_DETECTION)

    async_request = vision.AsyncAnnotateFileRequest(
        features=[feature],
        input_config=input_config,
        output_config=output_config,
    )

    # Submit the async operation
    operation = client.async_batch_annotate_files(requests=[async_request])

    print("Waiting for operation to complete...")
    result = operation.result(timeout=600)

    print("Processing complete!")
    print(f"Output written to: {gcs_destination_uri}")

    return result

# Process a PDF
extract_text_from_pdf(
    gcs_source_uri="gs://your-documents-bucket/invoices/invoice-2024.pdf",
    gcs_destination_uri="gs://your-ocr-output-bucket/invoices/invoice-2024/",
)
```

## Reading the Output

The API writes results as JSON files to your output bucket. Here is how to read them:

```python
from google.cloud import storage, vision
import json

def read_ocr_output(bucket_name, prefix):
    """Read OCR output JSON files from Cloud Storage."""
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)

    # List all output files with the given prefix
    blobs = list(bucket.list_blobs(prefix=prefix))
    blobs = [b for b in blobs if b.name.endswith(".json")]

    # Sort by name to maintain page order
    blobs.sort(key=lambda b: b.name)

    all_text = []

    for blob in blobs:
        print(f"Reading: {blob.name}")

        # Download and parse the JSON output
        json_string = blob.download_as_text()
        response = json.loads(json_string)

        # Each output file contains responses for a batch of pages
        for page_response in response.get("responses", []):
            annotation = page_response.get("fullTextAnnotation", {})
            page_text = annotation.get("text", "")

            if page_text:
                all_text.append(page_text)

            # You can also access structured data
            pages = annotation.get("pages", [])
            for page in pages:
                width = page.get("width", 0)
                height = page.get("height", 0)
                confidence = page.get("confidence", 0)
                print(f"  Page: {width}x{height}, confidence: {confidence:.2f}")

    # Combine all pages into one text
    full_text = "\n\n--- Page Break ---\n\n".join(all_text)
    return full_text

# Read the results
text = read_ocr_output(
    bucket_name="your-ocr-output-bucket",
    prefix="invoices/invoice-2024/"
)
print(text[:2000])  # Print first 2000 characters
```

## Processing TIFF Files

TIFF processing works exactly the same way, just change the MIME type:

```python
def extract_text_from_tiff(gcs_source_uri, gcs_destination_uri):
    """Extract text from a multi-page TIFF stored in GCS."""
    client = vision.ImageAnnotatorClient()

    gcs_source = vision.GcsSource(uri=gcs_source_uri)

    # Use image/tiff for TIFF files
    input_config = vision.InputConfig(
        gcs_source=gcs_source,
        mime_type="image/tiff",
    )

    gcs_destination = vision.GcsDestination(uri=gcs_destination_uri)
    output_config = vision.OutputConfig(
        gcs_destination=gcs_destination,
        batch_size=5,
    )

    feature = vision.Feature(type_=vision.Feature.Type.DOCUMENT_TEXT_DETECTION)

    async_request = vision.AsyncAnnotateFileRequest(
        features=[feature],
        input_config=input_config,
        output_config=output_config,
    )

    operation = client.async_batch_annotate_files(requests=[async_request])

    print("Processing TIFF file...")
    result = operation.result(timeout=600)
    print("Done!")

    return result
```

## Batch Processing Multiple Documents

When you have many documents to process, submit them as a batch:

```python
from google.cloud import vision

def batch_process_documents(documents):
    """
    Process multiple PDF/TIFF documents in a single batch.

    documents: list of dicts with 'source_uri', 'output_uri', and 'mime_type'
    """
    client = vision.ImageAnnotatorClient()

    requests = []
    for doc in documents:
        gcs_source = vision.GcsSource(uri=doc["source_uri"])
        input_config = vision.InputConfig(
            gcs_source=gcs_source,
            mime_type=doc["mime_type"],
        )

        gcs_destination = vision.GcsDestination(uri=doc["output_uri"])
        output_config = vision.OutputConfig(
            gcs_destination=gcs_destination,
            batch_size=10,
        )

        feature = vision.Feature(type_=vision.Feature.Type.DOCUMENT_TEXT_DETECTION)

        requests.append(
            vision.AsyncAnnotateFileRequest(
                features=[feature],
                input_config=input_config,
                output_config=output_config,
            )
        )

    # Submit all documents at once (max 5 per batch call)
    operation = client.async_batch_annotate_files(requests=requests)

    print(f"Submitted {len(requests)} documents for processing...")
    result = operation.result(timeout=1200)
    print("All documents processed!")

    return result

# Process multiple documents
docs = [
    {
        "source_uri": "gs://your-documents-bucket/doc1.pdf",
        "output_uri": "gs://your-ocr-output-bucket/doc1/",
        "mime_type": "application/pdf",
    },
    {
        "source_uri": "gs://your-documents-bucket/doc2.tiff",
        "output_uri": "gs://your-ocr-output-bucket/doc2/",
        "mime_type": "image/tiff",
    },
    {
        "source_uri": "gs://your-documents-bucket/doc3.pdf",
        "output_uri": "gs://your-ocr-output-bucket/doc3/",
        "mime_type": "application/pdf",
    },
]

batch_process_documents(docs)
```

## Extracting Structured Data from Pages

The output includes detailed structural information - blocks, paragraphs, words, and symbols with their positions. This is useful for extracting specific fields from forms or invoices:

```python
def extract_structured_data(json_content):
    """Parse structured text data from Vision API output."""
    response = json.loads(json_content)

    for page_response in response.get("responses", []):
        annotation = page_response.get("fullTextAnnotation", {})

        for page in annotation.get("pages", []):
            page_width = page.get("width", 0)
            page_height = page.get("height", 0)

            for block in page.get("blocks", []):
                block_type = block.get("blockType", "")
                confidence = block.get("confidence", 0)

                # Get the bounding box for this block
                box = block.get("boundingBox", {}).get("normalizedVertices", [])

                # Reconstruct text from paragraphs and words
                block_text = ""
                for paragraph in block.get("paragraphs", []):
                    for word in paragraph.get("words", []):
                        word_text = "".join(
                            symbol.get("text", "")
                            for symbol in word.get("symbols", [])
                        )
                        block_text += word_text + " "

                # Use position to identify fields
                # For example, text in the top-right might be a date or invoice number
                if box:
                    x = box[0].get("x", 0)
                    y = box[0].get("y", 0)
                    print(f"Block at ({x:.2f}, {y:.2f}): {block_text.strip()[:80]}")
```

## Handling Large Documents

For documents over 100 pages, consider these optimizations:

- Use a larger batch_size (up to 100 pages per output file) to reduce the number of output files
- Process results as they become available rather than waiting for the full document
- Set appropriate timeouts - a 500-page PDF can take several minutes

```python
def process_large_document(gcs_source_uri, gcs_destination_uri, timeout=1800):
    """Process a large document with extended timeout and larger batches."""
    client = vision.ImageAnnotatorClient()

    input_config = vision.InputConfig(
        gcs_source=vision.GcsSource(uri=gcs_source_uri),
        mime_type="application/pdf",
    )

    # Use larger batch size to reduce output file count
    output_config = vision.OutputConfig(
        gcs_destination=vision.GcsDestination(uri=gcs_destination_uri),
        batch_size=50,  # 50 pages per output file
    )

    feature = vision.Feature(type_=vision.Feature.Type.DOCUMENT_TEXT_DETECTION)

    request = vision.AsyncAnnotateFileRequest(
        features=[feature],
        input_config=input_config,
        output_config=output_config,
    )

    operation = client.async_batch_annotate_files(requests=[request])

    # Extended timeout for large documents
    print(f"Processing large document (timeout: {timeout}s)...")
    result = operation.result(timeout=timeout)
    print("Complete!")

    return result
```

## Wrapping Up

Cloud Vision API's async batch annotation makes PDF and TIFF text extraction straightforward, even for large documents with hundreds of pages. The key is using the async API instead of trying to process pages individually, structuring your output in Cloud Storage for easy retrieval, and handling the JSON output files in the right order.

If you are building a document processing pipeline that needs to be reliable and monitored, [OneUptime](https://oneuptime.com) can help you track the health of your processing functions and alert you when jobs fail or take longer than expected.
