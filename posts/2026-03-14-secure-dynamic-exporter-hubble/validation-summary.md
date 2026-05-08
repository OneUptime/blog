# Validation Summary: How to Secure Dynamic Exporter Configuration in Cilium Hubble

## Status
validated

## Post Type
Security guide / technical tutorial

## Technologies Covered
- Cilium Hubble dynamic exporter
- Kubernetes ConfigMaps
- Kubernetes RBAC
- Kubernetes audit policy
- Kyverno admission policies
- Prometheus Operator PrometheusRule
- kube-state-metrics
- kubectl, yq, and Python validation commands

## Sources Consulted
- Cilium documentation, "Configuring Hubble exporter": https://docs.cilium.io/en/latest/observability/hubble/configuration/export/
- Cilium Helm values and dynamic flow log ConfigMap template: https://github.com/cilium/cilium/tree/main/install/kubernetes/cilium
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes audit policy API reference: https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/
- Kyverno ClusterPolicy validate rule documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno JMESPath filter documentation: https://kyverno.io/docs/policy-types/cluster-policy/jmespath/
- Prometheus Operator API documentation: https://prometheus-operator.dev/docs/api-reference/api/
- kube-state-metrics project documentation: https://github.com/kubernetes/kube-state-metrics

## Issues Found
- The post used `cilium-hubble-export-config` as the dynamic exporter ConfigMap name. Cilium's Helm chart defaults the dynamic exporter ConfigMap to `cilium-flowlog-config`, so the RBAC, `kubectl auth can-i`, audit, Prometheus, and verification examples were updated to use the correct name.
- The post treated each ConfigMap data key as a JSON exporter rule. Cilium stores dynamic exporter rules under the `flowlogs.yaml` key as a YAML document with a `flowLogs` list. The Kyverno policy and local validation commands were updated to parse `flowlogs.yaml` and iterate over `.flowLogs[]`.
- The Kyverno example used the deprecated `spec.validationFailureAction` field and older match syntax. The policy now uses `validate.failureAction: Enforce` and `match.any`, consistent with current Kyverno ClusterPolicy documentation.
- The Kyverno example claimed to require field masks and block L7 export but only checked for an empty JSON field. The policy now checks for a non-empty `fieldMask`, validates the approved file path prefix, and denies `l7` in the field mask.
- The Prometheus alert used `changes(kube_configmap_info[5m])`, which does not reliably indicate ConfigMap content updates. It now uses `kube_configmap_metadata_resource_version`, which changes when the ConfigMap resource version changes.
- The audit-log inspection command assumed audit events were available from kube-apiserver pod logs. It was changed to inspect the configured audit log file path, matching Kubernetes audit logging behavior.
- The troubleshooting note said the Cilium service account needs `get` and `watch` permissions on the dynamic exporter ConfigMap. The Helm chart mounts this ConfigMap into Cilium agent pods, so the note now focuses on verifying the ConfigMap, DaemonSet mount, and mounted `flowlogs.yaml` content.

## Review Notes
- The Kyverno example still uses `ClusterPolicy`, which current Kyverno documentation labels deprecated in favor of newer policy types, but the fields used in the corrected example are current for ClusterPolicy installations.
- The audit log path in the command is an example path. Managed Kubernetes services and webhook audit backends may expose audit events differently.
