# Validation Summary: How to Build Log Analytics Dashboards in OpenSearch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon OpenSearch Service
- OpenSearch Dashboards
- OpenSearch Query DSL
- OpenSearch aggregations
- Dashboards Query Language (DQL)
- TSVB visualizations and annotations
- OpenSearch index transforms

## Sources Consulted
- OpenSearch documentation: Index patterns - https://docs.opensearch.org/latest/dashboards/management/index-patterns/
- OpenSearch documentation: Dashboards Query Language (DQL) - https://docs.opensearch.org/latest/dashboards/dql/
- OpenSearch documentation: TSVB - https://docs.opensearch.org/3.0/dashboards/visualize/tsvb/
- OpenSearch documentation: Date histogram aggregations - https://docs.opensearch.org/latest/aggregations/bucket/date-histogram/
- OpenSearch documentation: Bucket script aggregations - https://docs.opensearch.org/latest/aggregations/pipeline/bucket-script/
- OpenSearch documentation: Value count aggregations - https://docs.opensearch.org/latest/aggregations/metric/value-count/
- OpenSearch documentation: Percentile aggregations - https://docs.opensearch.org/latest/aggregations/metric/percentile/
- OpenSearch documentation: Range aggregations - https://docs.opensearch.org/latest/aggregations/bucket/range/
- OpenSearch documentation: Aggregations overview - https://docs.opensearch.org/latest/aggregations/
- OpenSearch documentation: Index transforms - https://docs.opensearch.org/2.7/im-plugin/index-transforms/index/

## Issues Found
- The index pattern navigation used `Stack Management > Index Patterns`, which is Kibana/Elastic wording rather than the current OpenSearch Dashboards path. Changed it to `Management > Dashboards Management > Index patterns`.
- The error-rate section said to create a line chart with the JSON aggregation in Discover or Visualize. Discover uses the search toolbar/query languages rather than accepting aggregation DSL for this workflow. Changed the wording to point to Visualize for the chart while keeping the JSON aggregation as reference.
- Several term filters and aggregations used plain string fields (`level`, `service`, `event_type`) where OpenSearch aggregations and exact term queries should use keyword fields when the values are mapped as text with keyword subfields. Updated those examples to use `.keyword` fields.
- The saved-query examples used Lucene-style numeric range syntax (`response_time_ms:>5000`) while the post describes saving queries in Discover, where OpenSearch Dashboards defaults to DQL. Updated the examples to DQL numeric inequality syntax (`response_time_ms > 5000`).

## Review Notes
The corrected examples assume common dynamic mappings where string log fields have `.keyword` subfields. If a deployment maps fields such as `level`, `service`, or `event_type` directly as `keyword`, those field names can be used without the `.keyword` suffix.
