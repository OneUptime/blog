# Validation Summary: How to Not Analyze Fields in Elasticsearch

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Elasticsearch mappings
- Elasticsearch `text` and `keyword` field types
- Multi-fields
- Keyword normalizers
- Dynamic templates
- Elasticsearch Query DSL

## Sources Consulted
- Elastic Docs: Keyword type family - https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/keyword
- Elastic Docs: Text field type - https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/text
- Elastic Docs: Standard analyzer - https://www.elastic.co/docs/reference/text-analysis/analysis-standard-analyzer
- Elastic Docs: Normalizers - https://www.elastic.co/docs/reference/text-analysis/normalizers
- Elastic Docs: `normalizer` mapping parameter - https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/normalizer
- Elastic Docs: `index` mapping parameter - https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/mapping-index
- Elastic Docs: `enabled` mapping parameter - https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/enabled
- Elastic Docs: Dynamic templates - https://www.elastic.co/docs/manage-data/data-store/mapping/dynamic-templates
- Elastic Docs: Term query - https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-term-query
- Elastic Docs: Match query - https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-match-query
- Elastic Docs: `ignore_above` mapping parameter - https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/ignore-above
- Elastic Docs: Doc values - https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/doc-values

## Issues Found
- The post said default text analysis applies stemming and removes possessives. Elasticsearch's default standard analyzer tokenizes and lowercases, with stop words disabled by default, but it does not stem or strip possessives by default. Updated the introduction and analysis example accordingly.
- The text-vs-keyword comparison said `text` fields cannot be aggregated. `text` fields are not used for sorting and are seldom used for aggregations by default, but fielddata and specialized aggregations exist. Updated the table to say aggregations are not available by default.
- The multi-field mapping referenced an `autocomplete_analyzer` that was never defined, so the create-index request would fail as written. Removed the undefined autocomplete subfield and the corresponding usage bullet.
- The `index: false` explanation said fields are stored but not searchable. For the shown `text` fields, the important behavior is that values remain in `_source` but are not queryable. Updated the wording to avoid implying the mapping `store` parameter is enabled.
- The case-insensitive normalizer example omitted `"type": "custom"`. Added it to match the documented custom normalizer format.
- The `ignore_above` section said keyword fields have a default limit. Current Elasticsearch defaults are more nuanced: explicit `keyword` fields in standard indices are effectively unbounded, while dynamically created `.keyword` subfields commonly use `ignore_above: 256`. Updated the section to reflect that and clarified that ignored values remain in `_source` but are not indexed or available for sorting/aggregations.

## Review Notes
The examples are written as standalone snippets. Running every `curl -X PUT` command sequentially against the same cluster may require deleting existing example indices first when index names are reused.
