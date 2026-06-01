# Validation Summary: How to Create a Search Index in Azure AI Search from Azure Blob Storage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure AI Search
- Azure Blob Storage
- Azure AI Search indexers
- Azure AI Search skillsets and AI enrichment
- Azure SDK for Python
- Python

## Sources Consulted
- Microsoft Learn: Index data from Azure Blob Storage - https://learn.microsoft.com/en-us/azure/search/search-how-to-index-azure-blob-storage
- Microsoft Learn: Create a search index in Azure AI Search - https://learn.microsoft.com/en-us/azure/search/search-how-to-create-search-index
- Microsoft Learn: Field mappings and transformations using Azure AI Search indexers - https://learn.microsoft.com/en-us/azure/search/search-indexer-field-mappings
- Microsoft Learn: Map enriched output to fields in a search index - https://learn.microsoft.com/en-us/azure/search/cognitive-search-output-field-mapping
- Microsoft Learn: Run or reset indexers, skills, or documents - https://learn.microsoft.com/en-us/azure/search/search-howto-run-reset-indexers
- Microsoft Learn: Schedule an indexer in Azure AI Search - https://learn.microsoft.com/en-us/azure/search/search-howto-schedule-indexers
- Microsoft Learn: OData search.score function in Azure AI Search - https://learn.microsoft.com/en-us/azure/search/search-query-odata-search-score-function
- Microsoft Learn: Index CSV blobs and files using delimitedText parsing mode - https://learn.microsoft.com/en-us/azure/search/search-how-to-index-azure-blob-csv
- Microsoft Learn: Attach an Azure AI services resource to a skillset - https://learn.microsoft.com/en-us/azure/search/cognitive-search-attach-cognitive-services
- Microsoft Learn Python SDK reference: azure-search-documents models - https://learn.microsoft.com/en-us/python/api/azure-search-documents/azure.search.documents.indexes.models

## Issues Found
- The index schema used `metadata_content_type`, but the Azure Blob indexer exposes the standard blob content type as `metadata_storage_content_type`. Updated the field name and the advanced search filter/facet references.
- The `keyphrases` field used `SearchableField` with a `Collection(String)` type. Current Python SDK usage requires a collection flag on `SearchableField` or a `SearchField` with `searchable=True`; the original form can serialize incorrectly as `Edm.String`. Changed it to `SearchField` with `Collection(SearchFieldDataType.String)` and `searchable=True`.
- The indexer field mapping used a raw dictionary for `mapping_function`. Updated it to `FieldMappingFunction(name="base64Encode")` to match the SDK model.
- The advanced search example sorted by `@search.score desc`, but Azure AI Search OData order-by syntax requires `search.score() desc`. Updated the `order_by` expression.

## Review Notes
- The post's core flow is technically valid: create a blob data source, index, optional skillset, indexer, monitor status, query, and schedule incremental runs.
- The CSV row-per-document behavior requires `delimitedText` parsing mode; with the default parsing mode, a CSV blob is treated as one search document. The supported-formats table now remains a high-level format list, but a future expansion could call out parsing-mode-specific behavior.
- Built-in AI enrichment is free only for a small allocation unless an Azure AI services multi-service resource is attached for billing. This is acceptable for the tutorial's optional skillset, but production guidance should mention the billing resource explicitly.
