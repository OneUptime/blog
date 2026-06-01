# Validation Summary: Query Data in Azure Blob Storage Using Azure Blob Storage Query Acceleration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Blob Storage
- Azure Data Lake Storage query acceleration
- Azure Storage Query Blob Contents REST API
- Azure Storage Blob SDK for Python
- CSV and JSON Lines
- Azure Data Factory and Azure Synapse pipelines

## Sources Consulted
- Azure Data Lake Storage query acceleration: https://learn.microsoft.com/en-us/azure/storage/blobs/data-lake-storage-query-acceleration
- Filter data by using Azure Data Lake Storage query acceleration: https://learn.microsoft.com/en-us/azure/storage/blobs/data-lake-storage-query-acceleration-how-to
- Query acceleration SQL language reference: https://learn.microsoft.com/en-us/azure/storage/blobs/query-acceleration-sql-reference
- Query Blob Contents REST API: https://learn.microsoft.com/en-us/rest/api/storageservices/query-blob-contents
- Azure Storage Blob SDK for Python BlobClient.query_blob: https://learn.microsoft.com/en-us/python/api/azure-storage-blob/azure.storage.blob.blobclient?view=azure-python
- Azure Storage Blob SDK for Python DelimitedTextDialect: https://learn.microsoft.com/en-us/python/api/azure-storage-blob/azure.storage.blob.delimitedtextdialect?view=azure-python
- Azure Storage Blob SDK for Python DelimitedJsonDialect: https://learn.microsoft.com/en-us/python/api/azure-storage-blob/azure.storage.blob.delimitedjsondialect?view=azure-python
- Azure Storage Blob SDK for Python BlobQueryError: https://learn.microsoft.com/en-us/python/api/azure-storage-blob/azure.storage.blob.blobqueryerror?view=azure-python
- Azure Data Factory Azure Blob Storage connector: https://learn.microsoft.com/en-us/azure/data-factory/connector-azure-blob-storage

## Issues Found
- The first Python example passed custom dictionaries as `blob_format` and `output_format`; the current Python SDK documents `DelimitedTextDialect`, `DelimitedJsonDialect`, `QuickQueryDialect`, or strings. Updated the example to use `DelimitedTextDialect`.
- The prerequisites said BlobStorage accounts were supported and only mentioned Hot or Cool tiers. The official how-to lists a general-purpose v2 storage account, and the REST documentation lists block blob, infrastructure encryption, and CSV/JSON limitations, so the prerequisite list was corrected.
- Numeric comparisons in CSV and JSON examples used quoted string literals. Updated the filters to use `CAST(... AS FLOAT)` so the threshold comparisons are numeric and not dependent on string comparison behavior.
- The SQL syntax section listed unsupported or undocumented items such as `CHARINDEX`, `LIKE`, `IS NULL`, and `IS NOT NULL`, and incorrectly said aggregations were unsupported. Updated it to reflect the documented operators, string functions, aggregate expressions, and JSON `IS MISSING` operator.
- The Azure Data Factory section claimed Copy activity directly uses Query Acceleration from source settings. The Azure Blob Storage connector documentation does not expose that capability, so the section now recommends invoking the REST API or SDK from a custom pipeline step.
- The cost section said scanning cost is the same as downloading the full blob. Updated it to state that Query Acceleration requests incur read transaction charges plus data scanned and data returned charges.
- The conclusion said aggregations require another compute engine. Updated it to refer to grouped aggregations, joins, and sorting.

## Review Notes
The examples are documentation-aligned, but they are illustrative and were not executed against a live Azure Storage account. The local environment did not have the Azure SDK for Python installed, so validation was performed against current Microsoft Learn documentation.
