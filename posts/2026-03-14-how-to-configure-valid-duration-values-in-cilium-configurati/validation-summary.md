# Validation Summary: How to Configure Valid duration values in Cilium configuration

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- Prometheus and Grafana
- Hubble
- eBPF

## Sources Consulted
- Cilium Helm Reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium identity-relevant labels documentation: https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels/
- Cilium CLI command reference for connectivity tests: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium CLI command reference for sysdump: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium health client command reference: https://docs.cilium.io/en/stable/cmdref/cilium-health_status.html

## Issues Found
- The `labels` Helm value was shown as a nested `exclude` list, but Cilium expects label patterns as a space-separated string. I changed it to `labels: "!pod-template-hash !controller-revision-hash"` to match Cilium's documented exclusion pattern format.
- The advanced Helm example used unsupported `bpf.ctTcpTimeout` and `bpf.ctAnyTimeout` values. I replaced them with documented duration-based connection tracking garbage collection settings: `conntrackGCInterval` and `conntrackGCMaxInterval`.
- The identity garbage collection value was listed as top-level `identityGCInterval`, but the current Helm chart defines it under `operator.identityGCInterval`. I moved it under `operator`.
- The verification command `cilium health status` does not match the documented command layout. I changed it to run the documented `cilium-health status` command through the Cilium DaemonSet.
- Verification and troubleshooting examples referenced `cilium policy get`, `cilium endpoint list`, and `cilium endpoint get`, which are not part of the current Kubernetes-facing `cilium` CLI command reference. I replaced those checks with Kubernetes CRD-based commands for Cilium policies and endpoints.

## Review Notes
The post is technically relevant and contains real Cilium configuration and operational commands. The examples are now aligned with the current Cilium Helm chart and CLI documentation. Some recommendations, such as enabling Hubble UI and changing BPF masquerading, remain environment-dependent and should be tested in staging before production use.
