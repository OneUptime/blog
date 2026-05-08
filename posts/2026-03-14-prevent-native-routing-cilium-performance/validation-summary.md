# Validation Summary: Preventing Native Routing Performance in Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- eBPF/BPF host routing
- Native routing/direct routing
- BGP
- Prometheus and PrometheusRule
- Flux HelmRelease
- iperf3 and netperf

## Sources Consulted
- Cilium Routing documentation: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium v1.14.19 Helm values source: https://raw.githubusercontent.com/cilium/cilium/v1.14.19/install/kubernetes/cilium/values.yaml
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Performance Tuning Guide: https://docs.cilium.io/en/stable/operations/performance/tuning/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/

## Issues Found
- The Helm example set both `tunnel=disabled` and `routingMode=native`. Current Cilium documentation uses `routingMode=native` for native routing, and the Helm chart separates routing mode from tunnel protocol configuration. Removed `tunnel=disabled` to avoid relying on the legacy/ambiguous setting.
- The Prometheus alert used `cilium_nodes_all_num` and `cilium_nodes_all_connected`, which are not current documented Cilium metrics. Replaced the expression with `cilium_unreachable_nodes > 0` and adjusted the alert name and summary to match what the metric detects.
- The configuration drift script checked the old `tunnel` key for `disabled`. Changed it to check `routing-mode` for `native`, matching the Cilium config key for native routing.
- The drift script had a comment before the shebang, which prevents the shebang from being used when the snippet is saved and executed directly. Moved `#!/bin/bash` to the first line of the snippet.
- The troubleshooting note said BPF host routing requires `kubeProxyReplacement=true` and kernel 5.10+. Cilium's tuning guide documents eBPF kube-proxy replacement and eBPF masquerading as the explicit requirements, with compatible kernel support. Updated the note accordingly.
- The conclusion claimed native routing with BPF host routing achieves `90%+` of bare-metal throughput. This exact percentage was not supported by the official docs, so it was replaced with a more accurate, conditional statement.

## Review Notes
The examples remain environment-specific. `autoDirectNodeRoutes=true` is appropriate only when nodes share the relevant L2 network; otherwise routes must be provided by the underlying network or by a route distribution mechanism such as BGP. The Flux HelmRelease example is syntactically aligned with the Flux v2 HelmRelease API, but a complete production manifest also needs a matching `HelmRepository` and a valid values ConfigMap.
