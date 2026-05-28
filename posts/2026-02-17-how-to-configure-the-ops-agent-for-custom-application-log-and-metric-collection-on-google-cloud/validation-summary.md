# Validation Summary: How to Configure the Ops Agent for Custom Application Log and Metric Collection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Ops Agent
- Cloud Logging
- Cloud Monitoring
- Compute Engine
- Fluent Bit
- OpenTelemetry Collector
- Prometheus metrics
- StatsD via Prometheus exporter
- Third-party Ops Agent integrations for nginx, Apache, and MySQL

## Sources Consulted
- Google Cloud Ops Agent overview: https://cloud.google.com/monitoring/agent/ops-agent
- Google Cloud Ops Agent configuration reference: https://cloud.google.com/logging/docs/agent/ops-agent/configuration
- Google Cloud Ops Agent Prometheus receiver documentation: https://cloud.google.com/monitoring/agent/ops-agent/prometheus
- Google Cloud Ops Agent installation documentation: https://cloud.google.com/monitoring/agent/ops-agent/installation
- Google Cloud Ops Agent troubleshooting documentation: https://cloud.google.com/logging/docs/agent/ops-agent/troubleshoot-find-info
- Google Cloud nginx integration documentation: https://cloud.google.com/logging/docs/agent/ops-agent/third-party/nginx
- Google Cloud Apache integration documentation: https://cloud.google.com/logging/docs/agent/ops-agent/third-party/apache
- Google Cloud MySQL logging integration documentation: https://cloud.google.com/logging/docs/agent/ops-agent/third-party/mysql
- Google Cloud MySQL metrics integration documentation: https://cloud.google.com/monitoring/agent/ops-agent/third-party/mysql
- Google Cloud legacy Monitoring Agent StatsD plugin documentation: https://cloud.google.com/monitoring/agent/plugins/statsd

## Issues Found
- The post described the configuration as having a combined service section. Updated this to explain that `logging` and `metrics` are the top-level sections and each can contain its own `service` pipelines.
- The custom file receiver used `record_log_name`, which is not a documented Ops Agent `files` receiver field. Replaced it with `record_log_file_path: true`, which is supported.
- Timestamp formats used a literal `Z` suffix. Updated examples to the documented `%Z` timezone directive in `time_format`.
- Metric examples used a `default` pipeline for host metrics. Updated these to `default_pipeline`, matching the built-in Ops Agent pipeline ID and avoiding an extra duplicate default pipeline.
- The StatsD example used an unsupported native Ops Agent `statsd` metrics receiver. Reworked it to explain that the Ops Agent does not have a native StatsD receiver and to scrape a local StatsD-to-Prometheus exporter with the supported Prometheus receiver.
- The architecture diagram and wrap-up said the Ops Agent receives StatsD metrics directly. Updated both to reflect the StatsD exporter plus Prometheus receiver approach.
- The MySQL slow-query receiver used `mysql_slow_query`, which is not the documented receiver type. Changed the receiver type to `mysql_slow`.
- The MySQL example defined log receivers but did not connect them to a logging pipeline. Added the missing logging `service` pipeline.
- The MySQL metrics example defined a receiver without a metrics pipeline. Added the required metrics `service` pipeline.

## Review Notes
The examples remain generic and assume Linux Compute Engine instances with suitable service account permissions and readable log files. For production MySQL credentials, Google Cloud recommends avoiding plaintext passwords and supports Secret Manager references in Ops Agent configuration.
