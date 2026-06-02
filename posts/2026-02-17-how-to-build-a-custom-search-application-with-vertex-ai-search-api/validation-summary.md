# Validation Summary: How to Build a Custom Search Application with Vertex AI Search API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Vertex AI Search / Agent Search
- Google Cloud Discovery Engine Python client library
- FastAPI
- Cloud Run
- Cloud Build
- Python

## Sources Consulted
- Google Cloud Vertex AI Search: Get search results: https://docs.cloud.google.com/generative-ai-app-builder/docs/preview-search-results
- Google Cloud Vertex AI Search sample: Search a data store: https://docs.cloud.google.com/generative-ai-app-builder/docs/samples/genappbuilder-search
- Google Cloud Discovery Engine Python SearchRequest reference: https://docs.cloud.google.com/python/docs/reference/discoveryengine/latest/google.cloud.discoveryengine_v1.types.SearchRequest
- Google Cloud Vertex AI Search ContentSearchSpec reference: https://docs.cloud.google.com/generative-ai-app-builder/docs/reference/rest/v1alpha/ContentSearchSpec
- Google Cloud Discovery Engine completeQuery REST reference: https://docs.cloud.google.com/gemini/enterprise/docs/reference/rest/v1/projects.locations.dataStores/completeQuery
- Google Cloud Vertex AI Search metadata filtering documentation: https://docs.cloud.google.com/generative-ai-app-builder/docs/filter-search-metadata
- Google Cloud SDK gcloud run deploy reference: https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy
- FastAPI CORS documentation: https://fastapi.tiangolo.com/tutorial/cors/

## Issues Found
- The post advertised personalized ranking, but the example does not configure user context or personalization. Updated the description to refer to result boosting, which matches the `boost_spec` parameter in the search service.
- The architecture diagram included a Recommendation API path, but the post does not implement or configure recommendations. Removed that node from the diagram.
- The Python client initialization did not configure regional Discovery Engine API endpoints for non-global locations. Added `ClientOptions` and used the regional endpoint pattern from Google's Python samples.
- The autocomplete helper assumed the engine ID could always be used as the data store ID. Added an optional `data_store_id` parameter and used it when building the `CompleteQueryRequest` data store path.
- The snippet configuration used `max_snippet_count`, which Google's ContentSearchSpec reference marks as deprecated. Removed that field and kept `return_snippet=True`.
- The `search()` method accepted `boost_spec` but never applied it to the `SearchRequest`. Added assignment through `SearchRequest.BoostSpec`.

## Review Notes
- The Cloud Run deploy flags shown in the post are valid according to the current `gcloud run deploy` reference.
- The filter examples use metadata fields such as `category`, `author`, and `year`; those fields must exist in the app schema and be available for filtering/faceting for the examples to work in a real deployment.
- The Python snippets were parsed with `ast.parse` after edits and are syntactically valid.
