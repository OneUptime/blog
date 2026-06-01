# Validation Summary: How to Build a Vector Search Index in Azure AI Search with OpenAI Embeddings

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure AI Search
- Azure OpenAI embeddings
- OpenAI Python SDK
- Azure Search Documents Python SDK
- Python
- Vector search and hybrid search

## Sources Consulted
- Azure AI Search vector search quickstart for Python: https://learn.microsoft.com/en-us/azure/search/search-get-started-vector?pivots=python
- Azure AI Search vector query documentation: https://learn.microsoft.com/en-us/azure/search/vector-search-how-to-query
- Azure AI Search hybrid search ranking documentation: https://learn.microsoft.com/en-us/azure/search/hybrid-search-ranking
- Azure AI Search integrated vectorization documentation: https://learn.microsoft.com/en-us/azure/search/vector-search-integrated-vectorization
- Azure AI Search embedding generation documentation: https://learn.microsoft.com/en-us/azure/search/vector-search-how-to-generate-embeddings
- Azure AI Search HnswParameters Python API reference: https://learn.microsoft.com/en-us/python/api/azure-search-documents/azure.search.documents.indexes.models.hnswparameters
- Azure OpenAI embeddings tutorial: https://learn.microsoft.com/en-us/azure/foundry/openai/tutorials/embeddings
- OpenAI embeddings guide: https://developers.openai.com/api/docs/guides/embeddings

## Issues Found
- The Azure AI Search prerequisite said Basic tier or higher was required. Current Azure documentation allows Free tier for small vector quickstarts and recommends Basic or higher for larger datasets, so the prerequisite was corrected.
- The Azure OpenAI embedding example used `model="text-embedding-ada-002"` with a comment saying it could be replaced by the deployed model name. Azure OpenAI expects the deployment name in this parameter, so the example now uses a deployment-name placeholder.
- The Azure AI Search index example passed HNSW parameters as a raw dictionary. In `azure-search-documents==11.6.0`, `HnswAlgorithmConfiguration.parameters` is typed as `HnswParameters`; using a dict can fail SDK serialization. The example now imports and uses `HnswParameters` with the Python SDK's snake_case parameter names.

## Review Notes
The corrected Python code blocks parse successfully. The Azure AI Search index model was also checked locally against `azure-search-documents==11.6.0` installed into a temporary target directory to confirm the `HnswParameters`-based configuration serializes through the SDK model.
