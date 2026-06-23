# Validation Summary: How to Set Up Elasticsearch Index Structure for Multiple Entities

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch index mappings
- Elasticsearch Query DSL
- Elasticsearch aliases and multi-index search
- Elasticsearch nested fields and nested aggregations
- Elasticsearch parent-child joins with the join field
- Elasticsearch custom analyzers and token filters

## Sources Consulted
- Elasticsearch join field type documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/parent-join
- Elasticsearch has parent query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-has-parent-query
- Elasticsearch nested field type documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/nested
- Elasticsearch nested aggregation documentation: https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-nested-aggregation
- Elasticsearch aliases documentation: https://www.elastic.co/docs/manage-data/data-store/aliases
- Elasticsearch multi-index search documentation: https://www.elastic.co/docs/reference/elasticsearch/rest-apis/search-multiple-data-streams-indices
- Elasticsearch synonym token filter documentation: https://www.elastic.co/docs/reference/text-analysis/analysis-synonym-tokenfilter

## Issues Found
- The `product_analyzer` example referenced `synonym_filter` without defining it in index settings. I added an inline `synonym` token filter with example synonym rules, because Elasticsearch requires a custom filter referenced by an analyzer to be configured.
- The nested aggregation used `items.product_name.keyword`, but the nested mapping defined `product_name` only as a `text` field. I added a `keyword` multi-field to `items.product_name`, so the terms aggregation can target a valid aggregatable field.

## Review Notes
- The parent-child example uses a multi-level join. This is technically valid, and its routing uses the greater parent id for the grandchild as required, but Elastic's documentation warns against multiple levels because each join level adds query-time memory and computation overhead. The post already recommends denormalization and avoiding parent-child unless necessary.
- The Elasticsearch examples are written in Kibana Dev Tools console style, with HTTP methods and paths preceding JSON bodies. That is appropriate for Elasticsearch tutorials, even though the fenced language is `json`.
