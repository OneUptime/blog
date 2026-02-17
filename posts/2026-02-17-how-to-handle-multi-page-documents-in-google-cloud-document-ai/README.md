# How to Handle Multi-Page Documents in Google Cloud Document AI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Document AI, Multi-Page Documents, PDF Processing, Document Management

Description: Learn how to process multi-page documents with Google Cloud Document AI, handle page-level results, manage large documents, and work with batch processing for lengthy files.

---

Most real-world documents are not single pages. Contracts run dozens of pages. Financial reports can be hundreds of pages long. Insurance claim packets include multiple forms stapled together. When working with Document AI, handling multi-page documents requires some specific techniques that differ from single-page processing.

In this guide, I will cover the practical aspects of processing multi-page documents - from understanding page limits to splitting large documents and reassembling results.

## Understanding Page Limits

Document AI has different page limits depending on how you process documents:

- **Synchronous (online) processing**: Up to 15 pages per request
- **Batch (offline) processing**: Up to 2,000 pages per document (depending on the processor)
- **File size**: Up to 20MB for synchronous, up to 1GB for batch

If your document exceeds these limits, you will need to split it before processing.

## Processing a Multi-Page Document

Here is how to process a multi-page PDF and access results for each page.

```python
from google.cloud import documentai_v1

def process_multipage_document(project_id, location, processor_id, file_path):
    """Process a multi-page document and access per-page results."""
    client = documentai_v1.DocumentProcessorServiceClient()
    name = f"projects/{project_id}/locations/{location}/processors/{processor_id}"

    with open(file_path, "rb") as f:
        content = f.read()

    raw_document = documentai_v1.RawDocument(
        content=content,
        mime_type="application/pdf"
    )

    request = documentai_v1.ProcessRequest(
        name=name,
        raw_document=raw_document
    )

    result = client.process_document(request=request)
    document = result.document

    print(f"Total pages: {len(document.pages)}")
    print(f"Total text length: {len(document.text)} characters")

    # Access each page individually
    for page_num, page in enumerate(document.pages):
        print(f"\n--- Page {page_num + 1} ---")
        print(f"  Dimensions: {page.dimension.width:.0f} x {page.dimension.height:.0f}")
        print(f"  Paragraphs: {len(page.paragraphs)}")
        print(f"  Tables: {len(page.tables)}")
        print(f"  Form fields: {len(page.form_fields)}")

        # Detected languages on this page
        for lang in page.detected_languages:
            print(f"  Language: {lang.language_code} "
                  f"(confidence: {lang.confidence:.2f})")

    return document

document = process_multipage_document(
    "my-gcp-project", "us", "processor-id",
    "contract_15pages.pdf"
)
```

## Extracting Text Per Page

The document object stores all text in a single string, with text anchors pointing to specific locations. Here is how to get text for a specific page.

```python
def get_page_text(document, page_number):
    """Extract all text content from a specific page number (0-indexed)."""
    if page_number >= len(document.pages):
        raise ValueError(f"Page {page_number} does not exist. "
                        f"Document has {len(document.pages)} pages.")

    page = document.pages[page_number]
    page_text_parts = []

    # Collect text from all paragraphs on this page
    for paragraph in page.paragraphs:
        para_text = layout_to_text(paragraph.layout, document.text)
        if para_text:
            page_text_parts.append(para_text)

    return "\n\n".join(page_text_parts)

def layout_to_text(layout, full_text):
    """Convert a layout element to its text content using text anchors."""
    text = ""
    if layout.text_anchor and layout.text_anchor.text_segments:
        for segment in layout.text_anchor.text_segments:
            start = int(segment.start_index) if segment.start_index else 0
            end = int(segment.end_index)
            text += full_text[start:end]
    return text.strip()

# Get text from page 1 (0-indexed)
page_one_text = get_page_text(document, 0)
print(f"Page 1 text:\n{page_one_text[:500]}")
```

## Splitting Large Documents Before Processing

For documents that exceed the synchronous page limit, split them into smaller chunks.

```python
import io
from PyPDF2 import PdfReader, PdfWriter
from google.cloud import documentai_v1

def split_pdf(file_path, max_pages=15):
    """Split a PDF into chunks of max_pages each."""
    reader = PdfReader(file_path)
    total_pages = len(reader.pages)
    chunks = []

    for start in range(0, total_pages, max_pages):
        writer = PdfWriter()
        end = min(start + max_pages, total_pages)

        for page_num in range(start, end):
            writer.add_page(reader.pages[page_num])

        # Write chunk to bytes buffer
        buffer = io.BytesIO()
        writer.write(buffer)
        buffer.seek(0)

        chunks.append({
            "content": buffer.read(),
            "start_page": start,
            "end_page": end,
            "page_count": end - start
        })

        print(f"Chunk: pages {start + 1}-{end} ({end - start} pages)")

    return chunks

def process_large_document(project_id, location, processor_id, file_path):
    """Process a large document by splitting and processing chunks."""
    client = documentai_v1.DocumentProcessorServiceClient()
    name = f"projects/{project_id}/locations/{location}/processors/{processor_id}"

    # Split the PDF into processable chunks
    chunks = split_pdf(file_path, max_pages=15)

    all_results = []

    for i, chunk in enumerate(chunks):
        print(f"\nProcessing chunk {i + 1}/{len(chunks)} "
              f"(pages {chunk['start_page'] + 1}-{chunk['end_page']})")

        raw_document = documentai_v1.RawDocument(
            content=chunk["content"],
            mime_type="application/pdf"
        )

        request = documentai_v1.ProcessRequest(
            name=name,
            raw_document=raw_document
        )

        result = client.process_document(request=request)

        all_results.append({
            "chunk_index": i,
            "start_page": chunk["start_page"],
            "end_page": chunk["end_page"],
            "document": result.document
        })

    return all_results

# Process a 50-page document
results = process_large_document(
    "my-gcp-project", "us", "processor-id",
    "lengthy_report_50pages.pdf"
)
```

## Using Batch Processing for Large Documents

For very large documents, batch processing is more efficient and handles bigger files.

```python
from google.cloud import documentai_v1, storage
import json
import time

def batch_process_large_document(project_id, location, processor_id,
                                  gcs_input_uri, gcs_output_uri):
    """Use batch processing for documents that exceed sync limits."""
    client = documentai_v1.DocumentProcessorServiceClient()
    name = f"projects/{project_id}/locations/{location}/processors/{processor_id}"

    # Configure input - a single large document
    gcs_document = documentai_v1.GcsDocument(
        gcs_uri=gcs_input_uri,
        mime_type="application/pdf"
    )

    input_config = documentai_v1.BatchDocumentsInputConfig(
        gcs_documents=documentai_v1.GcsDocuments(
            documents=[gcs_document]
        )
    )

    # Configure output
    output_config = documentai_v1.DocumentOutputConfig(
        gcs_output_config=documentai_v1.DocumentOutputConfig.GcsOutputConfig(
            gcs_uri=gcs_output_uri,
            # Shard the output into manageable pieces
            field_mask="text,entities,pages.pageNumber"
        )
    )

    request = documentai_v1.BatchProcessRequest(
        name=name,
        input_documents=input_config,
        document_output_config=output_config
    )

    operation = client.batch_process_documents(request=request)
    print(f"Batch operation started: {operation.operation.name}")

    # Wait for the operation to complete
    result = operation.result(timeout=600)
    print("Batch processing complete!")

    return result

# Process a 200-page document via batch
batch_process_large_document(
    "my-gcp-project", "us", "processor-id",
    "gs://my-bucket/docs/large_contract.pdf",
    "gs://my-bucket/results/"
)
```

## Reading Batch Output from Cloud Storage

Batch processing writes results as JSON files in Cloud Storage. Here is how to read them.

```python
from google.cloud import storage
import json

def read_batch_results(output_gcs_uri):
    """Read and parse batch processing results from Cloud Storage."""
    storage_client = storage.Client()

    # Parse the GCS URI
    parts = output_gcs_uri.replace("gs://", "").split("/", 1)
    bucket_name = parts[0]
    prefix = parts[1] if len(parts) > 1 else ""

    bucket = storage_client.bucket(bucket_name)
    blobs = list(bucket.list_blobs(prefix=prefix))

    documents = []

    for blob in blobs:
        if blob.name.endswith(".json"):
            content = blob.download_as_string()
            doc_dict = json.loads(content)
            documents.append(doc_dict)
            print(f"Read result file: {blob.name}")

    print(f"Total result files: {len(documents)}")
    return documents

results = read_batch_results("gs://my-bucket/results/")
```

## Handling Page-Level Entities

When processing multi-page documents with specialized processors (like the Invoice Processor), entities may span across pages. Here is how to track which page an entity appears on.

```python
def map_entities_to_pages(document):
    """Map each extracted entity to its source page."""
    entity_page_map = []

    for entity in document.entities:
        # Entities have page anchors that tell us which page they are on
        pages = set()
        if entity.page_anchor and entity.page_anchor.page_refs:
            for ref in entity.page_anchor.page_refs:
                pages.add(int(ref.page))

        entity_page_map.append({
            "type": entity.type_,
            "value": entity.mention_text,
            "confidence": round(entity.confidence, 3),
            "pages": sorted(list(pages))
        })

    # Group by page
    from collections import defaultdict
    by_page = defaultdict(list)
    for entry in entity_page_map:
        for page in entry["pages"]:
            by_page[page].append(entry)

    # Print summary
    for page_num in sorted(by_page.keys()):
        print(f"\nPage {page_num + 1}:")
        for entity in by_page[page_num]:
            print(f"  {entity['type']}: {entity['value'][:60]}")

    return entity_page_map
```

## Tips for Multi-Page Documents

A few practical tips from working with multi-page documents in production:

- **Use batch processing by default for anything over 10 pages** - it handles failures more gracefully and does not tie up your application waiting for a response
- **Monitor processing costs** - multi-page documents consume more API credits per request
- **Consider parallel processing** - if you split a document, you can process chunks in parallel to speed things up
- **Watch for cross-page context** - tables and paragraphs can span page breaks, and Document AI handles this well, but your post-processing code needs to account for it
- **Store page-level metadata** - when storing results, include the page number so you can trace extracted data back to its source page

## Wrapping Up

Handling multi-page documents in Document AI is mostly about understanding the limits and choosing the right processing approach. For documents under 15 pages, synchronous processing works fine and gives you immediate results. For anything larger, batch processing is the way to go. When you need to split documents, do it cleanly at page boundaries and keep track of the original page numbers so you can reassemble results correctly. The Document AI response structure makes it straightforward to access per-page information, so once you understand the text anchor and page anchor patterns, working with multi-page documents becomes routine.
