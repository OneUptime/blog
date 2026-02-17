# How to Use Document AI Layout Parser to Convert PDFs to Structured Text

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Document AI, Layout Parser, PDF Processing, Text Extraction

Description: Learn how to use Google Cloud Document AI Layout Parser to convert PDFs into structured text while preserving headings, paragraphs, lists, and tables from the original layout.

---

PDFs are everywhere - contracts, reports, research papers, manuals. They look great for humans but are notoriously difficult for machines to parse. Simply dumping the raw text from a PDF loses all the structure: headings blend into body text, tables become jumbled lines, and multi-column layouts get interleaved. The Document AI Layout Parser solves this by understanding the visual structure of a document and converting it into clean, organized text.

In this guide, I will show you how to use the Layout Parser to convert PDFs into structured text that preserves the document hierarchy.

## What the Layout Parser Does

The Layout Parser is a specialized Document AI processor that focuses on understanding document layout. It identifies:

- **Headings and titles** at different levels
- **Paragraphs** as distinct text blocks
- **Lists** (bulleted and numbered)
- **Tables** with rows and columns
- **Page headers and footers**
- **Reading order** across complex layouts including multi-column pages

Unlike basic OCR that reads text left-to-right, top-to-bottom, the Layout Parser understands that a two-column page should be read one column at a time.

## Setting Up the Layout Parser

Create a Layout Parser processor and install the required libraries.

```bash
# Enable Document AI and install the client library
gcloud services enable documentai.googleapis.com
pip install google-cloud-documentai
```

```python
from google.cloud import documentai_v1

def create_layout_parser(project_id, location="us"):
    """Create a Layout Parser processor in Document AI."""
    client = documentai_v1.DocumentProcessorServiceClient()
    parent = f"projects/{project_id}/locations/{location}"

    processor = client.create_processor(
        parent=parent,
        processor=documentai_v1.Processor(
            display_name="my-layout-parser",
            type_="LAYOUT_PARSER_PROCESSOR"
        )
    )

    print(f"Layout Parser created: {processor.name}")
    return processor
```

## Processing a PDF

Send your PDF to the Layout Parser and get back the structured document.

```python
from google.cloud import documentai_v1

def parse_pdf_layout(project_id, location, processor_id, file_path):
    """Process a PDF with the Layout Parser to get structured text."""
    client = documentai_v1.DocumentProcessorServiceClient()
    name = f"projects/{project_id}/locations/{location}/processors/{processor_id}"

    # Read the PDF file
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

    print(f"Pages: {len(document.pages)}")
    print(f"Total text length: {len(document.text)} characters")

    return document

document = parse_pdf_layout(
    "my-gcp-project", "us", "layout-parser-id",
    "annual_report.pdf"
)
```

## Extracting Structured Elements

The real power of the Layout Parser is in the structured elements it identifies. Here is how to extract each type.

```python
def extract_layout_elements(document):
    """Walk through all layout elements identified by the parser."""
    for page_num, page in enumerate(document.pages):
        print(f"\n{'='*60}")
        print(f"PAGE {page_num + 1}")
        print(f"{'='*60}")

        # Extract headings/titles
        if page.blocks:
            print(f"\nBlocks: {len(page.blocks)}")

        # Extract paragraphs with their reading order
        if page.paragraphs:
            print(f"Paragraphs: {len(page.paragraphs)}")
            for i, para in enumerate(page.paragraphs):
                text = get_text(para.layout, document.text)
                # Only show first 100 chars of each paragraph
                print(f"  [{i}] {text[:100]}...")

        # Extract detected languages
        if page.detected_languages:
            for lang in page.detected_languages:
                print(f"Language: {lang.language_code} "
                      f"(confidence: {lang.confidence:.2f})")

def get_text(layout, full_text):
    """Get the text content for a layout element."""
    text = ""
    if layout.text_anchor and layout.text_anchor.text_segments:
        for segment in layout.text_anchor.text_segments:
            start = int(segment.start_index) if segment.start_index else 0
            end = int(segment.end_index)
            text += full_text[start:end]
    return text.strip()

extract_layout_elements(document)
```

## Converting to Markdown

One of the most practical uses of the Layout Parser is converting PDFs to Markdown. Since the parser identifies headings, paragraphs, lists, and tables, you can map each to Markdown syntax.

```python
def pdf_to_markdown(document):
    """Convert a Document AI parsed document to Markdown format."""
    markdown_lines = []

    for page_num, page in enumerate(document.pages):
        if page_num > 0:
            markdown_lines.append("\n---\n")  # Page break

        # Process visual elements in reading order
        # The layout parser provides elements with bounding boxes
        # We sort by vertical position to maintain reading order
        elements = []

        # Collect all elements with their positions
        for block in page.blocks:
            text = get_text(block.layout, document.text)
            y_pos = get_y_position(block.layout)
            elements.append(("block", text, y_pos, block.layout))

        for para in page.paragraphs:
            text = get_text(para.layout, document.text)
            y_pos = get_y_position(para.layout)
            elements.append(("paragraph", text, y_pos, para.layout))

        # Sort elements by vertical position (top to bottom)
        elements.sort(key=lambda e: e[2])

        # Convert each element to Markdown
        seen_text = set()
        for elem_type, text, y_pos, layout in elements:
            if not text or text in seen_text:
                continue
            seen_text.add(text)

            # Use font size and style cues to determine heading level
            # Larger text or bold text at the top of a page is likely a heading
            if is_heading(layout, page):
                level = determine_heading_level(layout, page)
                markdown_lines.append(f"\n{'#' * level} {text}\n")
            else:
                markdown_lines.append(f"\n{text}\n")

        # Handle tables separately
        for table in page.tables:
            markdown_lines.append(table_to_markdown(table, document.text))

    return "\n".join(markdown_lines)

def get_y_position(layout):
    """Get the top Y coordinate of a layout element."""
    if layout.bounding_poly and layout.bounding_poly.vertices:
        return layout.bounding_poly.vertices[0].y
    return 0

def is_heading(layout, page):
    """Heuristic to determine if a text block is a heading."""
    text = ""
    if layout.text_anchor:
        for segment in layout.text_anchor.text_segments:
            pass
    # Use confidence and position as signals
    # Headings are typically short, high confidence, at certain positions
    return False  # Simplified - implement heuristics based on your docs

def determine_heading_level(layout, page):
    """Determine the heading level based on font size and position."""
    # In practice, you would analyze detected font sizes
    return 2  # Default to h2

def table_to_markdown(table, full_text):
    """Convert a detected table to Markdown table syntax."""
    lines = []

    # Header rows
    for header_row in table.header_rows:
        cells = []
        for cell in header_row.cells:
            cell_text = get_text(cell.layout, full_text)
            cells.append(cell_text)
        lines.append("| " + " | ".join(cells) + " |")
        # Add separator after header
        lines.append("| " + " | ".join(["---"] * len(cells)) + " |")

    # Body rows
    for body_row in table.body_rows:
        cells = []
        for cell in body_row.cells:
            cell_text = get_text(cell.layout, full_text)
            cells.append(cell_text)
        lines.append("| " + " | ".join(cells) + " |")

    return "\n" + "\n".join(lines) + "\n"
```

## Handling Multi-Column Layouts

Multi-column documents (like research papers and newspapers) are particularly challenging. The Layout Parser handles these by detecting column boundaries and establishing the correct reading order.

```python
def extract_with_column_awareness(document):
    """Extract text while respecting multi-column layout."""
    for page in document.pages:
        # Group paragraphs by their horizontal position
        left_column = []
        right_column = []

        page_width = page.dimension.width

        for para in page.paragraphs:
            text = get_text(para.layout, document.text)
            if not text:
                continue

            # Determine which column the paragraph belongs to
            x_pos = para.layout.bounding_poly.vertices[0].x
            midpoint = page_width / 2

            if x_pos < midpoint:
                y_pos = para.layout.bounding_poly.vertices[0].y
                left_column.append((y_pos, text))
            else:
                y_pos = para.layout.bounding_poly.vertices[0].y
                right_column.append((y_pos, text))

        # Sort each column by vertical position
        left_column.sort(key=lambda x: x[0])
        right_column.sort(key=lambda x: x[0])

        # Read left column first, then right column
        print("--- Left Column ---")
        for _, text in left_column:
            print(text)

        print("\n--- Right Column ---")
        for _, text in right_column:
            print(text)
```

## Batch Processing PDFs from Cloud Storage

For processing large numbers of PDFs, use the batch API.

```python
from google.cloud import documentai_v1

def batch_parse_pdfs(project_id, location, processor_id,
                      input_gcs_prefix, output_gcs_uri):
    """Process multiple PDFs in batch mode."""
    client = documentai_v1.DocumentProcessorServiceClient()
    name = f"projects/{project_id}/locations/{location}/processors/{processor_id}"

    # Input configuration - all PDFs in the GCS prefix
    input_config = documentai_v1.BatchDocumentsInputConfig(
        gcs_prefix=documentai_v1.GcsPrefix(
            gcs_uri_prefix=input_gcs_prefix
        )
    )

    # Output configuration
    output_config = documentai_v1.DocumentOutputConfig(
        gcs_output_config=documentai_v1.DocumentOutputConfig.GcsOutputConfig(
            gcs_uri=output_gcs_uri
        )
    )

    request = documentai_v1.BatchProcessRequest(
        name=name,
        input_documents=input_config,
        document_output_config=output_config
    )

    # Start the batch job
    operation = client.batch_process_documents(request=request)
    print("Batch processing started...")

    # Wait for completion (or poll periodically in production)
    result = operation.result(timeout=600)
    print("Batch processing complete!")

    return result

batch_parse_pdfs(
    "my-gcp-project", "us", "layout-parser-id",
    "gs://my-bucket/pdfs/",
    "gs://my-bucket/parsed-output/"
)
```

## Performance Considerations

Keep these in mind when working with the Layout Parser:

- **File size limits**: Synchronous processing supports files up to 20MB. Use batch processing for larger files.
- **Page limits**: Synchronous API handles up to 15 pages. Use batch for longer documents.
- **Processing time**: Expect 2-5 seconds per page for synchronous requests.
- **Cost**: Each page processed counts toward your billing. Batch processing is more cost-effective for high volumes.

## Wrapping Up

The Document AI Layout Parser bridges the gap between visually formatted PDFs and machine-readable structured text. By understanding headings, paragraphs, tables, and multi-column layouts, it produces output that preserves the information hierarchy of the original document. Whether you are building a document search system, converting legacy PDFs to web content, or feeding documents into an LLM pipeline, the Layout Parser gives you a clean starting point that saves hours of manual reformatting.
