# Validation Summary: How to Implement Semantic Ranking in Azure AI Search for Better Relevance

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure AI Search
- Semantic ranker
- Azure Search Management REST API
- Azure AI Search data plane REST API
- JSON search index and query definitions
- Azure CLI `az rest`

## Sources Consulted
- Microsoft Learn: Semantic ranking overview - https://learn.microsoft.com/en-us/azure/search/semantic-search-overview
- Microsoft Learn: Configure semantic ranker and return captions in search results - https://learn.microsoft.com/en-us/azure/search/semantic-how-to-configure
- Microsoft Learn: Add semantic ranking to queries in Azure AI Search - https://learn.microsoft.com/en-us/azure/search/semantic-how-to-query-request
- Microsoft Learn: Enable or disable semantic ranker billing - https://learn.microsoft.com/en-gb/azure/search/semantic-how-to-enable-disable
- Microsoft Learn: Azure AI Search Management REST API, Services Create or Update - https://learn.microsoft.com/en-us/rest/api/searchmanagement/services/create-or-update
- Microsoft Learn: Azure AI Search data plane REST API versions - https://learn.microsoft.com/en-us/rest/api/searchservice/search-service-api-versions
- Microsoft Learn: Azure AI Search management REST API versions - https://learn.microsoft.com/en-us/rest/api/searchmanagement/management-api-versions

## Issues Found
- The portal navigation for semantic ranker billing was outdated. Changed **Settings > Semantic ranker** to **Settings > Premium features**, matching current Microsoft Learn guidance.
- The management REST API example used an older preview API version. Updated it from `2024-06-01-preview` to `2026-03-01-preview`, which Microsoft Learn currently documents for setting `semanticSearch`.
- The semantic configuration REST example used SDK-style field names, `contentFields` and `keywordsFields`, instead of the current REST field names. Updated them to `prioritizedContentFields` and `prioritizedKeywordsFields`.
- Several fenced `json` examples contained comments, which would not be valid request JSON if copied into a REST client. Moved explanatory comments outside the JSON bodies.
- The query example described `top` as controlling the number of results considered for reranking. Removed that misleading comment because Azure AI Search semantically reranks the top 50 scored matches, while `top` controls how many results are returned.
- The cost section referred to "the free tier" in a way that could be confused with the Azure AI Search Free service tier, which does not support semantic ranker. Changed this to "the free semantic ranker plan" and clarified that Standard charges after the free allowance is consumed.

## Review Notes
The post is technically valid after the corrections. The examples continue to use the stable `2024-07-01` data plane API version, which is still listed by Microsoft as a supported stable Azure AI Search REST API version, although newer stable and preview versions are now available.
