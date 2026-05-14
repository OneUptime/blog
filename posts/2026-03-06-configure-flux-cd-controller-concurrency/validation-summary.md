# Validation Summary: How to Configure Flux CD Controller Concurrency

## Status
validated

## Post Type
Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Kustomize overlays and JSON 6902 patches
- Prometheus and PromQL
- controller-runtime metrics

## Sources Consulted
- Flux source-controller controller options: https://fluxcd.io/flux/components/source/options/
- Flux kustomize-controller controller options: https://fluxcd.io/flux/components/kustomize/options/
- Flux helm-controller controller options: https://fluxcd.io/flux/components/helm/options/
- Flux notification-controller controller options: https://fluxcd.io/flux/components/notification/options/
- Flux image automation controller options: https://fluxcd.io/flux/components/image/options/
- Flux bootstrap customization guide: https://fluxcd.io/flux/installation/configuration/bootstrap-customization/
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Kubebuilder controller-runtime metrics reference: https://book.kubebuilder.io/reference/metrics-reference

## Issues Found
- The post stated that source-controller defaults to `--concurrent=4`. Current Flux documentation lists source-controller `--concurrent` with a default of `2`, so the default table and explanation were corrected.
- The Deployment snippets replaced the full container `args` list. For Flux bootstrap customization, the official guide shows JSON patching individual args; replacing the full list can drop existing controller arguments. The snippets were changed to JSON 6902 patches that append concurrency flags and replace only resources.
- The post used `--kube-api-qps` and `--kube-api-burst` as Flux controller flags. Current Flux controller option pages do not list those flags, so those examples and the proportional QPS table were replaced with PromQL queries for monitoring Kubernetes API usage and throttling.
- The kustomize-controller example increased reconciliation concurrency but did not account for server-side apply parallelism. The `--concurrent-ssa` flag was added to align apply concurrency tuning with current kustomize-controller options.
- The active worker PromQL query used `workqueue_unfinished_work_seconds`, which measures unfinished in-progress work duration and is not an active worker count. It was replaced with `controller_runtime_active_workers`, and `controller_runtime_max_concurrent_reconciles` was added for comparison.
- The queue latency PromQL example did not aggregate histogram buckets before `histogram_quantile`. It was updated to use `sum by (le, name)`.

## Review Notes
The sizing values remain workload-dependent guidance rather than Flux defaults. They should be treated as starting points and validated with controller metrics, Kubernetes API request metrics, and staging tests before production rollout.
