# Validation Summary: How to Set Up Azure AI Search Hybrid Search Combining Keyword

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure AI Search
- Azure AI Search hybrid search
- Azure AI Search vector search
- Azure AI Search semantic ranking
- Reciprocal Rank Fusion (RRF)
- Azure OpenAI embeddings and chat completions
- Python
- OpenAI Python SDK

## Sources Consulted
- Azure AI Search hybrid query documentation: https://learn.microsoft.com/en-us/azure/search/hybrid-search-how-to-query
- Azure AI Search hybrid search overview: https://learn.microsoft.com/en-us/azure/search/hybrid-search-overview
- Azure AI Search hybrid scoring and RRF documentation: https://learn.microsoft.com/en-us/azure/search/hybrid-search-ranking
- Azure AI Search vector index documentation: https://learn.microsoft.com/en-us/azure/search/vector-search-how-to-create-index
- Azure AI Search vector quickstart for Python: https://learn.microsoft.com/en-us/azure/search/search-get-started-vector?pivots=python
- Azure AI Search semantic ranking query documentation: https://learn.microsoft.com/en-us/azure/search/semantic-how-to-query-request
- Azure SDK for Python `VectorizedQuery` reference: https://learn.microsoft.com/en-us/python/api/azure-search-documents/azure.search.documents.models.vectorizedquery
- Azure SDK for Python `HnswAlgorithmConfiguration` reference: https://learn.microsoft.com/en-us/python/api/azure-search-documents/azure.search.documents.indexes.models.hnswalgorithmconfiguration
- Azure SDK for Python `HnswParameters` reference: https://learn.microsoft.com/en-us/python/api/azure-search-documents/azure.search.documents.indexes.models.hnswparameters
- Azure SDK for Python `VectorSearchProfile` reference: https://learn.microsoft.com/en-us/python/api/azure-search-documents/azure.search.documents.indexes.models.vectorsearchprofile
- Azure OpenAI chat completions quickstart: https://learn.microsoft.com/en-us/azure/ai-services/openai/chatgpt-quickstart
- Azure OpenAI API version lifecycle: https://learn.microsoft.com/en-us/azure/ai-services/openai/api-version-lifecycle

## Issues Found
- The prerequisite said vector search required Basic tier or above. Microsoft documentation now states Azure AI Search vector indexes are supported on any tier, with a caveat for some services created before January 2019. Updated the prerequisite.
- The HNSW SDK example passed a raw dictionary with REST-style keys (`efConstruction`, `efSearch`) to `HnswAlgorithmConfiguration`. The Python SDK exposes `HnswParameters` with Python-style arguments (`ef_construction`, `ef_search`). Updated the import and constructor usage.
- Azure OpenAI examples used API version `2024-06-01`, which has been replaced by the latest GA API version `2024-10-21`. Updated the examples.
- The Azure OpenAI `model` arguments did not clarify that Azure OpenAI expects the deployment name. Added concise comments to prevent users from passing a base model name unless their deployment is named the same.
- The hybrid search example depended on `get_embedding` and `openai_client` from an earlier file despite being presented as a separate script. Added the missing Azure OpenAI client and embedding helper.
- The RAG example was also presented as a separate script but omitted required imports, clients, and `get_embedding`. Added the missing setup.
- The semantic hybrid search example used `k_nearest_neighbors=top_k`, which defaults to 5. Microsoft recommends `k=50` when using semantic ranker with vector search because semantic ranker uses up to 50 matches as input. Updated the vector query to request 50 candidates while still returning `top_k` results.
- The result-processing code used `hasattr(result, '@search.reranker_score')`, but Azure AI Search Python results are dictionary-like for search metadata. Replaced it with a key-membership check.
- The tuning section said vector influence could be controlled by adjusting `k` and used `weight=0.7` while describing more vector influence. Updated the wording to distinguish `weight` from candidate count and changed the example to `weight=2.0`.

## Review Notes
The Python snippets compile syntactically. They still use placeholder endpoints, keys, index names, and deployment names, so they require real Azure AI Search and Azure OpenAI resources to run end to end.
