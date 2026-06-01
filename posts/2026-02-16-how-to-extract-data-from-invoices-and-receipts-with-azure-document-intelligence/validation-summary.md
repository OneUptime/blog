# Validation Summary: How to Extract Data from Invoices and Receipts with Azure Document Intelligence

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure AI Document Intelligence
- Azure AI Document Intelligence Python SDK (`azure-ai-documentintelligence`)
- Python
- OCR and structured document extraction
- Prebuilt invoice and receipt models

## Sources Consulted
- Microsoft Learn: Azure AI Document Intelligence Python SDK overview - https://learn.microsoft.com/en-us/python/api/overview/azure/ai-documentintelligence-readme?view=azure-python
- Microsoft Learn: `DocumentIntelligenceClient.begin_analyze_document` API reference - https://learn.microsoft.com/en-us/python/api/azure-ai-documentintelligence/azure.ai.documentintelligence.documentintelligenceclient?view=azure-python
- Microsoft Learn: `AnalyzeDocumentRequest` API reference - https://learn.microsoft.com/en-us/python/api/azure-ai-documentintelligence/azure.ai.documentintelligence.models.analyzedocumentrequest?view=azure-python
- Microsoft Learn: `DocumentField` API reference - https://learn.microsoft.com/en-us/python/api/azure-ai-documentintelligence/azure.ai.documentintelligence.models.documentfield?view=azure-python
- Microsoft Learn: Document Intelligence invoice model - https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/prebuilt/invoice?view=doc-intel-4.0.0
- Microsoft Learn: Document Intelligence receipt model - https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/prebuilt/receipt?view=doc-intel-4.0.0
- Azure Samples: 2024-11-30 GA invoice schema - https://github.com/Azure-Samples/document-intelligence-code-samples/blob/main/schema/2024-11-30-ga/invoice.md
- Azure Samples: 2024-11-30 GA receipt schema - https://github.com/Azure-Samples/document-intelligence-code-samples/blob/main/schema/2024-11-30-ga/receipt.md
- Azure Samples: Python v4.0 prebuilt invoice and receipt samples - https://github.com/Azure-Samples/document-intelligence-code-samples
- Microsoft Azure pricing page for Document Intelligence - https://azure.microsoft.com/pricing/details/document-intelligence/

## Issues Found
- The invoice and receipt examples used `fields["Items"].value` and `item.value` for arrays and objects. The current Python SDK exposes these as `value_array` and `value_object` on `DocumentField`, so the examples were updated accordingly.
- The receipt item example looked for an item field named `Name`. The current 2024-11-30 GA receipt schema uses `Items.*.Description`, so the example now reads `Description`.
- The confidence-validation helper expected each extracted field to be a dictionary with `content` and `confidence`, but the extraction examples returned plain values plus a separate `vendor_confidence`. The helper was updated to validate `*_confidence` values against the corresponding extracted field, and the surrounding text now clarifies that production code should store confidence values for each field it wants to validate.

## Review Notes
The SDK package name, client class, `begin_analyze_document` usage, `AnalyzeDocumentRequest(url_source=...)`, model IDs (`prebuilt-invoice` and `prebuilt-receipt`), pricing-tier guidance, and listed prebuilt model IDs were consistent with current Microsoft documentation. The post intentionally uses `.content` for display values; that property remains available on `DocumentField`, though typed values such as `value_string`, `value_currency`, and `value_date` are often preferable for production processing.
