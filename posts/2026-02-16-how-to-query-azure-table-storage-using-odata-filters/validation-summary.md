# Validation Summary: How to Query Azure Table Storage Using OData Filters

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Table Storage
- OData filters
- Azure Tables Python SDK
- Azure.Data.Tables .NET SDK
- Azure Table Storage REST API
- Python
- C#
- curl

## Sources Consulted
- Microsoft Learn: Querying tables and entities (REST API) - https://learn.microsoft.com/en-us/rest/api/storageservices/querying-tables-and-entities
- Microsoft Learn: Query Entities (REST API) - https://learn.microsoft.com/en-us/rest/api/storageservices/query-entities
- Microsoft Learn: Understanding the Table service data model - https://learn.microsoft.com/en-us/rest/api/storageservices/understanding-the-table-service-data-model
- Microsoft Learn: Azure Tables client library for Python samples - https://learn.microsoft.com/en-us/samples/azure/azure-sdk-for-python/tables-samples/
- Microsoft Learn: azure.data.tables.TableClient class - https://learn.microsoft.com/en-us/python/api/azure-data-tables/azure.data.tables.tableclient
- Microsoft Learn: TableClient.QueryAsync Method - https://learn.microsoft.com/en-us/dotnet/api/azure.data.tables.tableclient.queryasync
- Microsoft Learn: TableClient Class, CreateQueryFilter - https://learn.microsoft.com/en-us/dotnet/api/azure.data.tables.tableclient
- Microsoft Learn: Versioning for Azure Storage - https://learn.microsoft.com/en-us/rest/api/storageservices/versioning-for-the-azure-storage-services

## Issues Found
- The dynamic Python filter helper did not escape single quotes in string values. Updated it to double single quotes before wrapping the value, matching Azure Tables query formatting requirements.
- The dynamic Python filter helper did not provide a way to format 64-bit integer literals with the `L` suffix described earlier in the post. Added an `int64` value type branch.
- The .NET `TableClient.CreateQueryFilter` example used single-quoted string values inside C# interpolation, which would not compile because C# single quotes are for character literals. Updated the example to interpolate string literals.
- The REST API `curl` example omitted required authorization and date headers for a non-SAS Table Storage request. Added `x-ms-date` and an `Authorization` placeholder.
- The REST API example used an older service version. Updated `x-ms-version` to `2026-02-06`, the latest fully deployed Azure Storage service version documented as of the validation date.
- The limitation section recommended chaining `or` conditions for multi-value matching but did not mention the Azure Table service limit of 15 discrete comparisons in a filter string. Added that caveat.
- The "Select and Top" section used the Python SDK `results_per_page` parameter, which controls page size rather than a total `$top` limit. Renamed the section and comment to "Page Size" to match the SDK behavior.

## Review Notes
The post's core OData filter syntax, supported comparison and logical operators, string escaping rule, type-specific literal formats, unsupported wildcard/function-style querying, and PartitionKey/RowKey performance guidance are consistent with Microsoft documentation. The REST example still uses placeholder credentials; readers must compute a valid Shared Key Lite signature or use an appropriate SAS URL for a real request.
