# Validation Summary: How to Set Up a Data Catalog and Glossary in Microsoft Purview

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Microsoft Purview Data Catalog
- Microsoft Purview Business Glossary
- Microsoft Purview Data Map REST APIs
- Microsoft Purview Collections
- Python requests

## Sources Consulted
- Microsoft Purview glossary: https://learn.microsoft.com/en-us/purview/purview-glossary
- Glossary - Create Term REST API: https://learn.microsoft.com/en-us/rest/api/purview/datamapdataplane/glossary/create-term?view=rest-purview-datamapdataplane-2023-09-01
- Glossary - Assign Term To Entities REST API: https://learn.microsoft.com/en-us/rest/api/purview/datamapdataplane/glossary/assign-term-to-entities?view=rest-purview-datamapdataplane-2023-09-01
- Discovery - Query REST API: https://learn.microsoft.com/en-us/rest/api/purview/datamapdataplane/discovery/query?view=rest-purview-datamapdataplane-2023-09-01
- Entity - Create Or Update REST API: https://learn.microsoft.com/en-us/rest/api/purview/datamapdataplane/entity/create-or-update?view=rest-purview-datamapdataplane-2023-09-01
- Collections - Create Or Update Collection REST API: https://learn.microsoft.com/en-us/rest/api/purview/accountdataplane/collections/create-or-update-collection?view=rest-purview-accountdataplane-2019-11-01-preview
- How to manage term templates for business glossary: https://learn.microsoft.com/en-us/azure/purview/how-to-manage-term-templates
- Custom classifications in Microsoft Purview Data Map: https://learn.microsoft.com/en-us/purview/create-a-custom-classification-and-classification-rule

## Issues Found
- The post used older `/catalog/api` endpoints and the `2022-08-01-preview` search API version. Updated examples to the current documented `/datamap/api` data map endpoints with `api-version=2023-09-01`.
- The glossary term custom attributes were shown as a flat map. Updated the example to nest custom attributes under the term template name, matching the documented `map<string,map<string,object>>` shape.
- The example assigned a glossary term through the classifications endpoint, which applies classifications rather than glossary terms. Replaced it with the documented `POST /datamap/api/atlas/v2/glossary/terms/{termId}/assignedEntities` API.
- The collection example used display names with spaces as collection path names and used `root` as the root collection reference. Updated the example to use stable collection names, separate `friendlyName` values, and the Purview account name as the root collection reference.
- The search examples used unsupported field-qualified query strings for API searches. Replaced them with documented discovery `filter` examples for classification, collection, and glossary term searches.
- The SSN classification example used an imprecise classification identifier. Updated it to the documented Microsoft namespace example `MICROSOFT.GOVERNMENT.US.SOCIAL_SECURITY_NUMBER`.
- The entity update example used the older catalog endpoint. Updated it to the documented data map entity create/update endpoint.
- The term template attribute examples used generic `"type": "string"` values. Updated them to field types used by the Purview term template UI, such as `Text` and `Date`.

## Review Notes
The tutorial is technically relevant and salvageable. The code snippets are illustrative and still require a valid OAuth access token, Purview account, glossary GUID, permissions, and real asset GUIDs in the reader's environment.
