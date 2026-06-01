# Validation Summary: How to Generate Text Embeddings with Azure OpenAI for Semantic Search

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure OpenAI
- OpenAI Python SDK
- Text embeddings
- Semantic search
- Vector search
- NumPy
- Azure AI Search
- Azure Cosmos DB for MongoDB vCore
- Azure Database for PostgreSQL with pgvector

## Sources Consulted
- OpenAI Vector embeddings guide: https://developers.openai.com/api/docs/guides/embeddings
- OpenAI Embeddings API reference: https://api.openai.com/v1/embeddings
- Microsoft Learn, Generate embeddings with Azure OpenAI: https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/embeddings
- Microsoft Learn, Azure OpenAI model concepts: https://learn.microsoft.com/en-us/azure/ai-foundry/openai/overview
- Microsoft Learn, Switch between OpenAI and Azure OpenAI endpoints with Python: https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/switching-endpoints
- Microsoft Learn, Azure Cosmos DB for MongoDB vCore vector search: https://learn.microsoft.com/en-us/azure/cosmos-db/mongodb/vcore/vector-search

## Issues Found
- The embedding model table listed `text-embedding-3-small` as `512-1536` dimensions and `text-embedding-3-large` as `256-3072`. Official docs describe default dimensions as 1536 and 3072 respectively, with the third-generation models supporting configurable dimensionality reduction. I changed the table header to "Default Dimensions" and listed the official defaults.
- The Azure service example used the old "Azure Active Directory" product name. I updated it to "Microsoft Entra ID, formerly Azure Active Directory" to match current Microsoft naming while preserving reader recognition.
- The production vector database section said Azure Cosmos DB for MongoDB vCore supports IVF and HNSW. Microsoft documentation also lists DiskANN, so I added DiskANN to the supported indexing algorithms.

## Review Notes
The Python examples use the Azure-specific `AzureOpenAI` client with an explicit `api_version`, which remains a valid pattern for Azure OpenAI. Current Microsoft documentation increasingly recommends the unified OpenAI v1 endpoint with `OpenAI(base_url=...)`, so a future modernization pass could update the tutorial to that style.
