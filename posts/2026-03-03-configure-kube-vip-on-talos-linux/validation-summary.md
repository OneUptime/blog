# Validation Summary: How to Configure kube-vip on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- kube-vip (control plane VIP and LoadBalancer service support)
- kube-vip cloud provider
- Talos Linux (machine configuration, `cluster.inlineManifests`, `cluster.extraManifests`, built-in VIP)
- Kubernetes (DaemonSet, ConfigMap, LoadBalancer services, leases, RBAC)
- Prometheus Operator (ServiceMonitor, PrometheusRule)
- kube-state-metrics (lease metrics for alerting)
- MetalLB (comparison context)
- talosctl, kubectl, arping (CLI tools)

## Sources Consulted
- kube-vip flags / env var reference: https://kube-vip.io/docs/installation/flags/
- kube-vip GitHub releases: https://github.com/kube-vip/kube-vip/releases
- kube-vip RBAC manifest: https://kube-vip.io/manifests/rbac.yaml
- kube-vip cloud provider docs: https://kube-vip.io/docs/usage/cloud-provider/
- kube-vip cloud provider manifest repo: https://github.com/kube-vip/kube-vip-cloud-provider
- Talos VIP docs: https://docs.siderolabs.com/talos/v1.9/networking/vip/
- Talos config patching docs: https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/system-configuration/patching
- kube-vip source `pkg/manager/manager.go` (Prometheus metrics enumeration)

## Issues Found
1. **Section incorrectly labelled "Static Pod"** — the section header "Deploying kube-vip as a Static Pod" and its intro claimed Talos static pods are defined via `inlineManifests`, but the manifest is a DaemonSet. On Talos, `cluster.inlineManifests` deploys cluster resources, while true static pods belong under `machine.pods`. Renamed the section to "Deploying kube-vip as a DaemonSet" and clarified the distinction in the intro.
2. **Invalid env var `vip_cidr`** — kube-vip does not expose `vip_cidr`. The correct env var is `vip_subnet` (a tuple for IPv4/IPv6 prefix lengths, e.g. `32` or `32,128`). Replaced `vip_cidr` with `vip_subnet`.
3. **Outdated image tag `v0.7.2`** — that tag exists but is significantly behind. Updated the image to the current stable release `ghcr.io/kube-vip/kube-vip:v1.1.2` (released 2025-03-30).
4. **Non-existent Prometheus metric `kube_vip_leader_is_leader`** — kube-vip does not export this metric. The exporter exposes only counters/gauges like `kube_vip_manager_all_services_events` and `kube_vip_manager_bgp_session_info`. Rewrote the `KubeVipLeaderChanged` alert to use `kube_lease_owner{lease="plndr-cp-lock", namespace="kube-system"}` (provided by kube-state-metrics) — the lease is the actual source of truth for VIP leadership on the configured lease name.

## Review Notes
- `prometheus_server: :2112` is valid YAML (parsed as a string) but quoting it (`":2112"`) would match the style of the surrounding quoted env values. Not technically wrong, so left as-is.
- The `vip_subnet` value `"32"` is accepted for IPv4-only deployments; for dual-stack the documented form is a tuple like `"32,128"`. The post is IPv4-only, so the single value is fine.
- The `talosctl patch machineconfig --patch-file <file>` form used in the post is accepted by current talosctl versions; the canonical form in Sidero docs is `talosctl patch mc --patch @file.yaml`. Both work, so left as-is.
- The `KubeVipLeaderChanged` alert now relies on kube-state-metrics being installed in the cluster (which is conventional for any cluster running the kube-prometheus-stack). Operators without kube-state-metrics would need to substitute their own lease-monitoring source.
- The post comparison between kube-vip and MetalLB ("Uses leader election per service") is accurate for kube-vip ARP mode; in BGP mode kube-vip behaves differently. Not called out in the post but worth noting if future revisions add BGP coverage.
