# Validation Summary: How to Handle Data Plane Version Skew

## Status
validated

## Post Type
Guide

## Technologies Covered
- Istio
- Envoy sidecar proxies
- Kubernetes
- Prometheus and PromQL
- istioctl

## Sources Consulted
- Istio Supported Releases: https://istio.io/latest/docs/releases/supported-releases/
- Istio Canary Upgrades: https://istio.io/latest/docs/setup/upgrade/canary/
- Istio In-place Upgrades: https://istio.io/latest/docs/setup/upgrade/in-place/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio IstioOperator options: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio PodsIstioProxyImageMismatchInNamespace analyzer: https://istio.io/latest/docs/reference/config/analysis/ist0158/

## Issues Found
- The post described Istio control plane/data plane skew as N-1 to N+1. Istio's documented policy is asymmetric: the control plane can be one minor version ahead of the data plane, but the data plane cannot be ahead of the control plane. I corrected the policy text and the follow-up guidance.
- The examples used older 1.19-1.21 era versions. I updated the examples to currently relevant 1.29/1.30 versions so the version-specific guidance is not stale.
- The canary upgrade example used `istioctl install --set revision=1-21 --set tag=1.21.0` and later uninstalled `--revision default`. I changed the example to install a version-style revision with `--set revision=1-30-0` and uninstall the old `1-29-2` revision, matching the revision-based canary flow in Istio's documentation.
- The monitoring query grouped `istio_requests_total` by `source_version` and `destination_version` while describing proxy versions. Those labels are workload version labels, not proxy binary versions. I changed the query to use canonical workload revisions and clarified that proxy version correlation should come from `istioctl proxy-status` or `istio_build{component="proxy"}`.
- The post implied experimental in-place proxy upgrades could avoid pod restarts. Istio's in-place upgrade documentation still requires sidecar workloads to be recreated after the control plane upgrade. I replaced that section with guidance for inspecting the running proxy version.
- The Prometheus alert used a redundant `label_replace()` on the same `tag` label. I simplified it to count distinct proxy `tag` values from `istio_build{component="proxy"}`.
- The `istioctl version --short` example was not present in the current official command reference. I changed it to `istioctl version`.

## Review Notes
The commands and snippets are now technically consistent with Istio's current canary upgrade and sidecar restart guidance. The Prometheus alert assumes `istio_build` proxy metrics are scraped from sidecars; environments that do not scrape sidecar admin metrics may need to implement the same check through inventory or `istioctl proxy-status` automation.
