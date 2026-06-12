# Validation Summary: How to Create Centralized Logging Architecture

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Centralized logging architecture
- Grafana Loki
- Grafana Alloy
- Grafana data source provisioning
- Elasticsearch
- Logstash
- Docker
- JavaScript structured logging

## Sources Consulted
- Grafana Loki configuration examples: https://grafana.com/docs/loki/latest/configure/examples/configuration-examples/
- Grafana Loki storage schema documentation: https://grafana.com/docs/loki/latest/operations/storage/schema/
- Grafana Loki TSDB documentation: https://grafana.com/docs/loki/latest/operations/storage/tsdb/
- Grafana Loki retention documentation: https://grafana.com/docs/loki/latest/operations/storage/retention/
- Grafana Loki Promtail EOL notice: https://grafana.com/docs/loki/latest/send-data/promtail/
- Grafana Alloy file source documentation: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.source.file/
- Grafana Alloy process component documentation: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.process/
- Grafana Alloy write component documentation: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.write/
- Grafana Alloy Docker install documentation: https://grafana.com/docs/alloy/latest/set-up/install/docker/
- Grafana Loki data source provisioning documentation: https://grafana.com/docs/grafana/latest/datasources/loki/
- Elastic Elasticsearch memory lock documentation: https://www.elastic.co/docs/deploy-manage/deploy/self-managed/setup-configuration-memory
- Elastic Elasticsearch important settings documentation: https://www.elastic.co/docs/deploy-manage/deploy/self-managed/important-settings-configuration
- Elastic Logstash Beats input plugin documentation: https://www.elastic.co/docs/reference/logstash/plugins/plugins-inputs-beats
- Elastic Logstash Elasticsearch output plugin documentation: https://www.elastic.co/docs/reference/logstash/plugins/plugins-outputs-elasticsearch

## Issues Found
- Promtail was used as the Loki log shipper. Promtail is EOL as of March 2, 2026, so the post now uses Grafana Alloy and current Alloy component syntax.
- The Loki configuration used the older BoltDB Shipper schema and `shared_store` style settings. Updated it to the current recommended TSDB store with schema v13 and removed obsolete shared-store configuration.
- Loki retention was enabled without `compactor.delete_request_store`, which current Loki requires. Added `delete_request_store: filesystem`.
- The Grafana derived field regex expected `trace_id=` while the application log example emits JSON. Updated the regex to match JSON-formatted `trace_id` values.
- The Logstash Elasticsearch output combined a dynamic `index` setting with ILM rollover alias settings. Elastic documents that dynamic variable substitution cannot be used in that mode, so the conflicting `index` line was removed.
- The Loki comparison table implied Loki only supports label filtering. Clarified that Loki uses labels to narrow searches and can then apply line filters.

## Review Notes
- The edited Alloy configuration was validated with `grafana/alloy:latest validate`.
- The edited Loki configuration was validated with `grafana/loki:latest -verify-config`.
- The edited Logstash pipeline was validated with `docker.elastic.co/logstash/logstash:9.4.2 --config.test_and_exit`.
- The Docker examples use `latest` to align with current documentation, but production deployments should pin tested image versions.
