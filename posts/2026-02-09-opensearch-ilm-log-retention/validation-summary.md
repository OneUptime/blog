# Validation Summary: How to Use OpenSearch Index Lifecycle Management for Kubernetes Log Retention

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenSearch Index State Management (ISM)
- OpenSearch index templates, aliases, snapshots, and index settings
- Kubernetes logging
- Fluent Bit OpenSearch output plugin

## Sources Consulted
- OpenSearch ISM policies documentation: https://docs.opensearch.org/latest/im-plugin/ism/policies/
- OpenSearch ISM API documentation: https://docs.opensearch.org/latest/im-plugin/ism/api/
- OpenSearch ISM overview and rollover alias guidance: https://docs.opensearch.org/docs/2.17/im-plugin/ism/index/
- OpenSearch ISM error prevention documentation: https://docs.opensearch.org/latest/im-plugin/ism/error-prevention/index/
- OpenSearch index settings documentation: https://docs.opensearch.org/latest/install-and-configure/configuring-opensearch/index-settings/
- OpenSearch index codecs documentation: https://docs.opensearch.org/latest/im-plugin/index-codecs/
- Fluent Bit OpenSearch output documentation: https://docs.fluentbit.io/manual/data-pipeline/outputs/opensearch

## Issues Found
- The post referred to OpenSearch "Index Lifecycle Management (ILM)", but OpenSearch's feature is Index State Management (ISM). Updated the title, description, headings, and explanatory text to use ISM and "states" instead of ILM "phases".
- The basic index template used the deprecated policy attachment setting. Added an `ism_template` to the ISM policy for automatic policy attachment and kept the index template focused on mappings, shard settings, refresh interval, and the rollover alias.
- Several ISM monitoring examples used incorrect endpoints. Replaced them with the documented Explain API endpoint format, `GET _plugins/_ism/explain/{index}`, and the Get Policy API endpoint.
- The alerting example queried the internal `.opendistro-ism-config` index for a `state: failed` field. Replaced it with the documented filtered Explain API request using `failed: true`.
- The compression section used an unsupported `index_codec` ISM action and showed updating `index.codec` on open wildcarded indexes. Replaced this with an index template example for new indexes and the documented close, update settings, reopen sequence for changing a static index setting on an existing index.
- Request examples that included HTTP methods were labeled as `json` code fences. Relabeled those snippets as `http` so they are not presented as pure JSON.

## Review Notes
The Fluent Bit OpenSearch output settings are consistent with the official plugin documentation. `Type _doc` is harmless when `Suppress_Type_Name On` is set because Fluent Bit ignores `Type` in that mode, which is appropriate for OpenSearch 2.0 and later.
