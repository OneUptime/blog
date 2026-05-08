# Validation Summary: How to Use Dynamic Exporter Configuration in Cilium Hubble

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Hubble exporter
- Dynamic Hubble flow logs
- Kubernetes ConfigMaps
- Helm
- kubectl
- YAML

## Sources Consulted
- Cilium Hubble exporter configuration documentation: https://docs.cilium.io/en/stable/observability/hubble/configuration/export/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium v1.19.3 `cilium-flowlog-configmap.yaml` Helm template: https://github.com/cilium/cilium/blob/v1.19.3/install/kubernetes/cilium/templates/cilium-flowlog-configmap.yaml
- Cilium v1.19.3 Hubble exporter parser/config source: https://github.com/cilium/cilium/blob/v1.19.3/pkg/hubble/exporter/config.go
- Cilium Flow API reference: https://docs.cilium.io/en/stable/_api/v1/flow/README/
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- kubectl `create configmap` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_configmap/

## Issues Found
- The dynamic exporter ConfigMap format was incorrect. The post used one JSON object per ConfigMap key, but Cilium expects a `flowlogs.yaml` key containing a YAML document with a top-level `flowLogs` list. Updated all ConfigMap examples and runtime update commands to use `flowlogs.yaml`.
- Dynamic exporter entries were missing the required `name` field. Added `name` to each flow log configuration.
- The Helm values did not disable Helm-managed ConfigMap creation while the post showed a manually managed ConfigMap. Added `createConfigMap: false`.
- Several field masks referenced invalid or deprecated fields for current Cilium flow output, including `destination.port`, `l4.TCP`, and `drop_reason`. Replaced them with valid masks such as `l4`, `IP`, and `drop_reason_desc`.
- Example `end` timestamps had already expired by the validation date, so those exporters would not run as described. Updated them to future dates.
- Runtime update commands created obsolete per-exporter ConfigMap keys. Updated them to read, edit, and reapply the `flowlogs.yaml` key.
- The wildcard `ls` command would not be expanded without a remote shell. Updated it to run through `sh -c`.
- The troubleshooting note still referred to JSON parsing. Updated it to YAML parsing.

## Review Notes
- `kubectl` and `helm` were not installed in the local environment, so CLI behavior was checked against official command references rather than local `--help` output.
- The Cilium examples and source confirm dynamic exporter changes are applied without Cilium agent restarts, subject to ConfigMap projection delay.
