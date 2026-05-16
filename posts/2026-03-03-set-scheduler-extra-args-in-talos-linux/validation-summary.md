# Validation Summary: How to Set Scheduler Extra Args in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration, `cluster.scheduler` section)
- Kubernetes kube-scheduler (extra args, feature gates, secure-port, bind-address)
- KubeSchedulerConfiguration API (`kubescheduler.config.k8s.io/v1`)
- Kubernetes scheduling profiles and plugins (`NodeResourcesBalancedAllocation`, `NodeResourcesFit`, `ImageLocality`)
- `talosctl` CLI
- `kubectl` CLI

## Sources Consulted
- Talos Linux v1alpha1 config reference: https://www.talos.dev/latest/reference/configuration/v1alpha1/config/
- kube-scheduler CLI reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-scheduler/
- Kubernetes scheduler configuration docs: https://kubernetes.io/docs/reference/scheduling/config/
- Kubernetes feature gates reference: https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/
- KEP-4247 (SchedulerQueueingHints Beta in 1.32): https://kubernetes.io/blog/2024/12/12/scheduler-queueinghint/
- siderolabs/talos issue #3765 (scheduler bind-address default)

## Issues Found

1. **Invalid plugin name `NodeResourcesLeastAllocated`** — Used in two places (custom scheduler config and scheduling profiles example). This is not a valid plugin name in the `kubescheduler.config.k8s.io/v1` API; it was replaced by `NodeResourcesFit` with a `scoringStrategy.type: LeastAllocated` configuration. Setting the old name would cause kube-scheduler to fail at startup.
   - Fix: Removed the `disabled: NodeResourcesLeastAllocated` block in the custom config example (the plugin doesn't exist to disable). For the high-throughput scheduling profile, rewrote it to use `NodeResourcesFit` with `scoringStrategy.type: LeastAllocated` under `pluginConfig`, which is the correct v1 API approach.

2. **Incorrect default bind-address claim** — The post stated "By default, the scheduler binds to localhost." Both upstream Kubernetes and Talos Linux default `--bind-address` to `0.0.0.0` (Talos does not override this default per siderolabs/talos#3765).
   - Fix: Reworded to explain the metrics endpoint and bind-address purpose without making the incorrect localhost claim.

## Review Notes

- The feature gates `MinDomainsInPodTopologySpread` (GA in 1.30) and `PodSchedulingReadiness` (GA in 1.30) are graduated to stable. In current Kubernetes versions they're locked to enabled-by-default, and setting them will produce a warning but not an error. They will eventually be removed entirely from the feature gates list. The post does include a generic note about "incompatible feature gates for your Kubernetes version" which covers this caveat.
- `SchedulerQueueingHints` is in Beta and re-enabled by default in v1.32 (was disabled by default in 1.28–1.31 due to a memory leak). Listing it as a useful feature gate is reasonable for 2026.
- `kubectl get componentstatuses` is deprecated since v1.19 but still functional in 1.31/1.32 (with a deprecation warning). Using `/livez` and `/readyz` endpoints is the recommended modern alternative, but the example will still work.
- All Talos schema references (`cluster.scheduler.extraArgs`, `extraVolumes` with `hostPath`/`mountPath`/`readOnly`, `machine.files` with `content`/`permissions`/`path`/`op: create`) are valid.
- The `secure-port: "10259"`, `percentage-of-nodes-to-score`, `kube-api-qps`, and `kube-api-burst` flags are all correct.
- `apiVersion: kubescheduler.config.k8s.io/v1` is the correct stable API version (v1beta3 was removed in v1.29).
