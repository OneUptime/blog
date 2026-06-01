# Validation Summary: How to Set Up a Knowledge Store in Azure AI Search to Persist Enriched Data

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure AI Search
- Azure AI Search skillsets and indexers
- Azure AI Search knowledge stores
- Azure Table Storage
- Azure Blob Storage
- Azure AI services cognitive skills
- Azure Tables Python SDK
- REST API and curl

## Sources Consulted
- Microsoft Learn: Knowledge store in Azure AI Search - https://learn.microsoft.com/en-us/azure/search/knowledge-store-concept-intro
- Microsoft Learn: Knowledge store projections in Azure AI Search - https://learn.microsoft.com/en-us/azure/search/knowledge-store-projection-overview
- Microsoft Learn: Shaping data for projection into a knowledge store - https://learn.microsoft.com/en-us/azure/search/knowledge-store-projection-shape
- Microsoft Learn: Create a knowledge store using REST - https://learn.microsoft.com/en-us/azure/search/knowledge-store-create-rest
- Microsoft Learn: Key Phrase Extraction cognitive skill - https://learn.microsoft.com/en-us/azure/search/cognitive-search-skill-keyphrases
- Microsoft Learn: Entity Recognition cognitive skill v3 - https://learn.microsoft.com/en-us/azure/search/cognitive-search-skill-entity-recognition-v3
- Microsoft Learn: Shaper cognitive skill - https://learn.microsoft.com/en-us/azure/search/cognitive-search-skill-shaper
- Microsoft Learn: Attach a billable resource to a skillset in Azure AI Search - https://learn.microsoft.com/en-us/azure/search/cognitive-search-attach-cognitive-services
- Microsoft Learn: Data plane REST API versions for Azure AI Search - https://learn.microsoft.com/en-us/rest/api/searchservice/search-service-api-versions
- Microsoft Learn: Create and run indexers in Azure AI Search - https://learn.microsoft.com/en-us/azure/search/search-howto-run-reset-indexers
- Microsoft Learn: Azure Tables client library for Python - https://learn.microsoft.com/en-us/python/api/overview/azure/data-tables-readme

## Issues Found
- The main skillset request body was labeled as JSON but contained JavaScript-style comments and an inline REST request line. I moved the REST method and URL into prose and removed comments from the JSON body so the request body is valid JSON.
- The index and indexer request bodies were labeled as JSON but contained JavaScript-style comments. I moved those comments into prose so the examples remain valid JSON.
- The table projections attempted to project primitive collection items directly from arrays of strings. Microsoft documentation states that projections require JSON objects, and primitive values should be wrapped using `sourceContext` and named `inputs`. I updated the Shaper skill to wrap key phrases into objects and to shape `namedEntities` for the entities table, then updated the table projection sources accordingly.
- The Python example queried `documentsTable` for `keyPhrases`, but the corrected projection writes key phrases to `keyPhrasesTable`. I updated the example to query both `documentsTable` and `keyPhrasesTable`.
- The REST examples used `api-version=2024-07-01`. This is still a stable version, but Microsoft lists `2026-04-01` as the latest stable data-plane REST API version, so I updated the request URLs to the current stable version.

## Review Notes
The tutorial is technically relevant and aligned with the current knowledge store model: knowledge stores are defined in skillsets, projections write to Azure Table Storage and Azure Blob Storage, Shaper skills are recommended for projection shapes, and indexers run immediately by default unless disabled. The post remains a concise tutorial rather than a full end-to-end deployable sample because it assumes an existing data source and omits full REST calls for creating the index and indexer.
