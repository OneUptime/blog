# Validation Summary: How to Build a SharePoint Search Solution Powered by Azure Cognitive Search

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- SharePoint
- Azure AI Search / Azure Cognitive Search
- Microsoft Graph
- Azure Functions for .NET
- SharePoint Framework (SPFx)
- Fluent UI React
- Azure AI Search skillsets and scoring profiles

## Sources Consulted
- Microsoft Learn: Azure CLI `az search service create` reference - https://learn.microsoft.com/en-us/cli/azure/search/service?view=azure-cli-latest
- Microsoft Learn: Create an index in Azure AI Search - https://learn.microsoft.com/en-us/azure/search/search-how-to-create-search-index
- Microsoft Learn: Azure AI Search naming rules - https://learn.microsoft.com/en-us/rest/api/searchservice/naming-rules
- Microsoft Learn: Azure AI Search indexers overview - https://learn.microsoft.com/en-us/azure/search/search-indexer-overview
- Microsoft Learn: Azure AI Search skillset concepts - https://learn.microsoft.com/en-us/azure/search/cognitive-search-working-with-skillsets
- Microsoft Learn: Entity Recognition cognitive skill v3 - https://learn.microsoft.com/en-us/azure/search/cognitive-search-skill-entity-recognition-v3
- Microsoft Learn: Azure AI Search scoring profiles - https://learn.microsoft.com/en-us/azure/search/index-add-scoring-profiles
- Microsoft Learn: Azure AI Search REST API versions - https://learn.microsoft.com/en-us/rest/api/searchservice/search-service-api-versions
- Microsoft Learn: Microsoft Graph listItem resource - https://learn.microsoft.com/en-us/graph/api/resources/listitem?view=graph-rest-1.0
- Microsoft Learn: Microsoft Graph driveItem resource and download content - https://learn.microsoft.com/en-us/graph/api/resources/driveitem?view=graph-rest-1.0 and https://learn.microsoft.com/en-us/graph/api/driveitem-get-content?view=graph-rest-1.0
- Microsoft Learn: Connect to Entra ID-secured APIs in SPFx with AadHttpClient - https://learn.microsoft.com/en-us/sharepoint/dev/spfx/use-aadhttpclient

## Issues Found
- The post described Azure AI Search skillsets as running automatically after documents are pushed with `SearchClient`. Skillsets are attached to Azure AI Search indexers and run during indexer execution, so I clarified the push-model versus indexer-model behavior and adjusted the architecture and wrap-up text.
- The entity recognition skill used the older `#Microsoft.Skills.Text.EntityRecognitionSkill` type and an invalid generic `entities` output. I updated it to `#Microsoft.Skills.Text.V3.EntityRecognitionSkill` and mapped the documented category outputs to matching string collection fields.
- The Azure AI Search document key was built from raw SharePoint IDs. Azure AI Search document keys have restricted characters, so I changed the sample to generate a URL-safe Base64 key.
- The Microsoft Graph content download path used the site's default drive, which fails for document libraries outside that drive. I changed the sample to use the `driveItem.parentReference.driveId` and retrieve content via `/drives/{drive-id}/items/{item-id}/content`.
- The Microsoft Graph list filtering sample used an OData filter on `list/template`. I changed it to retrieve lists and filter document libraries in code using the list template property, which is the safer supported pattern.
- The SPFx sample exposed an Azure AI Search API key in client-side code. I changed the sample to use `AadHttpClient` with Entra ID authentication and removed unused imports.
- The facet filter construction did not escape single quotes in selected facet values. I added OData string escaping before building filter expressions.

## Review Notes
The Azure AI Search REST API version `2023-11-01` used in the search request is still listed as a stable version, although newer stable versions exist. The C# snippets remain illustrative and omit production concerns such as paging Graph results, honoring SharePoint permissions in the search layer, parsing binary Office/PDF formats before push indexing, and retry/backoff handling.
