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
- **Lists** for supported file types; PDF lists may be represented as text blocks
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
from google.api_core.client_options import ClientOptions
from google.cloud import documentai_v1

def create_layout_parser(project_id, location="us"):
    """Create a Layout Parser processor in Document AI."""
    opts = ClientOptions(api_endpoint=f"{location}-documentai.googleapis.com")
    client = documentai_v1.DocumentProcessorServiceClient(client_options=opts)
    parent = client.common_location_path(project_id, location)

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
from google.api_core.client_options import ClientOptions
from google.cloud import documentai_v1

def parse_pdf_layout(project_id, location, processor_id, file_path):
    """Process a PDF with the Layout Parser to get structured text."""
    opts = ClientOptions(api_endpoint=f"{location}-documentai.googleapis.com")
    client = documentai_v1.DocumentProcessorServiceClient(client_options=opts)
    name = client.processor_path(project_id, location, processor_id)

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
    print(f"Layout blocks: {len(document.document_layout.blocks)}")

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
    for block in document.document_layout.blocks:
        print_layout_block(block)

def print_layout_block(block, indent=0):
    """Print a DocumentLayoutBlock and any nested child blocks."""
    prefix = "  " * indent
    block_type = block._pb.WhichOneof("block")

    if block_type == "text_block":
        text_block = block.text_block
        page_start = block.page_span.page_start
        print(f"{prefix}{text_block.type_} (page {page_start}): "
              f"{text_block.text[:100]}...")
        for child in text_block.blocks:
            print_layout_block(child, indent + 1)

    elif block_type == "table_block":
        table = block.table_block
        row_count = len(table.header_rows) + len(table.body_rows)
        print(f"{prefix}table ({row_count} rows): {table.caption}")

    elif block_type == "list_block":
        list_block = block.list_block
        print(f"{prefix}{list_block.type_} list "
              f"({len(list_block.list_entries)} items)")
        for entry in list_block.list_entries:
            for child in entry.blocks:
                print_layout_block(child, indent + 1)

extract_layout_elements(document)
```

## Converting to Markdown

One of the most practical uses of the Layout Parser is converting PDFs to Markdown. Since the parser identifies headings, paragraphs, and tables, you can map each to Markdown syntax.

```python
def pdf_to_markdown(document):
    """Convert a Document AI parsed document to Markdown format."""
    markdown_lines = []

    for block in document.document_layout.blocks:
        markdown_lines.extend(block_to_markdown(block))

    return "\n".join(markdown_lines)

def block_to_markdown(block):
    """Convert a DocumentLayoutBlock to Markdown lines."""
    block_type = block._pb.WhichOneof("block")

    if block_type == "text_block":
        text_block = block.text_block
        text = text_block.text.strip()
        lines = []

        if text_block.type_.startswith("heading-"):
            level = int(text_block.type_.split("-")[1])
            lines.append(f"\n{'#' * level} {text}\n")
        elif text_block.type_ == "subtitle":
            lines.append(f"\n## {text}\n")
        elif text_block.type_ not in ("header", "footer"):
            lines.append(f"\n{text}\n")

        for child in text_block.blocks:
            lines.extend(block_to_markdown(child))

        return lines

    if block_type == "table_block":
        return [table_to_markdown(block.table_block)]

    if block_type == "list_block":
        return list_to_markdown(block.list_block)

    return []

def block_text(block):
    """Extract text recursively from a layout block."""
    block_type = block._pb.WhichOneof("block")

    if block_type == "text_block":
        child_text = " ".join(block_text(child)
                              for child in block.text_block.blocks)
        return " ".join(part for part in [block.text_block.text, child_text]
                        if part).strip()

    if block_type == "list_block":
        return " ".join(
            block_text(child)
            for entry in block.list_block.list_entries
            for child in entry.blocks
        ).strip()

    return ""

def list_to_markdown(list_block):
    """Convert a detected list block to Markdown list syntax."""
    lines = []
    ordered = list_block.type_ == "ordered"

    for index, entry in enumerate(list_block.list_entries, start=1):
        marker = f"{index}." if ordered else "-"
        item_text = " ".join(block_text(child) for child in entry.blocks)
        lines.append(f"{marker} {item_text.strip()}")

    return ["\n" + "\n".join(lines) + "\n"]

def table_to_markdown(table):
    """Convert a detected table to Markdown table syntax."""
    lines = []

    # Header rows
    for header_row in table.header_rows:
        cells = []
        for cell in header_row.cells:
            cell_text = " ".join(block_text(block) for block in cell.blocks)
            cells.append(cell_text)
        lines.append("| " + " | ".join(cells) + " |")
        # Add separator after header
        lines.append("| " + " | ".join(["---"] * len(cells)) + " |")

    # Body rows
    for body_row in table.body_rows:
        cells = []
        for cell in body_row.cells:
            cell_text = " ".join(block_text(block) for block in cell.blocks)
            cells.append(cell_text)
        lines.append("| " + " | ".join(cells) + " |")

    return "\n" + "\n".join(lines) + "\n"
```

## Handling Multi-Column Layouts

Multi-column documents (like research papers and newspapers) are particularly challenging. The Layout Parser returns `document.document_layout.blocks` in document order, so you usually do not need to split a page into columns yourself.

```python
def extract_in_layout_order(document):
    """Extract text in the reading order returned by Layout Parser."""
    for block in document.document_layout.blocks:
        text = block_text(block)
        if text:
            print(text)
```

## Batch Processing PDFs from Cloud Storage

For processing large numbers of PDFs, use the batch API.

```python
from google.api_core.client_options import ClientOptions
from google.cloud import documentai_v1

def batch_parse_pdfs(project_id, location, processor_id,
                      input_gcs_prefix, output_gcs_uri):
    """Process multiple PDFs in batch mode."""
    opts = ClientOptions(api_endpoint=f"{location}-documentai.googleapis.com")
    client = documentai_v1.DocumentProcessorServiceClient(client_options=opts)
    name = client.processor_path(project_id, location, processor_id)

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

- **File size limits**: Synchronous processing supports files up to 40MB. Use batch processing for larger files, up to 1GB per batch request.
- **Page limits**: Synchronous API handles up to 15 pages for PDF files. Use batch for longer documents, up to 500 pages per PDF file.
- **Processing time**: Synchronous processing is best for short documents; batch jobs are asynchronous and are better suited to larger workloads.
- **Cost**: Each page processed counts toward your billing, so filter inputs and page ranges where possible.

## Wrapping Up

The Document AI Layout Parser bridges the gap between visually formatted PDFs and machine-readable structured text. By understanding headings, paragraphs, tables, and multi-column layouts, it produces output that preserves the information hierarchy of the original document. Whether you are building a document search system, converting legacy PDFs to web content, or feeding documents into an LLM pipeline, the Layout Parser gives you a clean starting point that saves hours of manual reformatting.
