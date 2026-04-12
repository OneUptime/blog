# Validation Summary: How to Set Up MongoDB Monitoring on Kubernetes

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- MongoDB
- Kubernetes (Deployments, Services, Secrets, StatefulSets)
- Percona MongoDB Exporter (percona/mongodb_exporter:0.40)
- Prometheus Operator (ServiceMonitor CRD)
- kubectl CLI

## Sources Consulted
- Percona MongoDB Exporter GitHub repository (https://github.com/percona/mongodb_exporter) — verified flags (`--mongodb.uri`, `--collect-all`), default port (9216), and environment variable support (`MONGODB_URI`)
- Kubernetes API reference — verified Deployment, Service, and Secret resource specifications
- Prometheus Operator documentation (https://prometheus-operator.dev/) — verified ServiceMonitor CRD apiVersion `monitoring.coreos.com/v1` and spec structure
- MongoDB documentation on built-in roles (https://www.mongodb.com/docs/manual/reference/built-in-roles/) — verified `clusterMonitor` and `read` roles for monitoring users

## Issues Found
No technical issues found.

## Review Notes
- The metric names in the "Key Metrics to Watch" section (`mongodb_connections`, `mongodb_opcounters_total`, `mongodb_repl_lag_seconds`, `mongodb_mem_resident_mb`, `mongodb_wiredtiger_cache_used_bytes`) use a simplified naming convention. Percona's mongodb_exporter v0.40+ may use different metric prefixes (e.g., `mongodb_ss_*` for serverStatus metrics) depending on whether `--compatible-mode` is enabled. Users should verify actual metric names by querying the `/metrics` endpoint, which the post already demonstrates in the "Verifying the Setup" section.
- The Deployment YAML uses Kubernetes variable substitution `$(MONGODB_URI)` in the `args` field, which correctly references the environment variable defined in the `env` section. This is valid Kubernetes behavior.
- The MongoDB monitoring user roles (`clusterMonitor` on admin, `read` on local) are the recommended minimal privileges for monitoring, including replication oplog access.
- The `release: prometheus` label on the ServiceMonitor is a common convention for matching the Prometheus Operator's default `serviceMonitorSelector`, but users may need to adjust this label to match their specific Prometheus installation.
