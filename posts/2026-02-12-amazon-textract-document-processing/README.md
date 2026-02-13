# How to Use Amazon Textract for Document Processing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Amazon Textract, Document Processing, OCR

Description: A practical guide to using Amazon Textract for extracting text, tables, and forms from documents including PDFs, images, and scanned files.

---

Amazon Textract goes well beyond traditional OCR. While basic OCR just reads characters off a page, Textract understands document structure. It identifies tables, forms with key-value pairs, signatures, and the relationships between different parts of a document. Feed it an invoice and it doesn't just read the text - it understands that "Invoice Number" is a label and "INV-2024-001" is its value.

This makes Textract the tool of choice for automating document processing workflows: invoices, receipts, tax forms, contracts, medical records, and pretty much any structured or semi-structured document.

## Textract's Three Analysis Types

Textract offers three levels of analysis:

**DetectDocumentText** - Plain OCR. Returns all text with position data. Fast and cheap.

**AnalyzeDocument** - Extracts text plus structural elements like tables and forms. More expensive but much more useful.

**AnalyzeExpense** / **AnalyzeID** - Specialized APIs for invoices/receipts and identity documents respectively.

## Basic Text Detection

Let's start with the simplest use case - extracting all text from a document.

```python
import boto3
import json

textract = boto3.client('textract', region_name='us-east-1')

def detect_text(bucket, key):
    """Extract all text from a document image."""
    response = textract.detect_document_text(
        Document={
            'S3Object': {
                'Bucket': bucket,
                'Name': key
            }
        }
    )

    # Collect text blocks organized by type
    lines = []
    words = []

    for block in response['Blocks']:
        if block['BlockType'] == 'LINE':
            lines.append({
                'text': block['Text'],
                'confidence': block['Confidence'],
                'geometry': block['Geometry']
            })
        elif block['BlockType'] == 'WORD':
            words.append(block['Text'])

    full_text = '\n'.join(line['text'] for line in lines)
    return full_text, lines

# Extract text from a scanned document
text, lines = detect_text('my-documents', 'scans/contract-page1.png')
print(text)
```

## Extracting Tables

Table extraction is one of Textract's killer features. It identifies table structures and returns the data in a format you can work with.

```python
def extract_tables(bucket, key):
    """Extract tables from a document."""
    response = textract.analyze_document(
        Document={
            'S3Object': {'Bucket': bucket, 'Name': key}
        },
        FeatureTypes=['TABLES']
    )

    # Build a lookup of all blocks by ID
    blocks = {block['Id']: block for block in response['Blocks']}

    tables = []
    for block in response['Blocks']:
        if block['BlockType'] != 'TABLE':
            continue

        table_data = []
        # Get all cells in this table
        for relationship in block.get('Relationships', []):
            if relationship['Type'] == 'CHILD':
                for cell_id in relationship['Ids']:
                    cell = blocks[cell_id]
                    if cell['BlockType'] == 'CELL':
                        row = cell['RowIndex']
                        col = cell['ColumnIndex']

                        # Get the text content of the cell
                        cell_text = get_cell_text(cell, blocks)

                        # Ensure the table_data list is big enough
                        while len(table_data) < row:
                            table_data.append([])
                        while len(table_data[row - 1]) < col:
                            table_data[row - 1].append('')

                        table_data[row - 1][col - 1] = cell_text

        tables.append(table_data)

    return tables

def get_cell_text(cell, blocks):
    """Extract text content from a table cell."""
    text_parts = []
    for relationship in cell.get('Relationships', []):
        if relationship['Type'] == 'CHILD':
            for child_id in relationship['Ids']:
                child = blocks[child_id]
                if child['BlockType'] == 'WORD':
                    text_parts.append(child['Text'])
    return ' '.join(text_parts)

# Extract tables
tables = extract_tables('my-documents', 'invoices/invoice-001.pdf')
for i, table in enumerate(tables):
    print(f"\nTable {i + 1}:")
    for row in table:
        print(f"  {' | '.join(row)}")
```

## Extracting Forms (Key-Value Pairs)

Forms extraction identifies label-value relationships. "Name: John Smith" becomes `{'Name': 'John Smith'}`.

```python
def extract_forms(bucket, key):
    """Extract key-value pairs from a form document."""
    response = textract.analyze_document(
        Document={
            'S3Object': {'Bucket': bucket, 'Name': key}
        },
        FeatureTypes=['FORMS']
    )

    blocks = {block['Id']: block for block in response['Blocks']}

    # Find KEY_VALUE_SET blocks
    key_value_pairs = {}
    key_blocks = [
        b for b in response['Blocks']
        if b['BlockType'] == 'KEY_VALUE_SET' and 'KEY' in b.get('EntityTypes', [])
    ]

    for key_block in key_blocks:
        key_text = get_block_text(key_block, blocks)
        value_text = ''

        # Find the associated value block
        for relationship in key_block.get('Relationships', []):
            if relationship['Type'] == 'VALUE':
                for value_id in relationship['Ids']:
                    value_block = blocks[value_id]
                    value_text = get_block_text(value_block, blocks)

        if key_text:
            key_value_pairs[key_text] = value_text

    return key_value_pairs

def get_block_text(block, blocks):
    """Get text content from a block and its children."""
    text_parts = []
    for relationship in block.get('Relationships', []):
        if relationship['Type'] == 'CHILD':
            for child_id in relationship['Ids']:
                child = blocks[child_id]
                if child['BlockType'] == 'WORD':
                    text_parts.append(child['Text'])
    return ' '.join(text_parts)

# Extract form fields from an application
fields = extract_forms('my-documents', 'applications/form-001.png')
for key, value in fields.items():
    print(f"  {key}: {value}")
```

## Processing Multi-Page Documents

For PDFs with multiple pages, use the asynchronous API.

```python
def start_async_analysis(bucket, key, features=None):
    """Start async document analysis for multi-page PDFs."""
    if features is None:
        features = ['TABLES', 'FORMS']

    response = textract.start_document_analysis(
        DocumentLocation={
            'S3Object': {'Bucket': bucket, 'Name': key}
        },
        FeatureTypes=features
    )

    job_id = response['JobId']
    print(f"Analysis started: {job_id}")
    return job_id

def get_async_results(job_id):
    """Wait for and retrieve async analysis results."""
    import time

    while True:
        response = textract.get_document_analysis(JobId=job_id)
        status = response['JobStatus']

        if status == 'SUCCEEDED':
            break
        elif status == 'FAILED':
            print(f"Job failed: {response.get('StatusMessage', '')}")
            return None

        print(f"Status: {status}")
        time.sleep(5)

    # Collect all pages of results
    all_blocks = response['Blocks']
    next_token = response.get('NextToken')

    while next_token:
        response = textract.get_document_analysis(
            JobId=job_id,
            NextToken=next_token
        )
        all_blocks.extend(response['Blocks'])
        next_token = response.get('NextToken')

    print(f"Retrieved {len(all_blocks)} blocks across all pages")
    return all_blocks

# Process a multi-page PDF
job_id = start_async_analysis('my-documents', 'contracts/agreement.pdf')
blocks = get_async_results(job_id)
```

## Expense Analysis

The AnalyzeExpense API is specifically designed for invoices and receipts. It understands fields like vendor name, total amount, line items, and tax.

```python
def analyze_expense(bucket, key):
    """Extract structured data from an invoice or receipt."""
    response = textract.analyze_expense(
        Document={
            'S3Object': {'Bucket': bucket, 'Name': key}
        }
    )

    for doc in response['ExpenseDocuments']:
        print("Summary Fields:")
        for field in doc.get('SummaryFields', []):
            field_type = field.get('Type', {}).get('Text', 'Unknown')
            value = field.get('ValueDetection', {}).get('Text', '')
            confidence = field.get('ValueDetection', {}).get('Confidence', 0)
            print(f"  {field_type}: {value} ({confidence:.1f}%)")

        print("\nLine Items:")
        for group in doc.get('LineItemGroups', []):
            for item in group.get('LineItems', []):
                fields = {}
                for field in item.get('LineItemExpenseFields', []):
                    field_type = field.get('Type', {}).get('Text', '')
                    value = field.get('ValueDetection', {}).get('Text', '')
                    fields[field_type] = value
                print(f"  {fields}")

    return response

analyze_expense('my-documents', 'receipts/receipt-001.jpg')
```

## Building a Document Processing Pipeline

Combine Textract with other AWS services for end-to-end document processing.

```python
class DocumentPipeline:
    """Automated document processing pipeline."""

    def __init__(self):
        self.textract = boto3.client('textract', region_name='us-east-1')
        self.s3 = boto3.client('s3', region_name='us-east-1')

    def process(self, bucket, key):
        """Process a document through the full pipeline."""
        # Determine document type and appropriate analysis
        if key.lower().endswith(('.jpg', '.jpeg', '.png')):
            return self._process_image(bucket, key)
        elif key.lower().endswith('.pdf'):
            return self._process_pdf(bucket, key)
        else:
            print(f"Unsupported format: {key}")
            return None

    def _process_image(self, bucket, key):
        """Process a single-page image document."""
        response = self.textract.analyze_document(
            Document={'S3Object': {'Bucket': bucket, 'Name': key}},
            FeatureTypes=['TABLES', 'FORMS']
        )
        return self._parse_response(response['Blocks'])

    def _process_pdf(self, bucket, key):
        """Process a multi-page PDF asynchronously."""
        job_id = start_async_analysis(bucket, key)
        blocks = get_async_results(job_id)
        return self._parse_response(blocks) if blocks else None

    def _parse_response(self, blocks):
        """Parse Textract blocks into structured output."""
        result = {
            'text': [],
            'tables': [],
            'forms': {}
        }

        for block in blocks:
            if block['BlockType'] == 'LINE':
                result['text'].append(block['Text'])

        result['full_text'] = '\n'.join(result['text'])
        return result

pipeline = DocumentPipeline()
result = pipeline.process('my-documents', 'inbox/document.pdf')
```

Textract is the foundation for intelligent document processing on AWS. For more advanced table and form extraction techniques, check out our guide on [extracting tables and forms with Textract](https://oneuptime.com/blog/post/2026-02-12-extract-tables-forms-amazon-textract/view). And for building complete IDP workflows, see [Amazon Textract with intelligent document processing](https://oneuptime.com/blog/post/2026-02-12-amazon-textract-intelligent-document-processing/view).
