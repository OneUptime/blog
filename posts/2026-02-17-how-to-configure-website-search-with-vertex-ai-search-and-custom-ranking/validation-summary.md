# Validation Summary: How to Configure Website Search with Vertex AI Search and Custom Ranking

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Vertex AI Search
- Discovery Engine API
- Google Cloud CLI
- Python client library for Discovery Engine
- Vertex AI Search website data stores, search apps, boost specs, filters, recrawling, and search widget

## Sources Consulted
- Google Cloud SDK `gcloud services enable` reference: https://docs.cloud.google.com/sdk/gcloud/reference/services/enable
- Vertex AI Search / Agent Search overview and Discovery Engine API terminology: https://docs.cloud.google.com/generative-ai-app-builder/docs
- Create a data store Python sample: https://docs.cloud.google.com/generative-ai-app-builder/docs/samples/genappbuilder-create-data-store
- Add a website to a data store Python sample: https://docs.cloud.google.com/generative-ai-app-builder/docs/samples/genappbuilder-create-target-site
- Create an app Python sample: https://docs.cloud.google.com/generative-ai-app-builder/docs/samples/genappbuilder-create-engine
- Search a data store Python sample: https://docs.cloud.google.com/generative-ai-app-builder/docs/samples/genappbuilder-search
- Filter website search documentation: https://docs.cloud.google.com/generative-ai-app-builder/docs/filter-website-search
- Boost search results documentation: https://docs.cloud.google.com/generative-ai-app-builder/docs/boost-search-results
- Refresh web pages / recrawl documentation: https://docs.cloud.google.com/generative-ai-app-builder/docs/recrawl-websites
- Add the search widget to a web page documentation: https://docs.cloud.google.com/generative-ai-app-builder/docs/add-widget
- Python API reference for `SiteSearchEngineServiceClient.recrawl_uris`: https://docs.cloud.google.com/python/docs/reference/discoveryengine/latest/google.cloud.discoveryengine_v1.services.site_search_engine_service.SiteSearchEngineServiceClient
- Python API reference for `SearchRequest.BoostSpec`: https://cloud.google.com/python/docs/reference/discoveryengine/latest/google.cloud.discoveryengine_v1.types.SearchRequest.BoostSpec

## Issues Found
- Target site URL patterns incorrectly included `https://`. Updated the include and exclude target-site examples to use host/path patterns without protocol, matching the official Python sample.
- The data store example did not enable advanced website indexing even though the article later uses manual recrawling and freshness fields. Added `create_advanced_site_search=True` and clarified verified ownership as required for advanced website indexing/manual recrawls.
- URL boost and filter examples used `link: ANY(...)`, which is not the documented website-search URL filter syntax. Replaced those examples with `siteSearch:"https://.../*"` expressions.
- The freshness boost used `update_time`, which is not the documented inferred website freshness field. Replaced it with a freshness `boost_control_spec` using the Google-inferred `dateModified` field and duration control points.
- The recrawl example called `recrawl_uris` with flattened keyword arguments, but the current Python reference documents a `RecrawlUrisRequest`. Updated the sample to construct and pass `discoveryengine.RecrawlUrisRequest`.
- The recrawl description did not mention that manual recrawls require advanced website indexing or that recrawl URIs are literal page URLs. Added that caveat.

## Review Notes
Vertex AI Search documentation is in the middle of a rename to Agent Search, but the underlying Discovery Engine API and examples remain applicable. The Python code blocks were extracted and parsed with `ast.parse`; full runtime execution was not possible because the Google Cloud client library and live Google Cloud credentials are not installed in this workspace.
