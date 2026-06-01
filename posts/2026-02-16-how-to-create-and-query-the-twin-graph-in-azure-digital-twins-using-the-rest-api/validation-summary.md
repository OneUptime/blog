# Validation Summary: How to Create and Query the Twin Graph in Azure Digital Twins Using the REST API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Digital Twins
- Azure Digital Twins data plane REST API
- Azure Digital Twins query language
- Azure Digital Twins Core client library for Python
- Azure Identity client library for Python
- Azure CLI
- JSON Patch
- Mermaid

## Sources Consulted
- Azure Digital Twins REST API reference: Twins - DigitalTwins Add: https://learn.microsoft.com/en-us/rest/api/digital-twins/dataplane/twins/digital-twins-add?view=rest-dataplane-2023-10-31
- Azure Digital Twins REST API reference: Query - Query Twins: https://learn.microsoft.com/en-us/rest/api/digital-twins/dataplane/query/query-twins?view=rest-dataplane-2023-10-31
- Call the Azure Digital Twins APIs: https://learn.microsoft.com/en-us/azure/digital-twins/how-to-use-apis
- Azure Digital Twins query language: https://learn.microsoft.com/en-us/azure/digital-twins/concepts-query-language
- Query the Azure Digital Twins twin graph: https://learn.microsoft.com/en-us/azure/digital-twins/how-to-query-graph
- Azure Digital Twins query language reference: SELECT clause: https://learn.microsoft.com/en-us/azure/digital-twins/reference-query-clause-select
- Azure Digital Twins query language reference: Functions: https://learn.microsoft.com/en-us/azure/digital-twins/reference-query-functions
- Azure Digital Twins Core client library for Python: https://learn.microsoft.com/en-us/python/api/overview/azure/digitaltwins-core-readme?view=azure-python
- Azure Identity client library for Python: https://learn.microsoft.com/en-us/python/api/overview/azure/identity-readme?view=azure-python
- Azure CLI `az account get-access-token`: https://learn.microsoft.com/en-us/cli/azure/account?view=azure-cli-lts#az-account-get-access-token

## Issues Found
- The post tagged the article with "Kusto Query", but the examples use the Azure Digital Twins SQL-like query language, not Kusto Query Language. Removed the Kusto tag.
- The REST API examples used `api-version=2022-05-31`. Updated them to the current documented data plane API version, `2023-10-31`.
- The Azure CLI access-token example used `https://digitaltwins.azure.net` as the token resource. Updated it to the documented Azure Digital Twins data plane resource ID, `0b07f429-9f4b-4714-9392-cc5e8e80c8b0`.
- The Python prerequisite said Python 3.8+, but current Azure SDK for Python guidance and `azure-identity` documentation require Python 3.9 or later. Updated the prerequisite to Python 3.9+.
- The SDK query example attempted `SELECT sensor.sensorType, COUNT()` without a `GROUP BY`, which is not valid in the documented Azure Digital Twins query language examples. Changed it to a valid `SELECT COUNT()` sensor count query.
- The JSON Patch example used `replace` on `/temperature`, but the created Room twins in the article do not define a `temperature` property. Changed the example to replace the existing `/status` property.
- The conclusion said the query language supports "aggregations"; the reviewed docs specifically document counting result sets in this context. Changed the wording to "counting result sets."

## Review Notes
The examples assume that the referenced DTDL models define the properties and relationships shown in the article. Azure Digital Twins query results can take up to about 10 seconds to reflect graph changes, while direct DigitalTwins API reads reflect changes immediately.
