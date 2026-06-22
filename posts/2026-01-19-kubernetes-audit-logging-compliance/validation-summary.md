# Validation Summary: How to Implement Kubernetes Audit Logging for Compliance

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes audit logging and audit policies
- kube-apiserver audit backends and flags
- Fluent Bit log forwarding
- Vector log processing
- Elasticsearch query DSL
- Prometheus Operator alert rules
- Kubernetes API server metrics
- kube-bench / CIS Kubernetes Benchmark checks
- Grafana dashboards

## Sources Consulted
- Kubernetes Auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Fluent Bit Elasticsearch output documentation: https://docs.fluentbit.io/manual/data-pipeline/outputs/elasticsearch
- Vector Elasticsearch sink documentation: https://vector.dev/docs/reference/configuration/sinks/elasticsearch/
- Vector configuration reference: https://vector.dev/docs/reference/configuration/
- Vector Loki sink documentation: https://vector.dev/docs/reference/configuration/sinks/loki/
- kube-bench flags and commands documentation: https://aquasecurity.github.io/kube-bench/v0.6.7/flags-and-commands/
- Grafana Loki HTTP API documentation: https://grafana.com/docs/loki/latest/reference/loki-http-api/

## Issues Found
- The Vector Elasticsearch sink used `endpoint` and `index`, but current Vector Elasticsearch sink configuration uses `endpoints` and `bulk.index`. Updated the snippet so it matches the documented sink schema.
- The Fluent Bit Elasticsearch output used `Type _doc`, which is not appropriate for Elasticsearch 8 because mapping types are no longer supported. Replaced it with `Suppress_Type_Name On`.
- The Elasticsearch query examples were fenced as strict JSON while containing comments. Changed the code fence to `jsonc` so the example syntax is accurately labeled.
- The Prometheus alert examples queried `apiserver_audit_event_total` with labels such as `response_code`, `resource`, `verb`, and `apigroup`. Kubernetes documents `apiserver_audit_event_total` as an audit event counter without those request labels, while `apiserver_request_total` exposes `code`, `group`, `resource`, `subresource`, and `verb`. Updated the alert queries to use `apiserver_request_total` and corrected `response_code`/`apigroup` label names to `code`/`group`.
- The Grafana dashboard examples used the same invalid audit metric labels and PromQL single-quoted label values. Updated the dashboard expressions to use `apiserver_request_total`, valid label names, and double-quoted PromQL label values. Replaced the unsupported "Top Users" API server metric panel with a "Top Resources" panel because Kubernetes API server metrics do not expose a `user` label.
- The policy example listed PodSecurityPolicy without a version caveat. Added a note that PodSecurityPolicy applies only to legacy clusters before Kubernetes 1.25, where it was removed.

## Review Notes
- The Kubernetes audit policy structure, audit levels, `kube-apiserver` audit flags, log backend setup, webhook kubeconfig shape, and kube-bench command pattern are consistent with the consulted documentation.
- The Prometheus examples now monitor API request activity rather than parsing audit log content. Per-user audit analysis still requires querying the stored audit logs in Elasticsearch, Loki, or a SIEM rather than using native API server metrics.
