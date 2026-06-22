# Validation Summary: How to Migrate from ELK Stack to Grafana Loki

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Grafana Loki
- Grafana Alloy
- Grafana dashboards and alerting
- ELK Stack
- Elasticsearch
- Logstash
- Filebeat
- Kibana Query Language
- LogQL
- Helm
- Amazon S3 object storage

## Sources Consulted
- Grafana Loki Helm installation documentation: https://grafana.com/docs/loki/latest/setup/install/helm/
- Grafana Loki simple scalable Helm chart documentation: https://grafana.com/docs/loki/latest/setup/install/helm/install-scalable/
- Grafana Loki LogQL metric query documentation: https://grafana.com/docs/loki/latest/query/metric_queries/
- Grafana Loki LogQL reference: https://grafana.com/docs/loki/latest/query/query_reference/
- Grafana Loki Logstash plugin documentation: https://grafana.com/docs/loki/latest/send-data/logstash/
- Grafana Loki Promtail EOL documentation: https://grafana.com/docs/loki/latest/send-data/promtail/
- Grafana Loki structured metadata documentation: https://grafana.com/docs/loki/latest/get-started/labels/structured-metadata/
- Grafana Loki 3.0 release notes: https://grafana.com/docs/loki/latest/release-notes/v3-0/
- Grafana Alloy file source documentation: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.source.file/
- Grafana Alloy file discovery documentation: https://grafana.com/docs/alloy/latest/reference/components/local/local.file_match/
- Grafana Alloy log processing documentation: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.process/
- Grafana Alloy send logs to Loki tutorial: https://grafana.com/docs/alloy/latest/tutorials/send-logs-to-loki/
- Elastic Filebeat output documentation: https://www.elastic.co/docs/reference/beats/filebeat/configuring-output
- Elastic Filebeat Logstash output documentation: https://www.elastic.co/docs/reference/beats/filebeat/logstash-output
- Elastic Filebeat filestream input documentation: https://www.elastic.co/docs/reference/beats/filebeat/filebeat-input-filestream
- Elastic Filebeat deprecated log input documentation: https://www.elastic.co/docs/reference/beats/filebeat/filebeat-input-log

## Issues Found
- The Helm command installed the deprecated `grafana/loki-stack` chart while the text said to use the newer Loki chart. Updated the repository and install command to use the Grafana community Loki chart and added `helm repo update`.
- The Loki Helm values used `schema_config`, which is Loki server configuration syntax, instead of the chart's `schemaConfig` value. Updated the values to use `schemaConfig` and added simple scalable deployment settings.
- The Filebeat example used the deprecated `log` input and configured both Elasticsearch and Logstash outputs. Filebeat supports only one output, and current Elastic docs recommend `filestream`; updated the example to use `filestream` with `ndjson` parsing and to send to Logstash for fan-out.
- The Logstash Loki output example used a `labels` option that is not part of the current official plugin configuration. Replaced it with `message_field` and `include_fields`, matching the documented plugin options.
- Promtail was presented as the default/active collection path. Promtail is EOL as of March 2, 2026, so the architecture and parallel collection example were updated to use Grafana Alloy.
- The LogQL percentile examples did not filter unwrap/parser errors, which can make metric queries fail. Added `| __error__=""` after `unwrap`.
- The Elasticsearch Watcher example counted errors in the last five minutes, but the Loki alert used `rate()` and compared errors per second to `100`. Changed it to `count_over_time()` to preserve equivalent semantics.
- The structured metadata guidance said it was indexed and available in Loki 2.7+. Updated it to say structured metadata is queryable without creating label index entries and should be used with Loki 3.0+ and schema v13.

## Review Notes
The migration strategy and query examples are generally sound, but the cost numbers are illustrative and will vary by cloud provider, retention tier, replication, compression, query volume, and operational model. Teams should validate costs with their own ingestion profile before using the estimate for planning.
