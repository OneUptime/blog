# Validation Summary: How to Monitor Redis in Kubernetes with Prometheus Operator

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- Kubernetes (Deployments, Services)
- Prometheus Operator (ServiceMonitor, PrometheusRule CRDs)
- oliver006/redis_exporter
- Grafana (dashboard import)

## Sources Consulted
- oliver006/redis_exporter GitHub repository: https://github.com/oliver006/redis_exporter
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes documentation on variable substitution in container args: https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/
- Prometheus template reference (humanizePercentage): https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- Grafana Dashboard 763: https://grafana.com/grafana/dashboards/763-redis-dashboard-for-prometheus-redis-exporter-1-x/
- Kubernetes API reference for Deployment and Service resources

## Issues Found
No technical issues found.

## Review Notes
- The `--redis.password=$(REDIS_PASSWORD)` approach in the Deployment args is technically correct (Kubernetes substitutes env vars in args fields), but redis_exporter also reads the `REDIS_PASSWORD` environment variable automatically, making the flag redundant. The current approach works but exposes the password in process arguments. This is a best-practice consideration, not a correctness issue.
- The post refers to Grafana dashboard 763 as "the official Redis dashboard." It is actually a community-contributed dashboard, though it is the most popular and widely used one for redis_exporter. This is a minor wording nuance, not a technical error.
- The `redis_memory_used_bytes / redis_memory_max_bytes` alert expression will produce unexpected results if `maxmemory` is not configured in Redis (the metric would be 0, causing division by zero). This is a common pattern in Redis alerting and not an error in the post, but worth noting for readers.
