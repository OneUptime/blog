# Validation Summary: How to Configure an Indexer with Skillsets in Azure AI Search for AI Enrichment

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure AI Search
- Azure AI Search indexers
- Azure AI Search skillsets
- Azure Blob Storage data sources
- Azure AI services / built-in cognitive skills
- Custom Web API skills
- Azure AI Search REST API

## Sources Consulted
- Microsoft Learn: Data Sources - Create REST API, https://learn.microsoft.com/en-us/rest/api/searchservice/data-sources/create?view=rest-searchservice-2024-07-01
- Microsoft Learn: Skillsets - Create Or Update REST API, https://learn.microsoft.com/en-us/rest/api/searchservice/skillsets/create-or-update?view=rest-searchservice-2024-07-01
- Microsoft Learn: Indexes - Create REST API, https://learn.microsoft.com/en-us/rest/api/searchservice/indexes/create?view=rest-searchservice-2024-07-01
- Microsoft Learn: Indexers - Create REST API, https://learn.microsoft.com/en-us/rest/api/searchservice/indexers/create?view=rest-searchservice-2024-07-01
- Microsoft Learn: Skillset concepts, https://learn.microsoft.com/en-us/azure/search/cognitive-search-working-with-skillsets
- Microsoft Learn: Entity Recognition cognitive skill (V3), https://learn.microsoft.com/en-us/azure/search/cognitive-search-skill-entity-recognition-v3
- Microsoft Learn: Field mappings and transformations using Azure AI Search indexers, https://learn.microsoft.com/en-us/azure/search/search-indexer-field-mappings
- Microsoft Learn: Azure Blob indexer, https://learn.microsoft.com/en-us/azure/search/search-howto-indexing-azure-blob-storage
- Microsoft Learn: Run or reset indexers, https://learn.microsoft.com/en-us/azure/search/search-howto-run-reset-indexers
- Microsoft Learn: Troubleshoot common indexer errors and warnings, https://learn.microsoft.com/en-us/azure/search/cognitive-search-common-errors-warnings
- Microsoft Learn: Custom skill interface, https://learn.microsoft.com/en-us/azure/search/cognitive-search-custom-skill-interface
- Microsoft Learn: Service limits in Azure AI Search, https://learn.microsoft.com/en-us/azure/search/search-limits-quotas-capacity

## Issues Found
- The REST request body examples were labeled as JSON but contained `//` comments, which are not valid JSON payloads. I moved endpoint notes into prose and removed inline comments from the request bodies.
- The prerequisite said skillsets require Basic tier or higher. Microsoft Learn lists limited skillset support on the Free tier, so I changed the wording to Free for limited testing and Basic or higher for production workloads.
- The indexer field mapping base64-encoded `metadata_storage_path` into the `metadata_storage_path` field. I removed the mapping function from that field so the original path is preserved, while keeping Base64 encoding for the document key.
- The truncation warning said documents exceeding 64,000 characters are truncated by default. The extraction limit depends on the pricing tier, with 64,000 characters applying to Basic, so I updated the wording to be tier-specific.

## Review Notes
The article uses API version `2024-07-01`, which is still documented for the REST APIs reviewed. Microsoft documentation also shows newer API versions, so a future update could refresh examples to the latest stable API version if the blog standard requires it.
