# Validation Summary: How to Implement Extractive Answers and Segments in Vertex AI Search

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Vertex AI Search / Agent Search
- Discovery Engine API
- google-cloud-discoveryengine Python client
- Python

## Sources Consulted
- Google Cloud documentation: Get snippets and extracted content, https://docs.cloud.google.com/generative-ai-app-builder/docs/snippets
- Google Cloud REST reference: ContentSearchSpec, https://docs.cloud.google.com/generative-ai-app-builder/docs/reference/rest/v1/ContentSearchSpec
- Google Cloud Python client reference: SearchRequest.ContentSearchSpec.ExtractiveContentSpec, https://docs.cloud.google.com/python/docs/reference/discoveryengine/latest/google.cloud.discoveryengine_v1.types.SearchRequest.ContentSearchSpec.ExtractiveContentSpec
- Google Cloud Python client reference: SearchRequest.ContentSearchSpec, https://docs.cloud.google.com/python/docs/reference/discoveryengine/latest/google.cloud.discoveryengine_v1.types.SearchRequest.ContentSearchSpec

## Issues Found
- Added the required Enterprise edition / advanced website indexing prerequisite for extractive content. Google documents extractive answers and segments as available for unstructured data stores with Enterprise edition features and website data stores with advanced website indexing for extractive answers.
- Removed `return_extractive_segment_score=True` from the answer-only request. That field controls relevance scores for extractive segments, not extractive answers, so the original comment about confidence scores was misleading.
- Removed `max_snippet_count=2` from the snippet request. The field is deprecated; `return_snippet=True` is the current documented control for returning snippets.
- Changed UI snippet formatting from `snippet_with_html_tag` to `snippet_status`. The documented snippet response includes `snippet` and `snippet_status`; hit highlighting is included in `snippet`.
- Added documented limits and availability caveats for extractive segment counts, adjacent segments, and segment relevance scores.

## Review Notes
Google Cloud documentation now labels Vertex AI Search as being renamed to Agent Search, but the Vertex AI Search terminology remains present in the docs and APIs. The post title and API examples are still technically valid.
