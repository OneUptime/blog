# Validation Summary: How to Build RBAC Roles That Allow Deployment Scaling Without Edit Permissions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes RBAC
- Kubernetes Deployments, StatefulSets, ReplicaSets, and scale subresources
- kubectl scale, patch, and autoscale
- HorizontalPodAutoscaler
- Kubernetes admission webhooks
- Kubernetes audit policies and API server metrics
- Prometheus alert rules
- Bash, jq, awk, and Python subprocess usage

## Sources Consulted
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes Deployment API reference, including scale subresource operations: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- kubectl scale reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands/#scale
- kubectl patch reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands/#patch
- kubectl autoscale reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_autoscale/
- Kubernetes dynamic admission control documentation: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes audit documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes audit policy API reference: https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes resource metrics pipeline documentation: https://kubernetes.io/docs/tasks/debug-application-cluster/resource-usage-monitoring/

## Issues Found
- The `kubectl patch` example claimed to patch the Deployment scale subresource but omitted `--subresource='scale'`, so it would patch the main Deployment resource instead. Updated the command to use `--subresource='scale'` with a merge patch against `spec.replicas`.
- The `workload-scaler-role.yaml` example grouped main workload resources and their `/scale` subresources under the same verbs, accidentally granting `update` and `patch` on Deployments, StatefulSets, and ReplicaSets themselves. Split the rules so main resources only get `get`, `list`, and `watch`, while `/scale` subresources get `get`, `update`, and `patch`.
- The `cost-aware-scaler-role.yaml` example had the same main-resource write permission issue for Deployments. Split Deployments and `deployments/scale` into separate RBAC rules.
- The HPA creation command used `--cpu-percent`, which is no longer shown in the current official `kubectl autoscale` reference. Replaced it with `--cpu=80%`.
- The Prometheus alert used `apiserver_audit_event_total` with labels such as `subresource`, `verb`, and `user`; the official metrics reference documents `apiserver_audit_event_total` as a counter without those labels. Updated the alert to use `apiserver_request_total` filtered by `group`, `resource`, `subresource`, and `verb`.
- The quota pre-check script multiplied Kubernetes CPU quantities directly with `bc`, which fails for values like `500m` and ignored additional containers. Updated it to convert CPU requests and quota values to millicores and sum all containers.

## Review Notes
The validating webhook manifest is intentionally minimal and would still need a reachable HTTPS service with valid serving certificates in a real cluster. `kubectl` was not installed in the local workspace, so command validation was performed against the current official Kubernetes documentation rather than local CLI help.
