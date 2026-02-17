# How to Extract Tables from Documents Using Document AI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Document AI, Table Extraction, Data Processing, OCR

Description: Learn how to use Google Cloud Document AI to detect and extract tables from PDFs and scanned documents, converting them into structured data for analysis and storage.

---

Tables are everywhere in business documents - financial statements, product catalogs, lab reports, shipping manifests, purchase orders. Extracting table data from PDFs and scanned documents has traditionally been painful. You end up with misaligned columns, merged cells that break everything, and header rows that get mixed into the data. Document AI handles tables natively, detecting their boundaries, identifying headers, and extracting cell contents into a structured format you can actually work with.

This guide walks through how to extract tables from documents using Document AI and convert them into usable data formats like CSV, JSON, and Pandas DataFrames.

## How Document AI Detects Tables

Document AI uses visual understanding to find tables in documents. It does not rely on invisible PDF table markup (which most PDFs lack anyway). Instead, it:

1. Identifies table boundaries using visual cues like lines, alignment, and spacing
2. Detects header rows versus body rows
3. Handles merged cells and multi-line cell content
4. Preserves row/column structure even in complex layouts

This works on both native PDFs (where text is selectable) and scanned documents (where text is an image).

## Setting Up for Table Extraction

Any Document AI processor can detect tables, but the Form Parser and OCR Processor are the most common choices for table-heavy documents.

```bash
# Install the required libraries
pip install google-cloud-documentai pandas
```

```python
from google.cloud import documentai_v1

def create_processor_for_tables(project_id, location="us"):
    """Create a Form Parser processor - good for table extraction."""
    client = documentai_v1.DocumentProcessorServiceClient()
    parent = f"projects/{project_id}/locations/{location}"

    processor = client.create_processor(
        parent=parent,
        processor=documentai_v1.Processor(
            display_name="table-extractor",
            type_="FORM_PARSER_PROCESSOR"
        )
    )

    print(f"Processor created: {processor.name}")
    return processor
```

## Processing a Document and Finding Tables

Process your document and inspect the tables found on each page.

```python
from google.cloud import documentai_v1

def find_tables_in_document(project_id, location, processor_id, file_path):
    """Process a document and report all tables found."""
    client = documentai_v1.DocumentProcessorServiceClient()
    name = f"projects/{project_id}/locations/{location}/processors/{processor_id}"

    with open(file_path, "rb") as f:
        content = f.read()

    raw_document = documentai_v1.RawDocument(
        content=content,
        mime_type="application/pdf"
    )

    result = client.process_document(
        request=documentai_v1.ProcessRequest(
            name=name,
            raw_document=raw_document
        )
    )

    document = result.document

    # Count tables across all pages
    total_tables = 0
    for page_num, page in enumerate(document.pages):
        table_count = len(page.tables)
        total_tables += table_count
        if table_count > 0:
            print(f"Page {page_num + 1}: {table_count} table(s) found")
            for t_idx, table in enumerate(page.tables):
                rows = len(table.header_rows) + len(table.body_rows)
                cols = len(table.header_rows[0].cells) if table.header_rows else (
                    len(table.body_rows[0].cells) if table.body_rows else 0
                )
                print(f"  Table {t_idx + 1}: {rows} rows x {cols} columns")

    print(f"\nTotal tables found: {total_tables}")
    return document

document = find_tables_in_document(
    "my-gcp-project", "us", "processor-id",
    "financial_report.pdf"
)
```

## Extracting Table Data into Structured Format

Here is the core function that converts Document AI table objects into clean Python data structures.

```python
def extract_table_data(table, document_text):
    """Extract a table into a list of dictionaries (header-keyed rows)."""

    def get_cell_text(cell, full_text):
        """Get the text content of a table cell."""
        text = ""
        if cell.layout and cell.layout.text_anchor:
            for segment in cell.layout.text_anchor.text_segments:
                start = int(segment.start_index) if segment.start_index else 0
                end = int(segment.end_index)
                text += full_text[start:end]
        return text.strip()

    # Extract headers
    headers = []
    for header_row in table.header_rows:
        row_headers = []
        for cell in header_row.cells:
            cell_text = get_cell_text(cell, document_text)
            row_headers.append(cell_text)
        headers = row_headers  # Use the last header row as column names

    # If no header row detected, generate generic column names
    if not headers and table.body_rows:
        col_count = len(table.body_rows[0].cells)
        headers = [f"Column_{i+1}" for i in range(col_count)]

    # Extract body rows
    rows = []
    for body_row in table.body_rows:
        row_data = {}
        for col_idx, cell in enumerate(body_row.cells):
            cell_text = get_cell_text(cell, document_text)
            header = headers[col_idx] if col_idx < len(headers) else f"Column_{col_idx+1}"
            row_data[header] = cell_text
        rows.append(row_data)

    return {"headers": headers, "rows": rows}

# Extract all tables from the document
all_tables = []
for page_num, page in enumerate(document.pages):
    for table_idx, table in enumerate(page.tables):
        table_data = extract_table_data(table, document.text)
        table_data["page"] = page_num + 1
        table_data["table_index"] = table_idx
        all_tables.append(table_data)
        print(f"\nPage {page_num + 1}, Table {table_idx + 1}:")
        print(f"  Headers: {table_data['headers']}")
        print(f"  Rows: {len(table_data['rows'])}")
```

## Converting Tables to Pandas DataFrames

For data analysis, converting to Pandas DataFrames is usually the next step.

```python
import pandas as pd

def tables_to_dataframes(all_tables):
    """Convert extracted table data into Pandas DataFrames."""
    dataframes = []

    for table_info in all_tables:
        if table_info["rows"]:
            df = pd.DataFrame(table_info["rows"])
            df.attrs["page"] = table_info["page"]
            df.attrs["table_index"] = table_info["table_index"]
            dataframes.append(df)

            print(f"\nPage {table_info['page']}, "
                  f"Table {table_info['table_index'] + 1}:")
            print(df.to_string(index=False))

    return dataframes

# Convert to DataFrames
dfs = tables_to_dataframes(all_tables)

# Now you can do analysis
for df in dfs:
    print(f"\nShape: {df.shape}")
    print(df.describe())
```

## Exporting Tables to CSV

Save extracted tables as CSV files for use in spreadsheets or other tools.

```python
import os

def export_tables_to_csv(all_tables, output_dir="extracted_tables"):
    """Save each extracted table as a separate CSV file."""
    os.makedirs(output_dir, exist_ok=True)

    for table_info in all_tables:
        if not table_info["rows"]:
            continue

        filename = (f"page{table_info['page']}_"
                   f"table{table_info['table_index'] + 1}.csv")
        filepath = os.path.join(output_dir, filename)

        df = pd.DataFrame(table_info["rows"])
        df.to_csv(filepath, index=False)
        print(f"Saved: {filepath} ({len(df)} rows)")

export_tables_to_csv(all_tables)
```

## Handling Merged Cells

Tables with merged cells require special handling. Document AI reports the row and column span for each cell.

```python
def extract_table_with_spans(table, document_text):
    """Extract table data while handling merged cells."""

    def get_cell_text(cell, full_text):
        text = ""
        if cell.layout and cell.layout.text_anchor:
            for segment in cell.layout.text_anchor.text_segments:
                start = int(segment.start_index) if segment.start_index else 0
                end = int(segment.end_index)
                text += full_text[start:end]
        return text.strip()

    rows = []
    all_row_groups = list(table.header_rows) + list(table.body_rows)

    for row in all_row_groups:
        row_cells = []
        for cell in row.cells:
            cell_info = {
                "text": get_cell_text(cell, document_text),
                "row_span": cell.row_span if cell.row_span else 1,
                "col_span": cell.col_span if cell.col_span else 1
            }
            row_cells.append(cell_info)
        rows.append(row_cells)

    # Print with span information
    for r_idx, row in enumerate(rows):
        for c_idx, cell in enumerate(row):
            span_info = ""
            if cell["row_span"] > 1:
                span_info += f" [rowspan={cell['row_span']}]"
            if cell["col_span"] > 1:
                span_info += f" [colspan={cell['col_span']}]"
            print(f"  [{r_idx},{c_idx}] {cell['text']}{span_info}")

    return rows
```

## Building an Automated Table Extraction Pipeline

Here is a Cloud Function that automatically extracts tables from uploaded documents and stores them in BigQuery.

```python
import functions_framework
from google.cloud import documentai_v1, bigquery
import json

@functions_framework.cloud_event
def extract_tables_to_bigquery(cloud_event):
    """Extract tables from uploaded documents and store in BigQuery."""
    data = cloud_event.data
    bucket = data["bucket"]
    file_name = data["name"]

    if not file_name.endswith(".pdf"):
        return

    # Process document
    docai_client = documentai_v1.DocumentProcessorServiceClient()
    processor_name = "projects/my-project/locations/us/processors/my-processor"

    gcs_doc = documentai_v1.GcsDocument(
        gcs_uri=f"gs://{bucket}/{file_name}",
        mime_type="application/pdf"
    )

    result = docai_client.process_document(
        request=documentai_v1.ProcessRequest(
            name=processor_name,
            gcs_document=gcs_doc
        )
    )

    # Extract tables and insert into BigQuery
    bq_client = bigquery.Client()
    table_ref = bq_client.dataset("documents").table("extracted_tables")

    for page in result.document.pages:
        for table in page.tables:
            table_data = extract_table_data(table, result.document.text)

            # Store as a BigQuery row with JSON table content
            row = {
                "source_file": file_name,
                "page_number": page.page_number,
                "headers": json.dumps(table_data["headers"]),
                "row_count": len(table_data["rows"]),
                "table_json": json.dumps(table_data["rows"])
            }

            errors = bq_client.insert_rows_json(table_ref, [row])
            if errors:
                print(f"Error inserting: {errors}")
```

## Wrapping Up

Document AI makes table extraction from PDFs practical and reliable. The key is understanding that it returns structured table objects with header rows and body rows, each containing cells with text content and span information. From there, converting to DataFrames, CSV files, or database records is straightforward. For production pipelines, combine table extraction with Cloud Storage triggers and BigQuery storage to build an automated system that processes documents and makes their tabular data queryable the moment they arrive.
