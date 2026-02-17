# How to Extract Key-Value Pairs from Forms Using Document AI Form Parser

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Document AI, Form Parser, Document Processing, Data Extraction

Description: Learn how to use Google Cloud Document AI Form Parser to automatically extract key-value pairs, checkboxes, and structured data from scanned forms and documents.

---

If you have ever had to manually enter data from paper forms into a database, you know the pain. Tax forms, insurance applications, patient intake sheets, government documents - they all follow a key-value pattern where labels are paired with filled-in values. The Document AI Form Parser is designed specifically for this task. It reads forms and extracts the label-value pairs automatically, saving hours of manual data entry.

In this guide, I will show you how to set up the Form Parser, process forms, and extract structured key-value data you can feed directly into your systems.

## How the Form Parser Works

Unlike generic OCR that just reads text from left to right, the Form Parser understands form layouts. It identifies:

- **Field names** (the labels on the form, like "Name:", "Date of Birth:", "Address:")
- **Field values** (what someone wrote or typed next to those labels)
- **Checkboxes** (whether they are checked or unchecked)
- **Tables** (rows and columns of structured data)

The parser uses machine learning to understand spatial relationships between labels and values, even when the form layout is complex or the handwriting is messy.

## Creating a Form Parser Processor

Start by creating a Form Parser processor instance.

```python
from google.cloud import documentai_v1

def create_form_parser(project_id, location="us"):
    """Create a Form Parser processor in Document AI."""
    client = documentai_v1.DocumentProcessorServiceClient()
    parent = f"projects/{project_id}/locations/{location}"

    # FORM_PARSER_PROCESSOR is the type for form extraction
    processor = client.create_processor(
        parent=parent,
        processor=documentai_v1.Processor(
            display_name="my-form-parser",
            type_="FORM_PARSER_PROCESSOR"
        )
    )

    print(f"Form Parser created: {processor.name}")
    return processor

processor = create_form_parser("my-gcp-project")
```

## Processing a Form

Send a form document to the processor and get back structured data.

```python
from google.cloud import documentai_v1

def process_form(project_id, location, processor_id, file_path, mime_type):
    """Send a form to Document AI and get the processed result."""
    client = documentai_v1.DocumentProcessorServiceClient()
    name = f"projects/{project_id}/locations/{location}/processors/{processor_id}"

    # Read the form image or PDF
    with open(file_path, "rb") as f:
        content = f.read()

    raw_document = documentai_v1.RawDocument(
        content=content,
        mime_type=mime_type
    )

    request = documentai_v1.ProcessRequest(
        name=name,
        raw_document=raw_document
    )

    result = client.process_document(request=request)
    return result.document

# Process a scanned form
document = process_form(
    project_id="my-gcp-project",
    location="us",
    processor_id="form-parser-id-123",
    file_path="patient_intake_form.pdf",
    mime_type="application/pdf"
)
```

## Extracting Key-Value Pairs

The most valuable output from the Form Parser is the key-value pairs found in form fields.

```python
def extract_form_fields(document):
    """Extract all key-value pairs from form fields on each page."""
    all_fields = []

    for page_num, page in enumerate(document.pages):
        print(f"\n--- Page {page_num + 1} ---")

        for field in page.form_fields:
            # Get the field name (label)
            field_name = get_field_text(field.field_name, document.text)

            # Get the field value (what was filled in)
            field_value = get_field_text(field.field_value, document.text)

            # Confidence scores for both name and value detection
            name_confidence = field.field_name.confidence
            value_confidence = field.field_value.confidence

            field_data = {
                "page": page_num + 1,
                "name": field_name,
                "value": field_value,
                "name_confidence": round(name_confidence, 3),
                "value_confidence": round(value_confidence, 3)
            }

            all_fields.append(field_data)
            print(f"  {field_name}: {field_value} "
                  f"(confidence: {value_confidence:.2f})")

    return all_fields

def get_field_text(field_element, full_text):
    """Extract text content from a form field element."""
    text = ""
    if field_element and field_element.text_anchor:
        for segment in field_element.text_anchor.text_segments:
            start = int(segment.start_index)
            end = int(segment.end_index)
            text += full_text[start:end]
    return text.strip()

# Extract all form fields
fields = extract_form_fields(document)
```

## Handling Checkboxes

Forms often include checkboxes. The Form Parser detects these and tells you whether they are checked or not.

```python
def extract_checkboxes(document):
    """Find and extract checkbox states from the form."""
    checkboxes = []

    for page_num, page in enumerate(document.pages):
        for field in page.form_fields:
            field_name = get_field_text(field.field_name, document.text)
            field_value = get_field_text(field.field_value, document.text)

            # Checkboxes have special value types
            # The value text will be something like "filled_checkbox" or "unfilled_checkbox"
            if hasattr(field.field_value, 'value_type'):
                value_type = field.field_value.value_type
            else:
                value_type = None

            # Check if this looks like a checkbox based on the value
            is_checkbox = field_value.lower() in [
                "filled_checkbox", "unfilled_checkbox",
                "checked", "unchecked"
            ]

            if is_checkbox:
                is_checked = field_value.lower() in ["filled_checkbox", "checked"]
                checkboxes.append({
                    "page": page_num + 1,
                    "label": field_name,
                    "checked": is_checked,
                    "confidence": round(field.field_value.confidence, 3)
                })
                print(f"Checkbox - {field_name}: {'Checked' if is_checked else 'Unchecked'}")

    return checkboxes

checkboxes = extract_checkboxes(document)
```

## Extracting Tables from Forms

Many forms contain tabular data. Here is how to extract table contents.

```python
def extract_tables(document):
    """Extract table data from form pages."""
    tables = []

    for page_num, page in enumerate(document.pages):
        for table_idx, table in enumerate(page.tables):
            print(f"\nPage {page_num + 1}, Table {table_idx + 1}")

            # Extract header rows
            headers = []
            for header_row in table.header_rows:
                row_data = []
                for cell in header_row.cells:
                    cell_text = get_field_text(cell.layout, document.text)
                    row_data.append(cell_text)
                headers.append(row_data)

            # Extract body rows
            body_rows = []
            for body_row in table.body_rows:
                row_data = []
                for cell in body_row.cells:
                    cell_text = get_field_text(cell.layout, document.text)
                    row_data.append(cell_text)
                body_rows.append(row_data)

            table_data = {
                "page": page_num + 1,
                "table_index": table_idx,
                "headers": headers,
                "rows": body_rows
            }
            tables.append(table_data)

            # Print the table
            if headers:
                print(f"  Headers: {headers[0]}")
            for row in body_rows:
                print(f"  Row: {row}")

    return tables

tables = extract_tables(document)
```

## Building a Complete Form Processing Pipeline

Here is a more complete example that processes a form and outputs a clean JSON structure.

```python
import json
from google.cloud import documentai_v1, storage

def process_and_structure_form(project_id, location, processor_id,
                                gcs_uri, output_bucket):
    """Full pipeline: read form from GCS, extract data, save structured JSON."""
    client = documentai_v1.DocumentProcessorServiceClient()
    name = f"projects/{project_id}/locations/{location}/processors/{processor_id}"

    # Process the document from GCS
    gcs_document = documentai_v1.GcsDocument(
        gcs_uri=gcs_uri,
        mime_type="application/pdf"
    )

    request = documentai_v1.ProcessRequest(
        name=name,
        gcs_document=gcs_document
    )

    result = client.process_document(request=request)
    document = result.document

    # Build structured output
    structured_data = {
        "source_document": gcs_uri,
        "page_count": len(document.pages),
        "fields": {},
        "tables": [],
        "checkboxes": {}
    }

    # Process all form fields into a clean dictionary
    for page in document.pages:
        for field in page.form_fields:
            field_name = get_field_text(field.field_name, document.text)
            field_value = get_field_text(field.field_value, document.text)

            if field_name:
                # Clean up the field name for use as a dict key
                clean_name = field_name.rstrip(":").strip()
                structured_data["fields"][clean_name] = {
                    "value": field_value,
                    "confidence": round(field.field_value.confidence, 3)
                }

    # Save the result to Cloud Storage
    storage_client = storage.Client()
    bucket = storage_client.bucket(output_bucket)

    # Derive output filename from input
    output_name = gcs_uri.split("/")[-1].replace(".pdf", "_extracted.json")
    blob = bucket.blob(f"extracted/{output_name}")
    blob.upload_from_string(
        json.dumps(structured_data, indent=2),
        content_type="application/json"
    )

    print(f"Extracted data saved to gs://{output_bucket}/extracted/{output_name}")
    return structured_data

# Run the pipeline
data = process_and_structure_form(
    project_id="my-gcp-project",
    location="us",
    processor_id="form-parser-id-123",
    gcs_uri="gs://my-bucket/forms/application.pdf",
    output_bucket="my-bucket"
)
```

## Tips for Better Results

A few things that will improve your Form Parser results:

- **Scan quality matters**: Higher resolution scans (300 DPI or better) produce much better results
- **Consistent layouts**: The parser handles varied layouts, but consistent forms give better accuracy
- **Pre-processing**: If your scans are skewed, consider deskewing them before processing
- **Confidence thresholds**: Set minimum confidence thresholds (0.8 is a good starting point) and flag low-confidence fields for manual review

## Wrapping Up

The Document AI Form Parser takes the tedium out of extracting data from forms. Instead of building custom parsers for each form type or hiring data entry staff, you can feed forms into the API and get structured key-value pairs back. Combine it with Cloud Storage triggers and Cloud Functions, and you have a fully automated form processing pipeline that scales with your document volume.
