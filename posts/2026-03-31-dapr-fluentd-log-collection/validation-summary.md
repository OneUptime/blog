# Validation Summary: How to Set Up FluentD for Dapr Log Collection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar logging on Kubernetes)
- FluentD (log collection via DaemonSet)
- Kubernetes (DaemonSet, ConfigMap, RBAC, ServiceAccount)
- Elasticsearch (log storage backend)
- fluent-plugin-kubernetes_metadata_filter
- fluent-plugin-elasticsearch

## Sources Consulted
- FluentD record_transformer plugin documentation — https://docs.fluentd.org/filter/record_transformer
- FluentD tail input plugin documentation — https://docs.fluentd.org/input/tail
- Dapr Kubernetes annotations reference — https://docs.dapr.io/reference/arguments-annotations-overview/
- fluent-plugin-kubernetes_metadata_filter documentation — https://github.com/fabric8io/fluent-plugin-kubernetes_metadata_filter
- fluent-plugin-elasticsearch documentation — https://github.com/uken/fluent-plugin-elasticsearch
- Kubernetes RBAC documentation — https://kubernetes.io/docs/reference/access-authn-authz/rbac/

## Issues Found

### 1. Missing `enable_ruby true` in record_transformer filter
**What was wrong:** The `record_transformer` filter used a Ruby expression (`record.dig(...)` with `||` operator) but did not set `enable_ruby true`. Without this setting, FluentD only supports simple `${record["field"]}` placeholder syntax — method calls like `.dig()` and operators like `||` are not evaluated.
**What was changed:** Added `enable_ruby true` to the `record_transformer` filter block.

### 2. Incorrect metadata path: `labels` should be `annotations`
**What was wrong:** The expression referenced `record.dig("kubernetes", "labels", "dapr.io/app-id")`, but `dapr.io/app-id` is a Dapr pod **annotation**, not a label. The `kubernetes_metadata` filter stores annotations under `record["kubernetes"]["annotations"]`, so the `labels` path would always return nil, causing the fallback `"unknown"` to be used for every log entry.
**What was changed:** Changed `"labels"` to `"annotations"` in the `record.dig()` call.

### 3. Removed deprecated `type_name _doc`
**What was wrong:** The `type_name _doc` setting in the Elasticsearch output is deprecated for Elasticsearch 7.x (which removed mapping types). The DaemonSet image targets ES7, so this setting produces deprecation warnings and is unnecessary.
**What was changed:** Removed the `type_name _doc` line from the Elasticsearch match block.

### 4. Removed no-op `index_name` setting
**What was wrong:** When `logstash_format true` is enabled, the `index_name` parameter is ignored entirely — indices are named using `<logstash_prefix>-<date>` instead (e.g., `dapr-2026.04.15`). Having `index_name dapr-logs` alongside `logstash_format true` is misleading, as readers might expect logs to appear in a `dapr-logs` index.
**What was changed:** Removed the `index_name dapr-logs` line to avoid confusion.

## Review Notes
- The DaemonSet does not mount `/var/lib/docker/containers`. This is fine for modern Kubernetes clusters using containerd (1.24+), where logs reside under `/var/log/pods/`. For older Docker-based clusters, an additional hostPath volume for `/var/lib/docker/containers` (read-only) would be needed.
- The RBAC resources are defined in Step 3, after the DaemonSet in Step 2, but the DaemonSet references `serviceAccountName: fluentd`. In practice, the ServiceAccount should be created before the DaemonSet. The ordering of steps could be swapped for clarity, but this is a presentation choice rather than a technical error.
- The Elasticsearch query in the verification step assumes port-forwarding to localhost:9200, which is not explicitly mentioned. Readers may need `kubectl port-forward svc/elasticsearch 9200:9200 -n logging` first.
