# Validation Summary: How to Deploy DaemonSets in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes (DaemonSet workload type, apps/v1 API)
- Portainer (Kubernetes UI for application deployment)
- kubectl (CLI commands: get, rollout status, set image)
- Fluentd (fluent/fluentd-kubernetes-daemonset image)
- Kubernetes scheduling features (nodeSelector, tolerations, hostPath volumes)

## Sources Consulted
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes Taints and Tolerations: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes API reference (apps/v1 DaemonSet): https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/daemon-set-v1/
- Kubernetes hostPath volume documentation: https://kubernetes.io/docs/concepts/storage/volumes/#hostpath
- Fluentd Kubernetes DaemonSet repository: https://github.com/fluent/fluentd-kubernetes-daemonset
- Portainer Kubernetes documentation: https://docs.portainer.io/user/kubernetes/applications
- kubectl reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
1. **Incorrect comment on `hostNetwork: false`**: The original YAML had a comment "Required to access host log files" preceding `hostNetwork: false`. This is technically wrong — `hostNetwork` controls whether the pod uses the host's network namespace and has nothing to do with file system access. Host log files are accessed via `hostPath` volumes, which the manifest already does. Since `hostNetwork: false` is the default and the explanatory comment is incorrect, both lines were removed for clarity.

2. **Misleading toleration comment**: The original comment read "Tolerate all node taints so the agent runs everywhere", but the toleration only matched the `node-role.kubernetes.io/control-plane` taint with `NoSchedule` effect. A truly catch-all toleration would require `operator: Exists` with no `key` or `effect`. Updated the comment to "Also schedule on control-plane nodes" to accurately describe what the toleration does.

3. **Missing `operator: Exists` on toleration**: The idiomatic way to tolerate the control-plane taint is to use `operator: Exists` (since the taint has no value). Without an explicit operator, the default `Equal` is used, which requires a value match — this technically works for an empty-value taint but is non-standard and confusing. Added `operator: Exists` to align with the documented pattern from the Kubernetes Taints and Tolerations docs.

## Review Notes
- The DaemonSet `apiVersion: apps/v1` is correct (stable since Kubernetes 1.9).
- The fluentd image `fluent/fluentd-kubernetes-daemonset:v1-debian-elasticsearch` is a valid published image.
- The kubectl commands (`get daemonsets`, `rollout status daemonset/`, `set image daemonset/`) are all correct and current.
- The Portainer UI flow ("Applications > Add application", selecting DaemonSet as Deployment type) matches the current Portainer Business/Community Edition Kubernetes interface.
- The `nodeSelector` snippet is syntactically and semantically correct.
- The `resources` block has no `cpu` limit set (only memory) — this is valid and intentional in many DaemonSet patterns to avoid CPU throttling on agents, so left as-is.
