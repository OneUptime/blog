# Validation Summary: How to Set Up Audit Logging for Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux machine configuration (`cluster.apiServer`, `machine.logging`)
- Kubernetes API server audit logging (`audit.k8s.io/v1` Policy)
- kube-apiserver audit flags (`audit-log-path`, `audit-policy-file`, `audit-log-maxage`, `audit-log-maxbackup`, `audit-log-maxsize`, `audit-webhook-config-file`, `audit-webhook-batch-max-wait`)
- talosctl CLI (`apply-config`)
- Fluent Bit (HTTP input, Elasticsearch output, S3 output)
- Grafana Loki (helm `grafana/loki-stack` chart)
- Elasticsearch ILM policies

## Sources Consulted
- Talos configuration reference: https://www.talos.dev/v1.9/reference/configuration/v1alpha1/config/ (specifically `cluster.apiServer.auditPolicy`, `cluster.apiServer.extraArgs`, `cluster.apiServer.extraVolumes`, `machine.logging.destinations`)
- Talos logging documentation: https://www.talos.dev/v1.9/talos-guides/configuration/logging/
- Kubernetes auditing reference: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- kube-apiserver command-line reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Fluent Bit Elasticsearch output: https://docs.fluentbit.io/manual/data-pipeline/outputs/elasticsearch
- Grafana loki-stack helm chart: https://github.com/grafana/helm-charts/tree/main/charts/loki-stack

## Issues Found

1. **Volume mount type mismatch for audit policy file** (Configuring Talos for Audit Logging section). The original `extraVolumes` entry mounted a directory (`hostPath: /etc/kubernetes/audit`) at a file path (`mountPath: /etc/kubernetes/audit-policy.yaml`). Kubernetes/Talos would create a directory at the mountPath, which would not be a usable audit policy file. **Fix:** Changed `hostPath` to the file path `/etc/kubernetes/audit/audit-policy.yaml` so hostPath and mountPath are both file paths.

2. **Talos machine logging cannot push directly to Loki HTTP API** (Talos System Logging section). The original example used `tcp://loki.logging.svc:3100/loki/api/v1/push` as a Talos logging destination. Talos `machine.logging.destinations` only supports raw TCP/UDP transport of newline-delimited JSON — it does not perform HTTP requests, and Loki's push endpoint requires HTTP POST with a specific JSON body schema. **Fix:** Replaced the Loki push URL with a generic TCP collector endpoint (`tcp://log-collector.logging.svc:6514`) and added a short comment explaining that an intermediate collector (Vector, Fluent Bit, Promtail syslog input, etc.) is required to forward into Loki/Elasticsearch.

## Review Notes
- The Fluent Bit Elasticsearch output uses `Type _doc`. This still works for Elasticsearch 7.x but is removed in Elasticsearch 8+. For ES 8+ deployments, the `Type` parameter is ignored and the `Suppress_Type_Name On` option may be required. Left as-is since it remains valid for ES 7.x; users on ES 8+ should consult Fluent Bit documentation.
- The post shows both `extraArgs.audit-policy-file` and the Talos `auditPolicy` field. Talos's `auditPolicy` field is intended to provide the policy content; depending on Talos version, the operator may still need to pass `audit-policy-file` via extraArgs and mount the rendered file. The example errs on the side of being explicit, which is safe.
- The audit policy `rules` ordering is correct (Kubernetes evaluates rules top-down and uses the first match).
- Compliance retention guidance (SOC 2, HIPAA, PCI DSS) is presented at a high level and is consistent with common industry practice; specific regulatory interpretations should be confirmed with the organization's compliance team.
