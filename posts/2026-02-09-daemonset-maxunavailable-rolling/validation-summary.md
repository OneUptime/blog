# Validation Summary: How to configure DaemonSet maxUnavailable for controlled rolling updates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes DaemonSet
- Kubernetes rolling updates
- Kubernetes `apps/v1` API
- `kubectl` rollout commands
- YAML manifests

## Sources Consulted
- Kubernetes DaemonSet API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/daemon-set-v1/
- Kubernetes rolling update task for DaemonSets: https://kubernetes.io/docs/tasks/manage-daemon/update-daemon-set/
- Kubernetes DaemonSet concept documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes `kubectl rollout status` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- Kubernetes `kubectl rollout` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- Kubernetes assigning Pods to Nodes documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/

## Issues Found
- The post incorrectly stated that DaemonSets only support `maxUnavailable`. Current `apps/v1` DaemonSets also support `rollingUpdate.maxSurge`, with a default of 0. Updated the text to explain that `maxUnavailable` remains the main setting for the common no-surge update pattern.
- The post described percentage-based `maxUnavailable` as a percentage of total cluster nodes. Kubernetes defines it as a percentage of the total number of DaemonSet pods at the start of the update, which corresponds to eligible/scheduled nodes rather than necessarily every node in the cluster. Updated the explanation and examples accordingly.
- The node selector section said node labels can control which nodes get updated first. `nodeSelector` limits which nodes are eligible for DaemonSet pods; it does not define rollout ordering. Updated the wording to say it controls which nodes participate in the rollout.

## Review Notes
The YAML examples use valid `apps/v1` DaemonSet fields and current rolling update settings. The `kubectl rollout status daemonset/logging-agent -n kube-system`, `kubectl get pods`, and `kubectl describe daemonset` commands match the documented command forms. `kubectl` is not installed in this local environment, so command verification was performed against official Kubernetes command reference documentation rather than local `kubectl --help` output.
