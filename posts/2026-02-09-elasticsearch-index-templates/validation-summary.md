# Validation Summary: How to use Elasticsearch index templates for consistent log mapping

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch composable index templates
- Elasticsearch component templates
- Elasticsearch mappings and dynamic templates
- Elasticsearch index settings, aliases, and ILM settings
- Elasticsearch field types and mapping parameters

## Sources Consulted
- Elastic Docs: Templates - https://www.elastic.co/guide/en/elasticsearch/reference/current/index-templates.html
- Elastic API Docs: Create or update an index template - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-put-index-template
- Elastic Docs: Dynamic templates - https://www.elastic.co/guide/en/elasticsearch/reference/current/dynamic-templates.html
- Elastic Docs: Field data types - https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-types.html
- Elastic Docs: doc_values mapping parameter - https://www.elastic.co/guide/en/elasticsearch/reference/current/doc-values.html/
- Elastic Docs: index mapping parameter - https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-index.html
- Elastic Docs: Size your shards - https://www.elastic.co/guide/en/elasticsearch/reference/current/size-your-shards.html
- Elastic Docs: General index settings - https://www.elastic.co/docs/reference/elasticsearch/index-settings/index-modules

## Issues Found
- The best-practices list said "50GB per shard is optimal." Elastic's current guidance is to aim for shard sizes between 10GB and 50GB, with 50GB commonly used as an upper rollover threshold rather than a universal optimum. Updated the wording accordingly.
- The best-practices list said "doc_values" are required for aggregations and sorting. Elastic documents `doc_values` as the on-disk columnar structure used for sorting, aggregations, and script access on supported field types, enabled by default for most supported fields. Updated the wording to avoid implying every aggregation or sort universally requires explicitly enabling it.

## Review Notes
- The post uses current composable index template APIs (`_index_template` and `_component_template`) rather than deprecated legacy templates.
- The priority explanation is correct for composable templates: when multiple index templates match, the highest-priority template is used.
- The mapping examples use current field types and mapping parameters. In a production environment, referenced ILM policies such as `kubernetes-logs-policy` and `logs-policy` must exist before indices using these templates are created.
