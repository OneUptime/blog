# Validation Summary: How to Audit Secret Access Events in Kubernetes Audit Logs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes audit logging and audit policy configuration
- kube-apiserver audit log backend flags
- Kubernetes Secrets
- GKE, EKS, and AKS audit log enablement
- Fluentd and Elasticsearch log shipping
- Kibana queries
- Prometheus alerting rules
- Kubernetes CronJob
- jq and shell scripting

## Sources Consulted
- Kubernetes Auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes kube-apiserver reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- GKE audit logging information: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/audit-logging
- GKE logging configuration values: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/about-logs
- Google Cloud Data Access audit log configuration: https://docs.cloud.google.com/logging/docs/audit/configure-data-access
- eksctl CloudWatch cluster logging documentation: https://docs.aws.amazon.com/eks/latest/eksctl/cloudwatch-cluster-logging.html
- AKS monitoring and resource log documentation: https://learn.microsoft.com/en-us/azure/aks/monitor-aks
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/2.54/configuration/alerting_rules/
- Elasticsearch mapping type removal documentation: https://www.elastic.co/docs/manage-data/data-store/mapping/removal-of-mapping-types

## Issues Found
- The audit policy examples placed `None` rules after broader Secret rules. Kubernetes audit rules are evaluated in order and the first matching rule applies, so the system-user exclusions would not have applied to Secret requests. Moved the exclusions before the Secret logging rules.
- The detailed policy recommended `RequestResponse` for Secret create/update/patch operations. Kubernetes documents that `RequestResponse` logs request and response bodies, which can expose Secret data. Changed Secret writes to `Metadata` and updated the best-practice note.
- The kube-apiserver image used the legacy `k8s.gcr.io` registry. Updated it to `registry.k8s.io`.
- The managed Kubernetes examples were inaccurate or incomplete for audit logs. Updated EKS to enable the `audit` control-plane log type with `--approve`, changed AKS to use diagnostic settings for `kube-audit`, and changed GKE guidance to configure Data Access audit logs for the `k8s.io` service.
- The failed-access examples treated any non-200 status as failure, which would incorrectly include successful 201 or 204 responses. Updated jq, Kibana, and Prometheus examples to match 4xx/5xx failures.
- The Prometheus rules used Kubernetes' native `apiserver_audit_event_total` as if it exposed audit-event fields as labels. The official metric has no resource/user/status labels. Updated the section to use a custom log-derived metric, `kubernetes_audit_events_total`.
- The `SecretDeleted` alert referenced a namespace label after a plain `sum()` aggregation would have dropped it. Changed the expression to aggregate by `objectRef_namespace`.
- The Fluentd Elasticsearch output included `type_name`, which is obsolete for Elasticsearch 8 because mapping types were removed. Removed the setting.
- The report script used a Bash shebang and Bash-specific tab parsing while the CronJob executed it with `/bin/sh`, and the Alpine image did not include `jq`. Converted the script to POSIX-compatible shell usage, quoted file variables, and updated the CronJob command to install `jq`.

## Review Notes
- The Prometheus alerting examples now assume a separate log-to-metrics pipeline that exports audit fields as labels. Kubernetes' built-in audit metrics are useful for audit backend health, but not for per-resource Secret access alerting.
- The CronJob hostPath approach is mainly appropriate for self-managed clusters where the pod can run on a node that has the audit log file. Managed clusters usually require provider-native log sinks instead.
