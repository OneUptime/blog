# Validation Summary: How to Implement Elasticsearch Rollup Jobs for Long-Term Log Analytics

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Elasticsearch rollup jobs
- Elasticsearch Rollup APIs
- Elasticsearch rollup search
- Elasticsearch Index Lifecycle Management (ILM)
- Kibana rollup data views
- JSON API configuration
- curl commands

## Sources Consulted
- Elastic Elasticsearch documentation: Rollup overview, https://www.elastic.co/guide/en/elasticsearch/reference/current/xpack-rollup.html
- Elastic Elasticsearch documentation: Get started with rollups using the API, https://www.elastic.co/guide/en/elasticsearch/reference/current/rollup-getting-started.html
- Elastic Elasticsearch documentation: Create rollup jobs API, https://www.elastic.co/guide/en/elasticsearch/reference/8.19/rollup-put-job.html
- Elastic Elasticsearch documentation: Rollup aggregation limitations, https://www.elastic.co/guide/en/elasticsearch/reference/current/rollup-agg-limitations.html
- Elastic Elasticsearch documentation: Rollup search limitations, https://www.elastic.co/guide/en/elasticsearch/reference/current/rollup-search-limitations.html
- Elastic Elasticsearch API documentation: Search rolled-up data, https://www.elastic.co/docs/api/doc/elasticsearch/v8/operation/operation-rollup-rollup-search
- Elastic Elasticsearch documentation: Stop rollup jobs API, https://www.elastic.co/guide/en/elasticsearch/reference/current/rollup-stop-job.html
- Elastic Kibana documentation: Get started with rollups in Kibana, https://www.elastic.co/guide/en/kibana/current/data-rollups.html
- Elastic Kibana documentation: Advanced settings for rollups, https://www.elastic.co/guide/en/kibana/current/advanced-options.html
- Elastic Elasticsearch migration documentation: Migrating to 8.15, https://www.elastic.co/guide/en/elasticsearch/reference/8.19/migrating-8.15.html

## Issues Found
- The post presented rollup jobs as a current implementation path without mentioning that rollups were deprecated in Elasticsearch 8.11 and that Elasticsearch 8.15+ blocks new rollup job creation on clusters without existing rollup usage. Added a current-version caveat and directed new deployments to downsampling.
- The post said rollups could store or support response time percentiles. Official rollup aggregation limitations list only date histogram, histogram, terms, min, max, sum, average, and value count. Replaced percentile language with supported min/max/average/request-volume wording and clarified that percentile aggregations are not available from rollup data.
- The basic rollup job processed data immediately, which can include incomplete or late-arriving buckets. Added a `delay` value to the `date_histogram` group and updated the explanation to describe processing complete older buckets.
- The rollup output index matched the source wildcard pattern (`application-logs-*`), which Elastic warns against because a rollup job can capture its own output index. Renamed the rollup output to `rollup-application-logs` and updated the search and Kibana examples.
- The combined raw-and-rollup query labeled an aggregation as `errors_per_day` but counted every document with a `log.level` value. Added a `term` filter for `log.level: ERROR` so the query actually counts errors.
- The ILM section implied that ILM creates rollup summaries. Clarified that rollup jobs and ILM are separate: rollup jobs write summary indices, while ILM manages raw index lifecycle transitions.
- The Kibana section used older "index pattern" language and omitted the rollup data view requirement. Updated it to reference a Rollup data view and the `rollups:enableIndexPatterns` setting.
- The delete example used `sleep` after stopping the job. Replaced it with the official `wait_for_completion=true` stop parameter before deleting the job.

## Review Notes
The post is technically valid as a legacy rollup guide after the corrections. For future content, a downsampling-focused guide would be more appropriate for new Elasticsearch time series deployments because rollups are deprecated and planned for removal.
