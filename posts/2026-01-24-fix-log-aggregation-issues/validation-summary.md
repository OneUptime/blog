# Validation Summary: How to Fix 'Log Aggregation' Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes
- Grafana Loki
- Grafana Alloy
- Fluentd
- Elasticsearch
- Grafana
- LogQL
- Pino

## Sources Consulted
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/
- Grafana Loki log queries reference: https://grafana.com/docs/loki/latest/query/log_queries/
- Grafana Loki bloom filters documentation: https://grafana.com/docs/loki/latest/operations/bloom-filters/
- Grafana Loki retention documentation: https://grafana.com/docs/loki/latest/operations/storage/retention/
- Grafana Promtail EOL notice: https://grafana.com/docs/loki/latest/send-data/promtail/
- Grafana Alloy Kubernetes log collection documentation: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.source.kubernetes/
- Grafana Alloy HTTP endpoints documentation: https://grafana.com/docs/alloy/latest/reference/http/
- Grafana Alloy loki.process documentation: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.process/
- Fluentd record_transformer documentation: https://docs.fluentd.org/filter/record_transformer
- Fluentd buffer section documentation: https://docs.fluentd.org/configuration/buffer-section
- Elasticsearch cardinality aggregation documentation: https://www.elastic.co/docs/reference/aggregations/search-aggregations-metrics-cardinality-aggregation
- Elasticsearch ILM documentation: https://www.elastic.co/docs/manage-data/lifecycle/index-lifecycle-management
- Elasticsearch thread pool settings documentation: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/thread-pool-settings
- Elasticsearch indexing buffer settings documentation: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/indexing-buffer-settings
- Pino API documentation: https://github.com/pinojs/pino/blob/main/docs/api.md

## Issues Found
- Promtail examples were outdated because Promtail is EOL as of March 2, 2026. Replaced Promtail collector references and snippets with Grafana Alloy examples.
- The Promtail `pipeline_stages` snippets were no longer appropriate for current Loki collection guidance. Replaced them with Alloy `loki.process` examples using `stage.static_labels`, `stage.json`, `stage.structured_metadata`, `stage.output`, and `stage.label_drop`.
- The LogQL time range example used invalid inline timestamp syntax. Updated it to state that the time range should be selected in Grafana Explore or the Loki query API while keeping the LogQL selector valid.
- The LogQL label-filter example used an invalid `| app="my-app"` pipeline expression. Replaced it with a valid parsed-field filter example and kept the recommended stream selector form.
- The Loki bloom filter configuration used outdated keys such as `bloom_compactor` and `schema_config.configs[].bloom_build`. Replaced it with current `bloom_shipper`, `bloom_build`, `bloom_gateway`, and bloom-related `limits_config` keys.
- The Loki retention configuration used the removed `compactor.shared_store` key. Replaced it with `compactor.delete_request_store`.
- The Loki compression snippet included outdated FIFO cache configuration. Removed the deprecated cache block and kept current `ingester.chunk_encoding` and `chunk_target_size` settings.

## Review Notes
The Elasticsearch ILM snippet is syntactically valid, but applying rollover in production also requires an index alias or data stream configured as the write target. The Fluentd Loki output example assumes the relevant Loki output plugin is installed.
