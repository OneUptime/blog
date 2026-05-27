# Validation Summary: How to Set Up Vertex AI Search for Commerce to Power Product Search on Your

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Retail API
- Vertex AI Search for Commerce / AI Commerce Search
- Google Cloud CLI
- Google Cloud Storage catalog import
- Python `google-cloud-retail` client library
- Retail API search controls, serving configs, facets, boosting, and user events

## Sources Consulted
- Google Cloud documentation: Import catalog information, https://docs.cloud.google.com/retail/docs/upload-catalog
- Google Cloud documentation: Create serving controls, https://docs.cloud.google.com/retail/docs/create-controls
- Google Cloud documentation: Basic search, https://docs.cloud.google.com/retail/docs/search-basic
- Google Cloud documentation: Filter and order results, https://docs.cloud.google.com/retail/docs/filter-and-order
- Google Cloud documentation: Boost results, https://docs.cloud.google.com/retail/docs/boosting
- Google Cloud documentation: Record real-time user events, https://docs.cloud.google.com/retail/docs/record-events
- Google Cloud Python reference: `google.cloud.retail_v2` ProductInputConfig, Rule, SearchRequest, SearchResponse, UserEvent, ProductDetail, SearchServiceClient, and ServingConfigServiceClient, https://docs.cloud.google.com/python/docs/reference/retail/latest

## Issues Found
- The setup step said to enable `aiplatform.googleapis.com` for full search capabilities. The Retail API is the API used by the shown Search for Commerce calls, so the extra Vertex AI API command was removed.
- The prerequisites listed CSV catalog input. The reviewed Retail API catalog import path supports Retail API JSON, BigQuery, inline import, and Merchant Center flows, so the prerequisite was corrected.
- The Cloud Storage catalog section did not mention that product JSON objects must be newline-delimited for Cloud Storage imports. The wording was corrected.
- The import sample created an unused `ProductInlineSource` and read `success_count` / `failure_count` from `ImportProductsResponse`, where those fields do not exist. The sample now reads counts from the long-running operation metadata.
- The synonym control used `replacement_action` incorrectly and did not attach controls to a serving config. The sample now uses `oneway_synonyms_action` and calls `ServingConfigServiceClient.add_control`.
- The boost control used an invalid text-style filter for a numeric rating field. The sample now uses the documented numeric `rating` filter syntax.
- The search sample used the legacy placements path and omitted required `visitor_id`. It now uses `servingConfigs/default_search`, passes `visitor_id`, and includes the default branch.
- The search description claimed snippets are returned. The Retail Search response exposes ranked results, facets, and an attribution token, so the claim was corrected.
- The facet serialization treated all facet values as strings, which loses interval values for price facets. The sample now serializes interval facets.
- The user event sample used a plain dict for `event_time` and recorded `purchase-complete` without required transaction details. It now uses a protobuf `Timestamp` and includes `PurchaseTransaction` data for purchase events.

## Review Notes
The post title appears truncated, but that is an editorial issue rather than a technical correctness issue. The examples still require valid Google Cloud credentials, a configured catalog, and Retail Search enablement in the target project.
