# Validation Summary: Configure Vertex AI Vector Search Indexes for Billion-Scale Similarity Search

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Vertex AI Vector Search
- Vertex AI SDK for Python
- Cloud Storage
- Python
- NumPy
- gsutil
- Vector similarity search and filtering

## Sources Consulted
- Google Cloud: Input data format and structure - https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/vector-search/format-structure
- Google Cloud: Index configuration parameters - https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/vector-search/configuring-indexes
- Google Cloud: Create and manage your index - https://docs.cloud.google.com/vertex-ai/docs/vector-search/create-manage-index
- Google Cloud: Filter vector matches - https://cloud.google.com/vertex-ai/docs/vector-search/filtering
- Google Cloud Python SDK reference: MatchingEngineIndex - https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.MatchingEngineIndex
- Google Cloud Python SDK reference: MatchingEngineIndexEndpoint - https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.MatchingEngineIndexEndpoint

## Issues Found
- The post described the input files as JSONL and used `.jsonl` filenames. Google Cloud documents newline-delimited JSON records, but files in the batch root must use the `.json` suffix. Updated the wording and examples to use newline-delimited JSON with `.json` filenames.
- The distance measure comment listed `L2_DISTANCE`, which is not the documented enum. Updated it to `SQUARED_L2_DISTANCE`.
- The example printed `index.update_time` as the index state. Updated the label to "updated at" because `update_time` is a timestamp property.
- The `approximate_neighbors_count` explanation was imprecise. Updated it to match the SDK documentation: it is the default number of neighbors found through approximate search before exact reordering.
- Restrict examples used `allow_list`, but the documented JSON field is `allow`. Updated the restrict records.
- The scaling guidance said `SHARD_SIZE_LARGE` distributes the index across more shards. Google documents large shards as 50 GiB shards, with each shard served on a separate node and scaling independently; larger shards do not inherently mean more shards. Updated the statement.
- The machine type guidance listed `n2-standard-32`, which is not in the documented supported machine type table for Vector Search shard deployment. Updated it to `n2d-standard-32`.
- The post claimed single-digit millisecond latency for billion-scale datasets. Official documentation supports low-latency / high-performance search, but not that specific blanket guarantee. Reworded the claim to "low latency."

## Review Notes
- The Python SDK still exposes `leaf_nodes_to_search_percent`, and Google examples continue to use it in Python samples. The underlying index configuration documentation marks `leafNodesToSearchPercent` as deprecated in favor of `fractionLeafNodesToSearch` for metadata/API configuration.
