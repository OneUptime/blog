# Validation Summary: How to Implement Answer Generation with Citations in Vertex AI Search

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Vertex AI Search / Agent Search
- Google Cloud Discovery Engine Python client
- Search summaries / answer generation
- Citations and citation metadata
- Conversational search follow-ups
- Python HTML rendering

## Sources Consulted
- Google Cloud: Get search summaries: https://docs.cloud.google.com/generative-ai-app-builder/docs/get-search-summaries
- Google Cloud: ContentSearchSpec REST reference: https://cloud.google.com/generative-ai-app-builder/docs/reference/rest/v1/ContentSearchSpec
- Google Cloud Python reference: SearchRequest.ContentSearchSpec.SummarySpec: https://docs.cloud.google.com/python/docs/reference/discoveryengine/latest/google.cloud.discoveryengine_v1.types.SearchRequest.ContentSearchSpec.SummarySpec
- Google Cloud Python reference: SearchResponse.Summary: https://docs.cloud.google.com/python/docs/reference/discoveryengine/latest/google.cloud.discoveryengine_v1.types.SearchResponse.Summary
- Google Cloud Python reference: SearchResponse.Summary.SummaryWithMetadata: https://docs.cloud.google.com/python/docs/reference/discoveryengine/latest/google.cloud.discoveryengine_v1.types.SearchResponse.Summary.SummaryWithMetadata
- Google Cloud Python reference: SearchResponse.Summary.Citation: https://docs.cloud.google.com/python/docs/reference/discoveryengine/latest/google.cloud.discoveryengine_v1.types.SearchResponse.Summary.Citation
- Google Cloud: Answer generation model versions and lifecycle: https://docs.cloud.google.com/generative-ai-app-builder/docs/answer-generation-models
- Google Cloud: Search with follow-ups: https://docs.cloud.google.com/generative-ai-app-builder/docs/multi-turn-search
- Google Cloud Python reference: ConverseConversationRequest: https://docs.cloud.google.com/python/docs/reference/discoveryengine/latest/google.cloud.discoveryengine_v1.types.ConverseConversationRequest
- Google Cloud Python reference: ConverseConversationResponse: https://docs.cloud.google.com/python/docs/reference/discoveryengine/latest/google.cloud.discoveryengine_v1.types.ConverseConversationResponse

## Issues Found
- The search summary examples omitted `extractive_content_spec`. Google documentation states that search summaries are generated from extractive answers unless semantic chunks are used, so I added `ExtractiveContentSpec(max_extractive_answer_count=1)` to the summary examples.
- The custom model example used `gemini-1.5-flash-001/answer_gen/v1`, which is not listed in the current answer generation model lifecycle page. I updated it to the currently supported `gemini-2.5-flash/answer_gen/v1`.
- The citation HTML formatter only linked single-source citation markers like `[1]`, but Vertex AI Search can return multi-source markers like `[2, 3]`. I updated the formatter to handle comma-separated citation lists.
- The citation HTML formatter interpolated unescaped answer text, titles, and URLs into HTML. I added HTML escaping and `rel="noopener noreferrer"` for generated links.
- `get_answer_or_fallback` was annotated as returning `str` even though it returns dictionaries. I corrected the return annotation to `dict`.
- The conversational search example built conversation names under an engine resource and used an empty string when no conversation ID was provided. The current API requires a data store conversation resource and supports `conversations/-` for auto session mode, so I updated the function to accept `data_store_id` and build a valid data store conversation path.

## Review Notes
- Google Cloud documentation notes that Vertex AI Search is being renamed to Agent Search. The existing Vertex AI Search terminology remains recognizable and is still present in parts of the documentation.
- Search summaries can include Markdown and simple HTML, so production applications should choose a rendering strategy deliberately rather than assuming plain text.
