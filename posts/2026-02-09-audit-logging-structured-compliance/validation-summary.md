# Validation Summary: How to Set Up Kubernetes Audit Logging with Structured Output

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes audit logging
- Kubernetes audit policy API (`audit.k8s.io/v1`)
- kube-apiserver audit log backend flags
- Fluentd log forwarding
- Elasticsearch queries
- jq
- Prometheus alerting

## Sources Consulted
- Kubernetes Auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes kube-apiserver reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes kube-apiserver Audit Configuration API (`audit.k8s.io/v1`): https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/
- Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Fluentd tail input plugin documentation: https://docs.fluentd.org/input/tail

## Issues Found
- The first audit policy comment claimed the `serviceaccounts/token` rule logged all authentication events. This subresource covers service account token requests, so the comment was corrected.
- The audit policy file snippet was marked as `bash` even though it is YAML. The fence was changed to `yaml`.
- The Fluentd parser used `time_key timestamp`, but Kubernetes audit events use `requestReceivedTimestamp` and `stageTimestamp`. The parser now uses `requestReceivedTimestamp` and keeps that field in the record.
- The Fluentd DaemonSet referenced `serviceAccountName: fluentd` without defining the ServiceAccount. A minimal ServiceAccount manifest was added to make the example apply cleanly.
- The analysis and reporting commands read kube-apiserver container logs with `kubectl logs`, but the configured audit backend writes JSONLines to `/var/log/kubernetes/audit.log`. The examples now read the configured audit log file directly.
- The compliance report accepted `END_DATE` but did not use it. The `jq` filters now bound events by both `START_DATE` and `END_DATE` using `requestReceivedTimestamp`.
- The monitoring example used a nonexistent `kube_audit_log_last_write_timestamp_seconds` metric. It now uses documented kube-apiserver audit metrics: `apiserver_audit_event_total` and `apiserver_audit_error_total`.
- The disk-space alert used `mountpoint="/var/log/kubernetes"`, but that path is configured as a directory and is not necessarily a filesystem mountpoint in node-exporter metrics. The example now checks the root filesystem, which is the common backing filesystem for that directory unless operators mount audit logs separately.

## Review Notes
The Kubernetes audit policy levels, `omitStages`, log backend flags, JSON audit format, and audit event fields were verified against current official Kubernetes documentation. The Prometheus `AuditEventsNotExported` example can be noisy on very quiet clusters because lack of API activity can also mean no new audit events; production alerts should tune the window or pair this with a synthetic API request if strict audit pipeline heartbeat monitoring is required.
