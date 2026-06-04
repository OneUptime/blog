# Validation Summary: How to Use Fluentd Output Plugins for Routing Logs to Multiple Destinations

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Fluentd
- Fluentd output plugins
- Fluentd tag matching and match order
- Fluentd copy output plugin
- Fluentd rewrite_tag_filter output plugin
- Fluentd buffer and secondary output configuration
- Elasticsearch output plugin
- S3 output plugin
- Kafka output plugin
- HTTP output plugin
- Slack output plugin
- Prometheus and monitor_agent monitoring

## Sources Consulted
- Fluentd configuration file syntax and match order: https://docs.fluentd.org/configuration/config-file
- Fluentd output plugin overview and secondary outputs: https://docs.fluentd.org/output
- Fluentd buffer section configuration: https://docs.fluentd.org/configuration/buffer-section
- Fluentd copy output plugin: https://docs.fluentd.org/output/copy
- Fluentd rewrite_tag_filter output plugin: https://docs.fluentd.org/output/rewrite_tag_filter
- Fluentd HTTP output plugin: https://docs.fluentd.org/output/http
- Fluentd secondary_file output plugin: https://docs.fluentd.org/output/secondary_file
- Fluentd S3 output plugin: https://docs.fluentd.org/output/s3
- Fluentd Elasticsearch output plugin: https://docs.fluentd.org/output/elasticsearch
- Fluentd monitor_agent input plugin: https://docs.fluentd.org/input/monitor_agent
- Fluentd Prometheus monitoring guide: https://docs.fluentd.org/monitoring-fluentd/monitoring-prometheus
- fluent-plugin-elasticsearch README: https://github.com/uken/fluent-plugin-elasticsearch
- fluent-plugin-kafka README: https://github.com/fluent/fluent-plugin-kafka
- fluent-plugin-slack README: https://www.rubydoc.info/gems/fluent-plugin-slack/0.5.5

## Issues Found
- The post incorrectly stated that Fluentd sends an event to every matching `<match>` directive. Fluentd uses the first matching directive in configuration order. Updated the routing explanation and the affected examples to emphasize first-match behavior.
- The basic multi-destination example placed `<match **>` before `<match **.error>`, which would prevent error events from reaching the Slack match. Reworked the example to place the specific error match first and use `@type copy` for explicit fan-out.
- The copy plugin section implied that one failed destination never affects the others. Fluentd documentation notes that one store error can affect later stores unless `ignore_error` is used. Updated the explanation and kept `ignore_error` only where the example treats a destination as less critical.
- The rewrite_tag_filter examples re-emitted events into tag patterns that could match the same rewrite rule again. Updated rewritten tags to use a separate `routed.*` prefix and adjusted downstream matches.
- The PagerDuty example used an unsupported `@type pagerduty` output without a verified Fluentd plugin. Replaced it with a generic HTTP alerting webhook example using the documented `out_http` plugin.
- The HTTP secondary output used the generic `file` output. Updated it to `secondary_file`, which Fluentd documents as the output intended for `<secondary>` use.
- The fallback section showed nested `<secondary>` blocks and claimed logs would never be lost. Replaced that with a documented `copy` fallback pattern using `ignore_if_prev_success`, and softened the reliability claim to note that durable local buffering is still important.
- The secondary output explanation implied immediate failover. Updated it to state that Fluentd delegates failed buffer chunks to secondary output after retries exceed the configured threshold.

## Review Notes
- I could not run a local Fluentd configuration syntax check because Ruby and Fluentd are not installed in this workspace.
- Several examples use community plugins or deployment-specific integrations, so production readers should pin plugin versions and verify installed plugin parameter support.
