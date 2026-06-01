# Validation Summary: How to Batch Process Documents with Azure Document Intelligence

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Document Intelligence
- Azure Blob Storage
- Azure Document Intelligence Python SDK (`azure-ai-documentintelligence`)
- Azure Storage Blob Python SDK (`azure-storage-blob`)
- Python `asyncio`
- Azure SQL Database
- `pyodbc`

## Sources Consulted
- Azure AI Document Intelligence Python SDK overview: https://learn.microsoft.com/en-us/python/api/overview/azure/ai-documentintelligence-readme?view=azure-python
- `DocumentIntelligenceClient` Python API reference: https://learn.microsoft.com/en-us/python/api/azure-ai-documentintelligence/azure.ai.documentintelligence.documentintelligenceclient?view=azure-python
- `DocumentField` Python API reference: https://learn.microsoft.com/en-us/python/api/azure-ai-documentintelligence/azure.ai.documentintelligence.models.documentfield?view=azure-python
- `AnalyzeBatchDocumentsRequest` Python API reference: https://learn.microsoft.com/en-us/python/api/azure-ai-documentintelligence/azure.ai.documentintelligence.models.analyzebatchdocumentsrequest?view=azure-python
- `AzureBlobContentSource` Python API reference: https://learn.microsoft.com/en-us/python/api/azure-ai-documentintelligence/azure.ai.documentintelligence.models.azureblobcontentsource?view=azure-python
- `AnalyzeBatchResult` Python API reference: https://learn.microsoft.com/en-us/python/api/azure-ai-documentintelligence/azure.ai.documentintelligence.models.analyzebatchresult?view=azure-python
- Azure Document Intelligence batch analysis documentation: https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/prebuilt/batch-analysis?view=doc-intel-4.0.0
- Azure Document Intelligence service limits: https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/service-limits?view=doc-intel-4.0.0
- Azure Document Intelligence model and input requirements: https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/concept-model-overview?view=doc-intel-4.0.0
- Azure Document Intelligence managed identities documentation: https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/managed-identities?view=doc-intel-4.0.0

## Issues Found
- The package install command included `asyncio`, which is part of the Python standard library, and omitted `pyodbc`, which is used later in the database example. Updated the command to install the Azure SDK packages, `aiohttp`, and `pyodbc`.
- The supported-format prerequisite implied Office files are generally supported for all models. Updated it to reflect that supported formats depend on the selected model, with Office/HTML support limited to specific v4.0 model categories.
- The async batch example built blob URLs from a storage connection string, which does not give the Document Intelligence service access to private blobs. Updated the example to accept a container SAS URL, list blobs with the async Blob Storage client, and pass blob URLs that retain the SAS token.
- The field extraction code used `field.value_type`, but the current `azure-ai-documentintelligence` SDK exposes the field data type as `field.type`. Updated the checks to use `field.type`.
- The batch API example used raw request dictionaries and printed `result.status`, but `AnalyzeBatchResult` exposes count and detail fields, not a top-level `status` field. Updated the example to use `AnalyzeBatchDocumentsRequest` and `AzureBlobContentSource`, and removed the invalid status print.
- The rate-limit description said "15 concurrent requests per second." Updated this to the documented S0 default of 15 analyze transactions per second.
- The database example stored the currency symbol in the `Currency` column. Updated it to store the resolved ISO currency code produced by `CurrencyValue.currency_code`.
- The runner example referenced `BatchDocumentProcessor` without importing it. Added the import.

## Review Notes
The code snippets were checked for Python syntax with `ast.parse`. The examples still use placeholder endpoints, keys, and SAS URLs, so live execution was not possible without Azure resources.
