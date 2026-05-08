# Validation Summary: How to Configure Default Rate Limits in Cilium configuration

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- eBPF
- Hubble
- Prometheus and Grafana

## Sources Consulted
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium API rate limiting documentation: https://docs.cilium.io/en/v1.11/configuration/api-rate-limiting/
- Cilium identity-relevant labels documentation: https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels/
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/
- Cilium Kubernetes requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements/
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium v1.19.3 Helm chart values and templates: https://github.com/cilium/cilium/tree/v1.19.3/install/kubernetes/cilium

## Issues Found
- The main Helm values example did not configure Cilium API rate limits despite the post being about rate limits. Added the documented `apiRateLimit` Helm value with a valid `endpoint-create` rate limit example.
- The label exclusion example used an invalid nested `labels.exclude` structure. Changed it to the documented space-separated `labels` string with exclusion patterns.
- The advanced BPF connection tracking timeout keys `bpf.ctTcpTimeout` and `bpf.ctAnyTimeout` are not valid Cilium Helm values. Replaced them with the current Cilium ConfigMap keys under `extraConfig`.
- `identityGCInterval` was shown as a top-level Helm value, but in the chart it is under `operator.identityGCInterval`. Corrected the YAML structure.
- `cilium health status`, `cilium endpoint list`, `cilium policy get`, `cilium endpoint get`, and `cilium metrics list` were not valid uses of the Kubernetes-oriented Cilium CLI. Replaced these with `kubectl exec` commands that run the in-agent `cilium-health` or `cilium-dbg` binaries.
- `cilium bpf tunnel list` was not present in the current Cilium command reference. Replaced the troubleshooting advice with `cilium-health status`.
- The prerequisites and troubleshooting notes included version-specific claims that are no longer accurate for current Cilium releases. Updated them to refer to the Kubernetes and kernel versions supported by the installed Cilium release.
- The init container troubleshooting example referenced `cilium-init`, which is not the current init container name in the v1.19 chart. Changed it to a placeholder for the actual init container name.

## Review Notes
The post is technically relevant and contains implementation details. The Helm commands assume the `cilium` chart repository is configured; the prerequisites now state that explicitly.
