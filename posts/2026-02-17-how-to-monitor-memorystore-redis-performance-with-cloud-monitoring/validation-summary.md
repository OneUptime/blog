# Validation Summary: How to Monitor Memorystore Redis Performance with Cloud Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Memorystore for Redis
- Cloud Monitoring metrics, dashboards, alerting policies, and notification channels
- Google Cloud CLI
- Redis INFO and SLOWLOG commands
- Python redis-py client

## Sources Consulted
- Google Cloud Memorystore for Redis supported monitoring metrics: https://docs.cloud.google.com/memorystore/docs/redis/supported-monitoring-metrics
- Google Cloud Memorystore for Redis monitoring guide: https://docs.cloud.google.com/memorystore/docs/redis/monitor-instances
- Google Cloud Memorystore for Redis memory management best practices: https://docs.cloud.google.com/memorystore/docs/redis/memory-management-best-practices
- Google Cloud Monitoring metrics reference: https://docs.cloud.google.com/monitoring/api/metrics_gcp_p_z
- Google Cloud SDK `gcloud monitoring dashboards create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/dashboards/create
- Google Cloud SDK `gcloud monitoring policies create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud SDK `gcloud alpha monitoring channels create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/alpha/monitoring/channels/create
- Google Cloud Monitoring notification channels API guide: https://cloud.google.com/monitoring/alerts/using-channels-api
- Redis `SLOWLOG GET` command reference: https://redis.io/docs/latest/commands/slowlog-get/
- redis-py command documentation: https://redis.readthedocs.io/

## Issues Found
- Several Memorystore metric names used Redis INFO-style names instead of Cloud Monitoring metric type names. Updated connected clients, rejected connections, calls, and average TTL to the documented Cloud Monitoring metric types.
- The dashboard example used the incorrect connected-clients metric type. Updated it to `redis.googleapis.com/clients/connected`.
- Alert policy commands used obsolete or unsupported threshold flags such as `--condition-threshold-value`, `--condition-threshold-comparison`, and `--condition-threshold-duration`. Replaced them with the documented `--if` and `--duration` flags for `gcloud monitoring policies create`.
- The Slack notification channel example only supplied `channel_name`, but the Slack channel descriptor also requires an `auth_token` label. Replaced the one-line command with a JSON channel definition that includes both labels and uses `--channel-content-from-file`.
- The slow-log helper accepted `threshold_ms` but did not apply it. Updated the code to filter entries by the threshold and print an accurate message.
- The Calls metric was described as commands processed per second. Updated it to commands processed per minute to match the documented metric.

## Review Notes
- Google Cloud documentation recommends alerting on system memory usage ratio at 80% for Memorystore memory pressure. The post's memory usage ratio alert remains technically valid, but a future revision could add system memory usage ratio as an additional production alert.
