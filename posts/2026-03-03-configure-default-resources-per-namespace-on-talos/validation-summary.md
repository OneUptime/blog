# Validation Summary: How to Configure Default Resources per Namespace on Talos

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Talos Linux
- Kubernetes (LimitRange, QoS classes, ResourceQuota, init containers)
- kubectl (run, apply, patch, rollout, get with jsonpath)
- jq (JSON parsing in shell scripts)
- Prometheus / kube-state-metrics (`kube_limitrange`, `kube_pod_info`)
- Prometheus Operator (PrometheusRule CRD)

## Sources Consulted
- Kubernetes LimitRange concept: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes LimitRange v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/policy-resources/limit-range-v1/
- Pod QoS Classes: https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Configure Default CPU Requests and Limits: https://kubernetes.io/docs/tasks/administer-cluster/manage-resources/cpu-default-namespace/
- Configure Default Memory Requests and Limits: https://kubernetes.io/docs/tasks/administer-cluster/manage-resources/memory-default-namespace/
- kube-state-metrics LimitRange metrics: https://github.com/kubernetes/kube-state-metrics/tree/main/docs

## Issues Found

1. **Invalid LimitRange type `InitContainer`** — The "Init Container Defaults" section showed a YAML using `- type: InitContainer`, which is not a valid LimitRange type. The Kubernetes API only supports `Container`, `Pod`, and `PersistentVolumeClaim` for `spec.limits[].type`. The `Container` type already applies its defaults to both regular containers and init containers, so a separate selector is impossible. **Fixed** by removing the invalid `InitContainer` block, clarifying that `Container` defaults cover both regular and init containers, and slightly expanding the scheduling note to mention how the pod's effective request is computed (max of init container sums vs. regular container sums).

2. **Incorrect description of LimitRange conflict resolution** — Scenarios 2 and 3 in the "Relationship Between Defaults and Explicit Values" section claimed that LimitRange silently reconciles conflicts (raising a low default limit to match a specified request, or capping a high default request to match a specified limit). This is wrong: per the official LimitRange docs, "A LimitRange does not check the consistency of the default values it applies." When the defaults produce `request > limit`, the pod is rejected by the API server with a validation error. **Fixed** both scenarios to accurately describe the rejection behavior.

## Review Notes

- Typo: "unenforable" in the "Why Default Resources Matter" section should be "unenforceable". Left in place since the review brief restricts changes to technical errors only.
- All `kubectl` commands and flags (`run --overrides`, `patch --type='json'`, `rollout restart deployment --all`, `get -o jsonpath`) are syntactically correct and currently supported.
- The PrometheusRule expression uses `kube_limitrange` and `kube_pod_info`, both of which are valid kube-state-metrics metrics.
- BestEffort QoS claim is accurate per the official Pod QoS documentation.
- Resource quota interaction claim (compute quotas require every container to specify requests/limits) is accurate.
- The post is largely Kubernetes-generic; the Talos Linux specifics are primarily in the ephemeral-storage section, where the warning about the OS partition sharing the container runtime filesystem is a reasonable practical concern.
