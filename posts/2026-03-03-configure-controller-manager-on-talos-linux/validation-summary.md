# Validation Summary: How to Configure Controller Manager on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration, `talosctl`)
- Kubernetes kube-controller-manager (v1.30)
- Kubernetes control plane (leader election, HPA, garbage collection, node lifecycle)
- `kubectl`

## Sources Consulted
- Kubernetes kube-controller-manager reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/
- Kubernetes v1.27 removals announcement: https://kubernetes.io/blog/2023/03/17/upcoming-changes-in-kubernetes-v1-27/
- PR #113710 (deprecate `--pod-eviction-timeout`): https://github.com/kubernetes/kubernetes/pull/113710
- PR #124948 (remove `--horizontal-pod-autoscaler-upscale-delay` / `--downscale-delay`): https://github.com/kubernetes/kubernetes/pull/124948
- Horizontal Pod Autoscaling docs: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Pod Lifecycle / `terminated-pod-gc-threshold`: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Talos v1.7 config reference: https://docs.siderolabs.com/talos/v1.7/reference/configuration/v1alpha1/config/
- Kubernetes Leases: https://kubernetes.io/docs/concepts/architecture/leases/
- kube-controller-manager metrics endpoint (port 10257): https://www.sysdig.com/blog/how-to-monitor-kube-controller-manager

## Issues Found

1. **Removed flag `--pod-eviction-timeout`.** The post documented `pod-eviction-timeout: "5m0s"` (and an aggressive `"30s"` variant) under `cluster.controllerManager.extraArgs`. This flag was deprecated in Kubernetes 1.26 and **removed in 1.27**, alongside the legacy `--enable-taint-manager`. Since the post pins the image to `v1.30.0`, passing this flag would prevent kube-controller-manager from starting. Removed both occurrences and added a paragraph explaining that pod eviction is now driven by taint-based eviction, configured via `--default-not-ready-toleration-seconds` / `--default-unreachable-toleration-seconds` on the kube-apiserver.

2. **Removed flag `--horizontal-pod-autoscaler-upscale-delay`.** The HPA section listed `horizontal-pod-autoscaler-upscale-delay: "3m0s"`. This flag has been non-functional since v1.12 and was formally removed (per PR #124948). The current upscale behavior is governed by the HPA `behavior` field on the HPA resource itself, not a global controller-manager flag. Removed the line. Also relabeled `downscale-stabilization` from "cooldown after scaling down" to the more accurate "stabilization window after scaling down".

3. **Incorrect Talos config path for disabling the controller manager.** The post showed `cluster.controllerManager.disabled: true`. That field does not exist under `cluster.controllerManager` — Talos exposes the disable toggle per-node under `machine.controlPlane.controllerManager.disabled`. Corrected the YAML and the surrounding sentence.

4. **Wrong endpoint for kube-controller-manager metrics.** The post used `kubectl get --raw /metrics | grep controller_manager`. That endpoint serves **kube-apiserver** metrics, not kube-controller-manager metrics. KCM exposes metrics on port 10257 (HTTPS, authenticated) bound to 127.0.0.1 by default. Replaced the snippet with an in-cluster `curl` against `https://<control-plane-ip>:10257/metrics` using the pod service-account bearer token.

## Review Notes
- The remaining controller-manager flags (concurrency, leader election, CIDR/networking, garbage collection, service-account, node monitoring, HPA sync period / tolerance / downscale-stabilization) are all valid and current for Kubernetes 1.30.
- The Talos config schema for `cluster.controllerManager` (`image`, `extraArgs`, `extraVolumes`) is accurate.
- The lease name (`kube-controller-manager` in `kube-system`) and `talosctl service` / `talosctl logs` commands are accurate.
- Cited defaults the post does not state explicitly but that readers may want to know: `--concurrent-service-syncs` default is 1, `--terminated-pod-gc-threshold` default is 12,500, `--concurrent-gc-syncs` default is 20. These were not stated as defaults in the post, so no fix required — just useful context for future tuning guides.
- The `image: registry.k8s.io/kube-controller-manager:v1.30.0` pin will go stale quickly; a future revision could either drop the pinned tag or refresh it to the cluster's current minor version.
