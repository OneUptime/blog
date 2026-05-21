# Validation Summary: How to Set Up Istio Resource Budgets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- IstioOperator
- Kubernetes ResourceQuota
- Kubernetes LimitRange
- Kubernetes PodDisruptionBudget
- Kubernetes PriorityClass
- kubectl
- jq
- awk

## Sources Consulted
- IstioOperator options reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio Sidecar API reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio configuration scoping documentation: https://istio.io/latest/docs/ops/configuration/mesh/configuration-scoping/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes LimitRange documentation: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes Pod disruption documentation: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes Pod priority and preemption documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/

## Issues Found
- The control plane jq command labeled comma-joined request values as totals. Changed it to convert CPU and memory quantities and report actual total CPU in millicores and memory in MiB.
- The sidecar memory calculation said `1000 * 128Mi = 128 GiB`; the binary-unit result is 125 GiB. Corrected the example.
- The LimitRange section implied sidecar-specific defaults. Kubernetes LimitRange applies namespace-level defaults and constraints for matching object types, so the wording and heading were corrected to make that scope clear.
- The `kubectl top pods -A --containers` parsing used the wrong columns for CPU and memory and matched sidecars with `grep`. Updated it to match the `istio-proxy` container column and parse CPU and memory units before summing.
- The top memory-consuming sidecars command sorted the CPU column. Updated it to filter the `istio-proxy` container column and sort by the memory column.
- The namespace-labeling command was marked as `yaml`. Changed the code fence to `bash`.

## Review Notes
The IstioOperator, ResourceQuota, LimitRange, PodDisruptionBudget, and PriorityClass resource shapes used in the post are consistent with current official documentation. The budget numbers are examples and should be load-tested for each mesh, especially where low proxy memory or CPU limits are used.
