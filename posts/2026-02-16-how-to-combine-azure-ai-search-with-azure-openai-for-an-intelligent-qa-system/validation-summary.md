# Validation Summary: How to Combine Azure AI Search with Azure OpenAI for an Intelligent Q&A System

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure AI Search
- Azure OpenAI
- Retrieval-augmented generation
- Python
- OpenAI Python SDK
- Azure Search Documents Python SDK
- Semantic ranking
- Hybrid and vector search

## Sources Consulted
- Microsoft Learn: Azure AI Search `SearchClient.search` Python API reference - https://learn.microsoft.com/en-us/python/api/azure-search-documents/azure.search.documents.searchclient
- Microsoft Learn: Azure AI Search `VectorizedQuery` Python API reference - https://learn.microsoft.com/en-us/python/api/azure-search-documents/azure.search.documents.models.vectorizedquery
- Microsoft Learn: Semantic ranking in Azure AI Search - https://learn.microsoft.com/en-us/azure/search/semantic-ranking
- Microsoft Learn: Add semantic ranking to queries in Azure AI Search - https://learn.microsoft.com/en-us/azure/search/semantic-how-to-query-request
- Microsoft Learn: Azure OpenAI in Microsoft Foundry Models REST API reference - https://learn.microsoft.com/en-us/azure/foundry/openai/reference
- Microsoft Learn: Azure OpenAI On Your Data API reference - https://learn.microsoft.com/en-ca/azure/foundry-classic/openai/references/on-your-data
- Microsoft Learn: Azure OpenAI on your Azure Search data reference - https://learn.microsoft.com/en-us/azure/foundry-classic/openai/references/azure-search
- Microsoft Learn: Azure OpenAI Python v1 migration guide - https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/migration

## Issues Found
- The prerequisites listed Python 3.8+, but the snippets use built-in generic type hints such as `list[dict]`, which require Python 3.9+ unless future annotations or `typing.List` are used. Updated the prerequisite to Python 3.9+.
- The Azure OpenAI client used API version `2024-06-01`, while the current Microsoft reference for chat completions and Azure Search `data_sources` examples uses `2024-10-21`. Updated the client configuration to `2024-10-21`.
- The post presented Azure OpenAI "On Your Data" as a normal built-in option without noting its current lifecycle status. Microsoft now marks Azure OpenAI On Your Data as deprecated and approaching retirement. Added a short caveat while preserving the example.

## Review Notes
The Azure AI Search examples use valid `SearchClient.search` parameters for semantic ranking, captions, vector queries, and field selection. The hybrid search example assumes the index has a compatible `contentVector` vector field and that the embedding deployment dimensions match that field. The Azure OpenAI examples correctly pass deployment names via the `model` parameter for Azure OpenAI.
