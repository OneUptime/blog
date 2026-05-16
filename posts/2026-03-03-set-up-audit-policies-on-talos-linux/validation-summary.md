# Validation Summary: How to Set Up Audit Policies on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration, talosctl)
- Kubernetes (audit policy v1, kube-apiserver flags)
- Fluent Bit (tail input, modify filter, es output, JSON parser)
- Elasticsearch (audit log shipping target)
- Prometheus / Prometheus Operator (PrometheusRule CRD)
- jq (audit log analysis)
- SOC 2 (compliance framing)

## Sources Consulted
- Kubernetes Auditing reference: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes audit policy API (audit.k8s.io/v1): https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/
- Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- kubernetes/apiserver audit metrics source: https://github.com/kubernetes/apiserver/blob/master/pkg/audit/metrics.go
- Talos Linux v1.8 config reference: https://docs.siderolabs.com/talos/v1.8/reference/configuration/v1alpha1/config/
- Fluent Bit `tail` input and `es` output plugin documentation: https://docs.fluentbit.io/manual/pipeline/inputs/tail and https://docs.fluentbit.io/manual/pipeline/outputs/elasticsearch
- Prometheus Operator PrometheusRule CRD: https://prometheus-operator.dev/docs/operator/api/

## Issues Found

1. **`extraVolumes` mounted a directory hostPath to a file mountPath.** The original config had `hostPath: /var/etc/kubernetes/audit` (a directory) mounted at `mountPath: /etc/kubernetes/audit-policy.yaml` (a file). Kubernetes hostPath mounts require the source and destination to be consistent in type, otherwise the API server static pod will fail to start (the directory would shadow the file path).  
   **Fix:** Changed `hostPath` to `/var/etc/kubernetes/audit-policy.yaml` so both source and destination reference the same file.

2. **Prometheus alerts used non-existent labels on `apiserver_audit_event_total`.** Per the kubernetes/apiserver source, `apiserver_audit_event_total` is a label-less counter (it does not carry `verb`, `resource`, or `code` dimensions). The alert expressions as written would silently match zero series and never fire.  
   **Fix:** Switched both alert expressions to `apiserver_request_total`, which is the standard apiserver request counter and exposes `code`, `verb`, `resource`, and related labels. Also normalized verb values to the uppercase form used by that metric (`GET`, `LIST`, `CREATE`, `UPDATE`, `PATCH`, `DELETE`) and added `PATCH` to the ClusterRoleBinding change alert so in-place edits are caught.

## Review Notes
- The first "extraArgs + extraVolumes" approach assumes the audit policy file already exists at `/var/etc/kubernetes/audit-policy.yaml` on the host. On Talos's immutable filesystem the reader will typically need to materialize that file via `machine.files` (with `op: create`/`overwrite`) or by using the second approach (`cluster.apiServer.auditPolicy`), which Talos handles natively. This is not strictly incorrect in the post — the second section presents the recommended path — but readers following the first example verbatim will need that extra step.
- `talosctl logs kube-apiserver | grep audit` only shows audit events when the kube-apiserver is configured to write audit logs to stdout. Talos's native `auditPolicy` config (the second example) defaults to writing to a file under `/var/log/audit`, so `talosctl logs` may not surface them; reading the audit log file directly (e.g., via `talosctl read /var/log/audit/kube-apiserver-audit.log`) is more reliable. Left as-is since the wording ("logs including audit events") is not technically false.
- The Fluent Bit Elasticsearch output uses `Type _doc` and `Logstash_Format On`. Both are accepted by the plugin and remain valid for Elasticsearch 7.x; ES 8.x removed mapping types but still accepts `_doc`. When `Logstash_Format` is `On`, the `Index` parameter is ignored in favor of `Logstash_Prefix` + date — harmless but worth noting.
- The toleration omits `operator: Exists` and a `value`. This still matches the control-plane taint because the default `Equal` operator with an empty value matches a taint with no value, which is how Kubernetes taints control-plane nodes today. Acceptable as written.
- The audit log field names referenced in the jq examples (`user.username`, `objectRef.resource`, `objectRef.apiGroup`, `responseStatus.code`, `requestReceivedTimestamp`, `verb`) all match the audit.k8s.io/v1 Event schema.
- `image: fluent/fluent-bit:latest` is fine for an example but pinning a version is preferred in production.
