# Validation Summary: How to Configure Rancher Resource Limits

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher (management.cattle.io/v3 Project API)
- Kubernetes ResourceQuota
- Kubernetes LimitRange
- Kubernetes Deployments / resource requests and limits
- Kubernetes QoS classes (Guaranteed, Burstable, BestEffort)
- kubectl (top, describe, get)
- jq

## Sources Consulted
- Rancher source: `pkg/apis/management.cattle.io/v3/resource_quota_types.go` — https://github.com/rancher/rancher/blob/master/pkg/apis/management.cattle.io/v3/resource_quota_types.go
- Kubernetes LimitRange concept docs — https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes LimitRange v1 API reference — https://kubernetes.io/docs/reference/kubernetes-api/policy-resources/limit-range-v1/
- Kubernetes storage limit task docs — https://kubernetes.io/docs/tasks/administer-cluster/limit-storage-consumption/
- kubectl top pod reference — https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#top-pod
- Kubernetes Pod QoS docs — https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/

## Issues Found
No technical issues found.

- Rancher Project `resourceQuota.limit` and `namespaceDefaultResourceQuota.limit` field names (`limitsCpu`, `limitsMemory`, `requestsStorage`) match Rancher's `ResourceQuotaLimit` struct (camelCase JSON tags).
- LimitRange usage is correct: `Container` type uses `default`/`defaultRequest`/`max`/`min`; `Pod` and `PersistentVolumeClaim` types correctly use only `max` (no `default`/`defaultRequest`, which are container-only).
- Resource requests/limits semantics are accurate (CPU throttling above limit, OOM kill on memory limit; requests used for scheduling).
- QoS class descriptions are correct: Guaranteed requires requests == limits for both CPU and memory across all containers; Burstable when requests/limits exist but Guaranteed criteria aren't met.
- `kubectl top pods --sort-by=memory` is valid syntax (the flag accepts `cpu` or `memory`).
- `kubectl describe resourcequota` and the `jq` pipeline are valid.

## Review Notes
- The Burstable QoS comment (`requests < limits`) is a simplification — strictly, Burstable applies whenever any container has a request or limit set but the pod doesn't meet Guaranteed criteria (e.g., only memory set, or only one container has requests). The example given is valid Burstable, so it is not misleading in context.
- The Guaranteed QoS note correctly states "requests == limits for all containers" but does not explicitly mention that *both* CPU and memory must be set and equal across *every* container — readers may want to consult the official QoS docs for edge cases.
- The "2-3x request value" rule of thumb in the conclusion is workload-dependent guidance rather than a hard rule; acceptable as a starting heuristic.
