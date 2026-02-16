# How to Extract Data from Invoices and Receipts with Azure Document Intelligence

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Document Intelligence, OCR, Invoices, Data Extraction, AI, Automation

Description: Automatically extract structured data from invoices and receipts using Azure Document Intelligence with pre-built and custom models.

---

Manually entering data from invoices and receipts into your systems is tedious, error-prone, and expensive. Azure Document Intelligence (formerly Azure Form Recognizer) automates this by using AI models specifically trained to understand the structure of business documents. It does not just extract text - it understands what the text means. It knows the difference between a vendor name, an invoice number, a line item description, and a total amount. In this post, I will show you how to use the pre-built invoice and receipt models to extract structured data automatically.

## What Azure Document Intelligence Can Do

Unlike general OCR (which just reads text), Document Intelligence extracts structured, typed data. For an invoice, that means:

- Vendor name and address
- Customer name and address
- Invoice number and date
- Due date
- Line items with descriptions, quantities, unit prices, and amounts
- Subtotal, tax, and total
- Payment terms
- Purchase order number

For receipts:
- Merchant name, address, and phone number
- Transaction date and time
- Individual items with prices
- Subtotal, tax, tip, and total
- Payment method

All of this is extracted automatically with high accuracy, structured into named fields that you can immediately use in your application.

## Step 1: Create a Document Intelligence Resource

In the Azure Portal:

1. Search for "Document Intelligence" in the marketplace.
2. Click "Create."
3. Select your subscription, resource group, and region.
4. Choose a pricing tier (Free F0 for testing - limited to 500 pages/month, Standard S0 for production).
5. Review and create.

Copy the endpoint and API key.

## Step 2: Install the SDK

```bash
# Install the Azure Document Intelligence SDK
pip install azure-ai-documentintelligence
```

## Step 3: Extract Data from an Invoice

The pre-built invoice model handles invoices from a wide variety of vendors without any custom training.

```python
from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.ai.documentintelligence.models import AnalyzeDocumentRequest
from azure.core.credentials import AzureKeyCredential

# Configure the client
endpoint = "https://your-resource.cognitiveservices.azure.com/"
key = "your-api-key"

client = DocumentIntelligenceClient(endpoint, AzureKeyCredential(key))

def extract_invoice_data(invoice_path):
    """
    Extract structured data from an invoice file.
    Supports PDF, JPEG, PNG, BMP, TIFF, and HEIF formats.
    """
    with open(invoice_path, "rb") as f:
        # Use the pre-built invoice model
        poller = client.begin_analyze_document(
            "prebuilt-invoice",
            body=f,
            content_type="application/octet-stream"
        )

    result = poller.result()

    invoices = []
    for doc in result.documents:
        invoice = {}
        fields = doc.fields

        # Extract vendor information
        if "VendorName" in fields:
            invoice["vendor_name"] = fields["VendorName"].content
            invoice["vendor_confidence"] = fields["VendorName"].confidence

        if "VendorAddress" in fields:
            invoice["vendor_address"] = fields["VendorAddress"].content

        # Extract invoice metadata
        if "InvoiceId" in fields:
            invoice["invoice_number"] = fields["InvoiceId"].content

        if "InvoiceDate" in fields:
            invoice["invoice_date"] = fields["InvoiceDate"].content

        if "DueDate" in fields:
            invoice["due_date"] = fields["DueDate"].content

        if "PurchaseOrder" in fields:
            invoice["purchase_order"] = fields["PurchaseOrder"].content

        # Extract customer information
        if "CustomerName" in fields:
            invoice["customer_name"] = fields["CustomerName"].content

        if "CustomerAddress" in fields:
            invoice["customer_address"] = fields["CustomerAddress"].content

        # Extract totals
        if "SubTotal" in fields:
            invoice["subtotal"] = fields["SubTotal"].content

        if "TotalTax" in fields:
            invoice["tax"] = fields["TotalTax"].content

        if "InvoiceTotal" in fields:
            invoice["total"] = fields["InvoiceTotal"].content

        if "AmountDue" in fields:
            invoice["amount_due"] = fields["AmountDue"].content

        # Extract line items
        if "Items" in fields:
            invoice["line_items"] = []
            for item in fields["Items"].value:
                line_item = {}
                item_fields = item.value
                if "Description" in item_fields:
                    line_item["description"] = item_fields["Description"].content
                if "Quantity" in item_fields:
                    line_item["quantity"] = item_fields["Quantity"].content
                if "UnitPrice" in item_fields:
                    line_item["unit_price"] = item_fields["UnitPrice"].content
                if "Amount" in item_fields:
                    line_item["amount"] = item_fields["Amount"].content
                invoice["line_items"].append(line_item)

        invoices.append(invoice)

    return invoices


# Extract data from an invoice
invoices = extract_invoice_data("sample_invoice.pdf")
for inv in invoices:
    print(f"Vendor: {inv.get('vendor_name', 'N/A')}")
    print(f"Invoice #: {inv.get('invoice_number', 'N/A')}")
    print(f"Date: {inv.get('invoice_date', 'N/A')}")
    print(f"Total: {inv.get('total', 'N/A')}")
    if "line_items" in inv:
        print(f"Line items:")
        for item in inv["line_items"]:
            print(f"  {item.get('description', 'N/A')} - {item.get('amount', 'N/A')}")
```

## Step 4: Extract Data from a Receipt

The receipt model handles retail receipts from restaurants, stores, and other merchants.

```python
def extract_receipt_data(receipt_path):
    """
    Extract structured data from a receipt image or PDF.
    Handles various receipt formats from different merchants.
    """
    with open(receipt_path, "rb") as f:
        poller = client.begin_analyze_document(
            "prebuilt-receipt",
            body=f,
            content_type="application/octet-stream"
        )

    result = poller.result()

    receipts = []
    for doc in result.documents:
        receipt = {}
        fields = doc.fields

        # Merchant details
        if "MerchantName" in fields:
            receipt["merchant_name"] = fields["MerchantName"].content
        if "MerchantAddress" in fields:
            receipt["merchant_address"] = fields["MerchantAddress"].content
        if "MerchantPhoneNumber" in fields:
            receipt["merchant_phone"] = fields["MerchantPhoneNumber"].content

        # Transaction details
        if "TransactionDate" in fields:
            receipt["date"] = fields["TransactionDate"].content
        if "TransactionTime" in fields:
            receipt["time"] = fields["TransactionTime"].content

        # Totals
        if "Subtotal" in fields:
            receipt["subtotal"] = fields["Subtotal"].content
        if "TotalTax" in fields:
            receipt["tax"] = fields["TotalTax"].content
        if "Tip" in fields:
            receipt["tip"] = fields["Tip"].content
        if "Total" in fields:
            receipt["total"] = fields["Total"].content

        # Items purchased
        if "Items" in fields:
            receipt["items"] = []
            for item in fields["Items"].value:
                item_data = {}
                item_fields = item.value
                if "Name" in item_fields:
                    item_data["name"] = item_fields["Name"].content
                if "TotalPrice" in item_fields:
                    item_data["price"] = item_fields["TotalPrice"].content
                if "Quantity" in item_fields:
                    item_data["quantity"] = item_fields["Quantity"].content
                receipt["items"].append(item_data)

        receipts.append(receipt)

    return receipts


# Process a receipt
receipts = extract_receipt_data("grocery_receipt.jpg")
for r in receipts:
    print(f"Merchant: {r.get('merchant_name', 'N/A')}")
    print(f"Date: {r.get('date', 'N/A')}")
    print(f"Total: {r.get('total', 'N/A')}")
```

## Step 5: Process from a URL

You can also process documents directly from URLs without downloading them first:

```python
def extract_invoice_from_url(invoice_url):
    """
    Extract invoice data from a document at a URL.
    Avoids downloading the file locally first.
    """
    poller = client.begin_analyze_document(
        "prebuilt-invoice",
        body=AnalyzeDocumentRequest(url_source=invoice_url)
    )

    result = poller.result()
    # Process the result the same as above
    return result
```

## Step 6: Batch Processing for Large Volumes

For processing many documents, submit them in parallel to maximize throughput.

```python
import concurrent.futures
import os

def process_invoice_folder(folder_path, max_workers=5):
    """
    Process all invoices in a folder concurrently.
    Uses a thread pool to parallelize API calls.
    """
    invoice_files = [
        os.path.join(folder_path, f)
        for f in os.listdir(folder_path)
        if f.lower().endswith(('.pdf', '.png', '.jpg', '.jpeg'))
    ]

    all_results = {}

    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Submit all files for processing
        future_to_file = {
            executor.submit(extract_invoice_data, filepath): filepath
            for filepath in invoice_files
        }

        # Collect results as they complete
        for future in concurrent.futures.as_completed(future_to_file):
            filepath = future_to_file[future]
            try:
                result = future.result()
                all_results[filepath] = result
                print(f"Processed: {os.path.basename(filepath)}")
            except Exception as e:
                print(f"Error processing {os.path.basename(filepath)}: {e}")
                all_results[filepath] = {"error": str(e)}

    return all_results


# Process a folder of invoices
results = process_invoice_folder("./invoices/", max_workers=5)
print(f"\nProcessed {len(results)} invoices")
```

## Working with Confidence Scores

Every extracted field comes with a confidence score between 0 and 1. Use these to implement validation logic:

```python
def validate_invoice(invoice_data, min_confidence=0.8):
    """
    Validate extracted invoice data using confidence scores.
    Flags fields that need human review.
    """
    needs_review = []

    for field_name, field_value in invoice_data.items():
        if isinstance(field_value, dict) and "confidence" in field_value:
            if field_value["confidence"] < min_confidence:
                needs_review.append({
                    "field": field_name,
                    "extracted_value": field_value.get("content"),
                    "confidence": field_value["confidence"]
                })

    if needs_review:
        print(f"Fields needing review ({len(needs_review)}):")
        for item in needs_review:
            print(f"  {item['field']}: '{item['extracted_value']}' "
                  f"(confidence: {item['confidence']:.2%})")
    else:
        print("All fields extracted with high confidence.")

    return needs_review
```

## Available Pre-Built Models

Azure Document Intelligence provides several pre-built models beyond invoices and receipts:

| Model | Use Case |
|-------|----------|
| prebuilt-invoice | Invoices from any vendor |
| prebuilt-receipt | Retail and restaurant receipts |
| prebuilt-idDocument | Identity documents (passports, driver licenses) |
| prebuilt-businessCard | Business cards |
| prebuilt-tax.us.w2 | US W-2 tax forms |
| prebuilt-healthInsuranceCard.us | US health insurance cards |
| prebuilt-layout | General document structure (tables, key-value pairs) |
| prebuilt-read | OCR-only text extraction |

## Wrapping Up

Azure Document Intelligence turns unstructured documents into structured data with minimal effort. The pre-built invoice and receipt models work out of the box with high accuracy across a wide range of document formats and vendors. For production systems, implement confidence-based validation to flag uncertain extractions for human review, use batch processing for high volumes, and consider custom models when the pre-built ones do not cover your specific document types. The combination of accurate extraction and structured output makes it straightforward to build document processing pipelines that eliminate manual data entry.
