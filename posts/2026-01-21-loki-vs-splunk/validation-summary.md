# Validation Summary: Loki vs Splunk: Open Source vs Enterprise Logging

## Status
validated

## Post Type
Comparison guide

## Technologies Covered
- Grafana Loki
- Grafana Alloy
- OpenTelemetry Collector
- LogQL
- Splunk Enterprise and Splunk Cloud Platform
- SPL
- Splunk Machine Learning Toolkit
- Object storage such as S3 and GCS

## Sources Consulted
- Grafana Loki storage documentation: https://grafana.com/docs/loki/latest/configure/storage/
- Grafana Loki architecture documentation: https://grafana.com/docs/loki/latest/get-started/architecture/
- Grafana Loki components documentation: https://grafana.com/docs/loki/latest/get-started/components/
- Grafana Loki LogQL metric queries documentation: https://grafana.com/docs/loki/latest/query/metric_queries/
- Grafana Loki log data clients documentation: https://grafana.com/docs/loki/latest/send-data/
- Grafana Loki Promtail documentation: https://grafana.com/docs/loki/latest/send-data/promtail/
- Grafana Loki GitHub license information: https://github.com/grafana/loki
- Splunk anomalydetection command reference: https://help.splunk.com/en/splunk-cloud-platform/search/search-reference/10.3.2512/search-commands/anomalydetection
- Splunk stats command reference: https://help.splunk.com/en/splunk-cloud-platform/spl-search-reference/10.4.2604/search-commands/stats
- Splunk rex command reference: https://help.splunk.com/en/splunk-cloud-platform/spl-search-reference/10.4.2604/search-commands/rex
- Splunk pricing page: https://www.splunk.com/en_us/products/pricing.html
- Splunk pricing models page: https://www.splunk.com/en_us/products/pricing/pricing-models.html
- Splunk Enterprise licensing documentation: https://help.splunk.com/en?resourceId=Splunk_Admin_HowSplunklicensingworks&version=splunk-9_4
- Splunk manager node terminology: https://docs.splunk.com/Splexicon%3AManagernode
- Splunkbase marketplace: https://splunkbase.splunk.com/

## Issues Found
- The post used Promtail as the primary Loki collector. Promtail is EOL as of March 2, 2026, and Grafana directs users to migrate to Grafana Alloy or another supported client. Updated the architecture and hybrid examples to use Grafana Alloy or the OpenTelemetry Collector.
- The comparison table and cost section presented Splunk pricing as fixed per-GB public pricing. Splunk now documents multiple pricing models, including workload-based and ingest-based options, and public pages direct customers to quote-based pricing. Updated the pricing language and examples to avoid unsupported fixed costs.
- The Loki architecture row said "index-free", which was too broad. Loki does maintain a small index over labels/chunk metadata. Updated the wording to "Minimal index (labels/chunk metadata)".
- The Splunk architecture explanation said Splunk "indexes every word", which overstated the implementation. Updated it to say Splunk builds searchable indexes over ingested events.
- The SPL anomaly detection example used `field=response_time`, but the current `anomalydetection` syntax accepts a field list rather than a `field=` option. Updated it to `| anomalydetection method=zscore action=filter response_time`.
- The Splunk scaling snippet used the retired `cluster_master` terminology. Updated it to `manager_node`, matching current Splunk terminology.

## Review Notes
The cost figures for self-hosted Loki remain illustrative estimates; actual costs vary by cloud provider, retention, compression ratio, query load, replication, and operational staffing. The LogQL and SPL examples are syntactically aligned with current documentation, but real deployments still require matching field extraction, labels, sourcetypes, and index names.
