# How to Batch Process Documents with Azure Document Intelligence

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Document Intelligence, Document Processing, OCR, Form Recognition, Batch Processing, Python, Azure AI

Description: Learn how to batch process large volumes of documents using Azure Document Intelligence for automated data extraction at scale.

---

Processing a single document with Azure Document Intelligence (formerly Form Recognizer) is straightforward. But when you have thousands of invoices, receipts, or contracts sitting in a storage account, you need a different approach. Batch processing lets you submit many documents at once, process them in parallel, and collect results efficiently.

Azure Document Intelligence offers several approaches for batch processing: the Batch Analyze API for native batch support, parallel async calls for custom orchestration, and integration with Azure Data Factory for pipeline-based workflows. In this guide, I will cover the most practical approaches for handling large document volumes.

## When You Need Batch Processing

Batch processing makes sense in several scenarios:

- Monthly invoice processing where hundreds of invoices arrive at once
- Document migration projects where you need to extract data from legacy paper archives
- Compliance audits that require analyzing thousands of contracts
- Data entry automation where forms pile up during business hours and get processed overnight

## Prerequisites

- An Azure Document Intelligence resource (S0 tier recommended for production workloads)
- An Azure Storage account with a container holding your documents
- Python 3.9+ with the `azure-ai-documentintelligence` package
- Documents in supported formats (PDF, JPEG, PNG, TIFF, BMP, DOCX, XLSX, PPTX)

```bash
# Install the required packages
pip install azure-ai-documentintelligence azure-storage-blob asyncio aiohttp
```

## Understanding the Processing Models

Azure Document Intelligence provides several pre-built models:

| Model | Use Case |
|-------|----------|
| prebuilt-invoice | Invoices |
| prebuilt-receipt | Receipts |
| prebuilt-layout | General document layout and tables |
| prebuilt-read | Text extraction (OCR) |
| prebuilt-idDocument | Identity documents |
| prebuilt-tax.us.w2 | US W-2 tax forms |

You can also train custom models for your specific document types.

## Approach 1: Parallel Async Processing

The most flexible approach is to submit multiple documents in parallel using async Python. This gives you full control over concurrency, error handling, and result processing.

```python
# batch_processor.py - Process documents in parallel using async calls
import asyncio
import json
from azure.ai.documentintelligence.aio import DocumentIntelligenceClient
from azure.ai.documentintelligence.models import AnalyzeDocumentRequest
from azure.core.credentials import AzureKeyCredential
from azure.storage.blob import BlobServiceClient

class BatchDocumentProcessor:
    """Process multiple documents in parallel using Azure Document Intelligence."""

    def __init__(self, endpoint: str, key: str, storage_conn_str: str):
        # Initialize the Document Intelligence async client
        self.client = DocumentIntelligenceClient(
            endpoint=endpoint,
            credential=AzureKeyCredential(key)
        )
        # Initialize the blob storage client for reading documents
        self.blob_service = BlobServiceClient.from_connection_string(storage_conn_str)
        # Control concurrency to avoid hitting rate limits
        self.semaphore = asyncio.Semaphore(10)

    async def process_single_document(self, blob_url: str, model_id: str) -> dict:
        """
        Process a single document and return extracted data.
        Uses a semaphore to limit concurrent requests.
        """
        async with self.semaphore:
            try:
                # Start the analysis operation
                poller = await self.client.begin_analyze_document(
                    model_id=model_id,
                    analyze_request=AnalyzeDocumentRequest(url_source=blob_url),
                )

                # Wait for the operation to complete
                result = await poller.result()

                return {
                    "blob_url": blob_url,
                    "status": "success",
                    "documents": self._extract_fields(result),
                    "pages": len(result.pages) if result.pages else 0
                }

            except Exception as e:
                return {
                    "blob_url": blob_url,
                    "status": "error",
                    "error": str(e)
                }

    def _extract_fields(self, result) -> list:
        """Extract key fields from the analysis result."""
        documents = []
        if result.documents:
            for doc in result.documents:
                fields = {}
                for name, field in doc.fields.items():
                    # Extract the field value based on its type
                    if field.value_type == "string":
                        fields[name] = field.value_string
                    elif field.value_type == "number":
                        fields[name] = field.value_number
                    elif field.value_type == "date":
                        fields[name] = str(field.value_date)
                    elif field.value_type == "currency":
                        fields[name] = {
                            "amount": field.value_currency.amount,
                            "symbol": field.value_currency.currency_symbol
                        }
                    else:
                        fields[name] = field.content
                documents.append(fields)
        return documents

    async def process_batch(self, container_name: str, model_id: str,
                           prefix: str = None) -> list:
        """
        Process all documents in a blob container (or those matching a prefix).
        Returns a list of results for each document.
        """
        # List all blobs in the container
        container_client = self.blob_service.get_container_client(container_name)
        blobs = []
        for blob in container_client.list_blobs(name_starts_with=prefix):
            # Build the full blob URL with SAS token or use managed identity
            blob_url = f"{self.blob_service.url}{container_name}/{blob.name}"
            blobs.append(blob_url)

        print(f"Found {len(blobs)} documents to process")

        # Process all documents in parallel (limited by semaphore)
        tasks = [
            self.process_single_document(url, model_id)
            for url in blobs
        ]
        results = await asyncio.gather(*tasks)

        # Summarize results
        success_count = sum(1 for r in results if r["status"] == "success")
        error_count = sum(1 for r in results if r["status"] == "error")
        print(f"Processed: {success_count} successful, {error_count} failed")

        return results

    async def close(self):
        """Close the async client."""
        await self.client.close()
```

## Running the Batch Processor

Here is how to use the batch processor:

```python
# run_batch.py - Execute batch document processing
import asyncio
import json

async def main():
    processor = BatchDocumentProcessor(
        endpoint="https://your-resource.cognitiveservices.azure.com/",
        key="your-api-key",
        storage_conn_str="DefaultEndpointsProtocol=https;AccountName=..."
    )

    try:
        # Process all invoices in the 'invoices' container
        results = await processor.process_batch(
            container_name="invoices",
            model_id="prebuilt-invoice",
            prefix="2026/02/"  # Only process February 2026 invoices
        )

        # Save results to a JSON file for downstream processing
        with open("batch_results.json", "w") as f:
            json.dump(results, f, indent=2, default=str)

        # Print a summary of extracted data
        for result in results:
            if result["status"] == "success" and result["documents"]:
                doc = result["documents"][0]
                print(f"Invoice: {doc.get('InvoiceId', 'N/A')}")
                print(f"  Vendor: {doc.get('VendorName', 'N/A')}")
                print(f"  Total: {doc.get('InvoiceTotal', 'N/A')}")
                print()

    finally:
        await processor.close()

# Run the async main function
asyncio.run(main())
```

## Approach 2: Using the Batch Analyze API

Azure Document Intelligence also provides a dedicated batch analysis endpoint that accepts multiple documents in a single API call. This is simpler to use when your documents are in Azure Blob Storage.

```python
# batch_api.py - Use the native Batch Analyze API
from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.core.credentials import AzureKeyCredential

client = DocumentIntelligenceClient(
    endpoint="https://your-resource.cognitiveservices.azure.com/",
    credential=AzureKeyCredential("your-api-key")
)

# Start a batch analysis operation
# The source is a blob container with a SAS URL
poller = client.begin_analyze_batch_documents(
    model_id="prebuilt-invoice",
    analyze_batch_request={
        "azureBlobSource": {
            "containerUrl": "https://yourstorage.blob.core.windows.net/invoices?sv=...",
            "prefix": "2026/02/"
        },
        "resultContainerUrl": "https://yourstorage.blob.core.windows.net/results?sv=...",
        "resultPrefix": "invoice-results/"
    }
)

# Wait for the batch to complete
result = poller.result()
print(f"Batch processing complete. Status: {result.status}")
print(f"Succeeded: {result.succeeded_count}")
print(f"Failed: {result.failed_count}")
print(f"Skipped: {result.skipped_count}")
```

The batch API writes results as JSON files to the specified result container. Each input document gets a corresponding result file.

## Handling Rate Limits

Azure Document Intelligence has rate limits based on your pricing tier. The S0 tier allows 15 concurrent requests per second. If you exceed this, you will get 429 (Too Many Requests) errors.

The semaphore in our async processor helps, but you should also add retry logic:

```python
# retry_logic.py - Add exponential backoff for rate limit handling
import asyncio
import random

async def process_with_retry(self, blob_url: str, model_id: str,
                              max_retries: int = 3) -> dict:
    """Process a document with exponential backoff retry on rate limits."""
    for attempt in range(max_retries):
        result = await self.process_single_document(blob_url, model_id)

        if result["status"] == "success":
            return result

        # Check if the error is a rate limit issue
        if "429" in result.get("error", "") or "throttled" in result.get("error", "").lower():
            # Exponential backoff with jitter
            wait_time = (2 ** attempt) + random.uniform(0, 1)
            print(f"Rate limited. Retrying in {wait_time:.1f}s (attempt {attempt + 1})")
            await asyncio.sleep(wait_time)
        else:
            # Non-retryable error, return immediately
            return result

    return result  # Return the last result after all retries
```

## Post-Processing Results

After batch processing, you typically want to load the extracted data into a database or data warehouse. Here is an example that writes results to Azure SQL Database:

```python
# save_results.py - Write extracted invoice data to Azure SQL Database
import pyodbc
import json

def save_to_database(results: list, connection_string: str):
    """Save extracted invoice data to Azure SQL Database."""
    conn = pyodbc.connect(connection_string)
    cursor = conn.cursor()

    # Create the table if it does not exist
    cursor.execute("""
        IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ExtractedInvoices')
        CREATE TABLE ExtractedInvoices (
            Id INT IDENTITY PRIMARY KEY,
            SourceFile NVARCHAR(500),
            InvoiceId NVARCHAR(100),
            VendorName NVARCHAR(200),
            InvoiceDate DATE,
            TotalAmount DECIMAL(18,2),
            Currency NVARCHAR(10),
            ProcessedAt DATETIME DEFAULT GETDATE()
        )
    """)

    # Insert each successfully processed document
    for result in results:
        if result["status"] != "success" or not result["documents"]:
            continue

        doc = result["documents"][0]
        total = doc.get("InvoiceTotal", {})

        cursor.execute("""
            INSERT INTO ExtractedInvoices
                (SourceFile, InvoiceId, VendorName, InvoiceDate, TotalAmount, Currency)
            VALUES (?, ?, ?, ?, ?, ?)
        """,
            result["blob_url"],
            doc.get("InvoiceId"),
            doc.get("VendorName"),
            doc.get("InvoiceDate"),
            total.get("amount") if isinstance(total, dict) else None,
            total.get("symbol") if isinstance(total, dict) else None
        )

    conn.commit()
    cursor.close()
    conn.close()
    print(f"Saved {len(results)} invoice records to database")
```

## Summary

Batch processing with Azure Document Intelligence turns a manual, one-at-a-time document review into an automated pipeline that handles thousands of documents without human intervention. Whether you use the parallel async approach for maximum flexibility or the native batch API for simplicity, the key ingredients are the same: list your documents from blob storage, submit them for analysis with appropriate concurrency controls, handle rate limits with retries, and push the extracted data into your downstream systems. For recurring workflows, wrap this in an Azure Function triggered by a blob upload event or a timer, and you have a fully automated document processing pipeline.
