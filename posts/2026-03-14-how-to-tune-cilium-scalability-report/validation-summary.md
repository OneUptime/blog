# Validation Summary: How to Tune Cilium Scalability report

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- eBPF
- Prometheus metrics

## Sources Consulted
- Cilium Helm Reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium Limiting Identity-Relevant Labels: https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels/
- Cilium Identity Management Mode: https://docs.cilium.io/en/stable/network/kubernetes/identity-management-mode/
- Cilium CLI command reference for `cilium status`, `cilium config view`, `cilium connectivity test`, and `cilium sysdump`: https://docs.cilium.io/en/latest/cmdref/
- Cilium in-agent command reference for `cilium-dbg identity list`, `cilium-dbg endpoint list`, `cilium-dbg policy get`, and `cilium-dbg metrics list`: https://docs.cilium.io/en/stable/cmdref/
- Cilium troubleshooting guide for `cilium-health status --verbose` and tunnel diagnostics: https://docs.cilium.io/en/stable/operations/troubleshooting/

## Issues Found
- The post used `cilium identity list`, `cilium metrics list`, `cilium endpoint list`, `cilium endpoint get`, `cilium policy get`, and `cilium bpf tunnel list` as if they were Kubernetes-facing Cilium CLI commands. These are in-agent diagnostics exposed through `cilium-dbg`, so the examples now run them from a selected Cilium agent pod.
- The post used `cilium health status`, but the documented health command is `cilium-health status`. The verification example now runs `cilium-health status --verbose` from a Cilium agent pod.
- The Helm identity label example used a nested `labels.exclude` structure, which does not match the documented Cilium Helm value. It now uses the documented space-separated label pattern string format with `labels: "!job-name"`.
- The identity garbage collection setting was shown as a top-level `identityGCInterval`, but the Helm reference documents it as `operator.identityGCInterval`. It is now placed under `operator` with the documented duration style.
- The operator pod selector used `name=cilium-operator`, which is not the current Helm chart's documented selector pattern. It now uses `io.cilium/app=operator`.
- The troubleshooting section referred specifically to a `cilium-init` init container, which is not a stable current init container name. It now tells the reader to identify the actual init container name and inspect that container's logs.

## Review Notes
The guide is technically relevant and valid after fixes. The resource values remain example sizing and should be adjusted through load testing for a specific cluster. Current Cilium documentation also notes that labels such as `pod-template-hash` and `controller-revision-hash` are already excluded by default, so the retained example focuses on excluding `job-name`.
