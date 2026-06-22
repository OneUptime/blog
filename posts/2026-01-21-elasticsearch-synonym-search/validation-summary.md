# Validation Summary: How to Implement Synonym Search in Elasticsearch

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- Elasticsearch text analysis
- Elasticsearch synonym token filter
- Elasticsearch synonym_graph token filter
- Elasticsearch search analyzers
- Elasticsearch reload search analyzers API
- Elasticsearch Bulk API
- curl

## Sources Consulted
- Elastic Docs: Synonym token filter - https://www.elastic.co/docs/reference/text-analysis/analysis-synonym-tokenfilter
- Elastic Docs: Synonym graph token filter - https://www.elastic.co/docs/reference/text-analysis/analysis-synonym-graph-tokenfilter
- Elastic Docs: Search with synonyms - https://www.elastic.co/docs/solutions/search/full-text/search-with-synonyms
- Elastic API Docs: Reload search analyzers - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-reload-search-analyzers
- Elastic API Docs: Bulk index or delete documents - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-bulk

## Issues Found
- The post claimed synonyms improve recall "without hurting precision." Changed this to "while monitoring precision" because broad synonym expansion can reduce precision.
- The synonym file path example did not state that `synonyms_path` is relative to the Elasticsearch config directory. Added that clarification.
- The lenient-mode example used `"invalid syntax here"`, which is not a reliable invalid synonym rule. Replaced it with `"invalid =>"` to demonstrate an invalid rule.
- The search-time synonym pros implied all search-time synonym configurations are easily updateable. Clarified that this is especially true for reloadable file-based synonyms or synonyms sets.
- The reload-search-analyzers example omitted request-cache clearing. Added the recommended `_cache/clear?request=true` call after `_reload_search_analyzers`.
- The stemming section incorrectly stated a universal "synonyms before stemming" rule. Updated it to explain that filter order depends on how synonym rules are written, and that filters before synonym filters are applied to synonym entries.
- The complete example used separate synonym filters in the same search analyzer. Combined the product and size rules into one `synonym_graph` filter to avoid chained synonym filter behavior.
- The Bulk API example used `application/json` and `-d`. Changed it to `application/x-ndjson` and `--data-binary` with an explicit final newline, matching Elastic's Bulk API guidance.

## Review Notes
The examples are generally version-neutral for current Elasticsearch behavior. Future improvements could mention the Synonyms Management API and UI-based synonym sets in more depth, but the existing file-based and inline examples are technically valid after the fixes above.
