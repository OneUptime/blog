# Validation Summary: How to Troubleshoot Elasticsearch Slow Queries

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Elasticsearch search slow logs
- Elasticsearch Profile API
- Elasticsearch Query DSL
- Elasticsearch aggregations
- Elasticsearch request and query cache
- Elasticsearch index settings and index templates
- Elasticsearch cat, stats, nodes, tasks, and force merge APIs
- curl
- jq

## Sources Consulted
- Elasticsearch slow log settings: https://www.elastic.co/docs/reference/elasticsearch/index-settings/slow-log
- Elasticsearch slow query and index logging: https://www.elastic.co/docs/deploy-manage/monitor/logging-configuration/slow-logs
- Elasticsearch Profile API guide: https://www.elastic.co/docs/reference/elasticsearch/rest-apis/search-profile
- Elasticsearch pagination and `search_after`: https://www.elastic.co/docs/reference/elasticsearch/rest-apis/paginate-search-results
- Elasticsearch node query cache settings: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/node-query-cache-settings
- Elasticsearch shard request cache: https://www.elastic.co/docs/reference/elasticsearch/rest-apis/shard-request-cache
- Elasticsearch index template API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-put-index-template
- Elasticsearch wildcard query: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-wildcard-query
- Elasticsearch terms aggregation: https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-terms-aggregation
- Elasticsearch stored fields guidance: https://www.elastic.co/docs/reference/elasticsearch/rest-apis/retrieve-selected-fields
- Elasticsearch force merge API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-forcemerge

## Issues Found
- The post showed `_cluster/settings` as a way to set default index slow-log thresholds. Replaced it with an index template example because index templates are the documented mechanism for applying settings to newly created matching indices.
- The post used `index.search.slowlog.source`, which is not a documented search slow-log setting in current Elasticsearch docs. Replaced that snippet with the documented `index.search.slowlog.include.user` setting.
- The slow-log sample and `jq` parsing examples used older/non-ECS field names such as `took_millis` and `source`. Updated them to current JSON slow-log fields such as `elasticsearch.slowlog.took_millis` and `elasticsearch.slowlog.source`.
- The Profile API sample omitted timing fields that were described in the metrics table. Added representative timing fields and matching `_count` fields, and clarified what `_count` metrics mean.
- The `search_after` example sorted on `_id`, which is not a safe recommended tie-breaker because `_id` does not have doc values enabled. Updated the example to use a stable doc-values-enabled tie-breaker field.
- The query cache section said filters are cached by default. Narrowed this to say frequently used filters are eligible for automatic query caching, matching Elasticsearch's documented query cache behavior.
- The stored fields section did not mention that fields must be explicitly mapped with `"store": true` and that stored fields are generally not recommended. Added that caveat and pointed readers back to `_source` filtering.
- The monitoring section labeled node search stats as latency percentiles. Changed the label to search timing counters because the command returns search stats counters, not percentiles.

## Review Notes
Elasticsearch documentation now recommends query logging as a unified alternative for search-operation slow logs, while slow logs remain useful and still documented. The post remains technically relevant, but future revisions could mention query logging as an additional option for newer Elasticsearch deployments.
