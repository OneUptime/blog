# Validation Summary: How to Configure ResourceQuota to Cap Total CPU and Memory Per Namespace

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes ResourceQuota
- Kubernetes LimitRange
- Kubernetes namespaces and RBAC
- kubectl
- kube-state-metrics
- Prometheus / PromQL

## Sources Consulted
- Kubernetes Resource Quotas documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes ResourceQuota API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/resource-quota-v1/
- Kubernetes generated kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes Limit Ranges documentation: https://kubernetes.io/docs/concepts/policy/limit-range/
- kube-state-metrics ResourceQuota metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/policy/resourcequota-metrics.md
- Prometheus PromQL operators and vector matching documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/

## Issues Found
- The quota-exceeded example used `kubectl run --requests=cpu=5`, but the current generated `kubectl run` reference does not include a `--requests` flag. Changed the example to use `--overrides` to create an nginx pod with a CPU request.
- The kube-state-metrics PromQL examples divided `kube_resourcequota{type="used"}` by `kube_resourcequota{type="hard"}` directly. Because the `type` label differs, PromQL vector matching would not pair those series. Added `ignoring(type)` and filtered hard quotas greater than zero.
- The alert expression compared a ratio to `0.9` while the summary displayed the value as a percentage. Updated the expression to calculate a percentage and compare against `90`.
- The GPU quota section described GPUs as "custom resources." Kubernetes documents GPU-style device plugin resources as extended resources for ResourceQuota. Changed the wording to "extended resources."

## Review Notes
The ResourceQuota YAML examples use the current `apiVersion: v1` API and valid quota resource names for compute, storage, object counts, priority-class scoped quotas, extended resources, ephemeral storage, and LoadBalancer service counts. `kubectl` was not installed locally, so CLI checks were performed against the official generated Kubernetes reference instead of local `--help` output.
