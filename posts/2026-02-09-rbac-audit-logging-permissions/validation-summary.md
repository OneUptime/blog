# Validation Summary: How to Implement RBAC Audit Logging for Permission Changes and Access Attempts

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes audit logging
- Kubernetes RBAC
- kube-apiserver audit log and webhook backends
- jq
- Grafana Loki and LogQL
- Grafana Alloy
- Bash and logrotate
- Flask webhook receiver
- Compliance-oriented log retention

## Sources Consulted
- Kubernetes Auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes kube-apiserver Audit Configuration API reference: https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/
- Grafana Promtail EOL documentation: https://grafana.com/docs/loki/latest/send-data/promtail/
- Grafana Alloy `loki.source.file` documentation: https://grafana.com/docs/alloy/latest/reference/components/loki.source.file/
- Grafana Loki LogQL log query documentation: https://grafana.com/docs/loki/latest/query/log_queries/
- jq manual: https://jqlang.org/manual/
- PCI DSS v4.0 SAQ C requirement 10.5.1 audit log retention reference: https://listings.pcisecuritystandards.org/documents/PCI-DSS-v4-0-SAQ-C.pdf
- HIPAA Security Rule documentation retention rule, 45 CFR 164.316: https://www.ecfr.gov/current/title-45/section-164.316

## Issues Found
- The audit policy used `responseStatus` inside a `PolicyRule`. Kubernetes audit events have `responseStatus`, but audit policy rules do not support matching on response status. Removed the invalid rule and clarified that the catch-all Metadata rule records response status codes for later querying.
- Several jq examples used invalid membership syntax such as `.verb in ["update", "patch", "delete"]`. Replaced these with `index()`-based membership checks that parse correctly with jq.
- The real-time alerting section used the removed/deprecated `auditregistration.k8s.io/v1alpha1` `AuditSink` API. Replaced it with the supported kube-apiserver webhook audit backend configuration and flags.
- The Loki shipping example used Promtail, which is EOL as of March 2, 2026. Replaced it with a Grafana Alloy `loki.source.file` and `loki.write` example.
- The LogQL examples depended on labels extracted by the removed Promtail pipeline. Updated them to extract JSON fields at query time with LogQL.
- The post described SOC 2 and HIPAA retention periods too prescriptively. Updated the language to distinguish PCI DSS's explicit 12-month audit log retention from SOC 2 control/audit-period expectations and HIPAA Security Rule documentation retention.
- The introduction implied Kubernetes audit logs are inherently immutable. Reworded it because immutability depends on storage and log protection controls.
- The logrotate example combined `delaycompress` with uploading `audit.log.1.gz`, which would not reliably exist immediately after rotation. Removed `delaycompress` and used `lastaction` for the upload step.

## Review Notes
The kubeadm audit log configuration, audit levels, RBAC resource names, ServiceAccount token subresource auditing, pod exec/attach/portforward subresource auditing, Flask receiver structure, and main audit-log query goals are technically sound after the corrections. Managed Kubernetes platforms often expose audit logs through provider-specific mechanisms instead of direct API server manifest edits, so future versions of the post could mention provider-specific setup paths.
