# Validation Summary: How to Use Retrieval-Augmented Generation with Azure OpenAI and Azure AI Search

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure OpenAI
- Azure AI Search
- Retrieval-Augmented Generation
- Python
- OpenAI Python SDK
- Azure Search Documents SDK for Python
- Vector search
- Hybrid search
- Embeddings

## Sources Consulted
- Microsoft Learn: Quickstart: Vector search in Azure AI Search - https://learn.microsoft.com/en-us/azure/search/search-get-started-vector
- Microsoft Learn: Create a vector index in Azure AI Search - https://learn.microsoft.com/en-us/azure/search/vector-search-how-to-create-index
- Microsoft Learn: Create a hybrid query in Azure AI Search - https://learn.microsoft.com/en-us/azure/search/hybrid-search-how-to-query
- Microsoft Learn: Hybrid search ranking using Reciprocal Rank Fusion - https://learn.microsoft.com/en-us/azure/search/hybrid-search-ranking
- Microsoft Learn: Service limits in Azure AI Search - https://learn.microsoft.com/en-us/azure/search/search-limits-quotas-capacity
- Microsoft Learn: Migrating to the OpenAI Python API library 1.x for Azure OpenAI - https://learn.microsoft.com/en-us/azure/foundry-classic/openai/how-to/migration
- Microsoft Learn: Generate embeddings with Azure OpenAI in Microsoft Foundry Models - https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/embeddings

## Issues Found
- The prerequisites stated that Basic tier or higher was required for vector search. Current Azure AI Search documentation says vector indexes can be created on any tier, with Basic or higher recommended for larger workloads. Updated the prerequisite accordingly.
- The dependency list included `azure-identity`, but the post's code uses key-based authentication with `AzureKeyCredential` and does not use `azure-identity`. Removed it from the package list and install command.
- The chunking section described token-sized chunks, but the sample function splits on whitespace and therefore chunks by words, not tokens. Added a note that production systems should use a tokenizer-aware splitter and that the sample uses words as an approximation.

## Review Notes
The Azure OpenAI examples use the classic `AzureOpenAI` client with an explicit `api_version`, which remains consistent with Microsoft migration examples for OpenAI Python 1.x. Newer Microsoft documentation also shows the OpenAI v1 endpoint style using `/openai/v1/`; future updates could modernize the samples, but the current code pattern is not technically incorrect.
