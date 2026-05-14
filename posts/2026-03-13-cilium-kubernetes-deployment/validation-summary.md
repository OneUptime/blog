# Validation Summary: Deployment in Cilium Kubernetes Networking

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- Hubble
- Prometheus Operator
- eBPF/BPF datapath
- Cilium IPAM

## Sources Consulted
- Cilium System Requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium Helm Reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium Monitoring & Metrics: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Kubernetes Without kube-proxy: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium CLI `status` reference: https://docs.cilium.io/en/stable/cmdref/cilium_status/
- Cilium Kubernetes host-scope IPAM: https://docs.cilium.io/en/stable/network/concepts/ipam/kubernetes/
- Cilium `cilium-dbg bpf` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf/

## Issues Found
- The post used Cilium `1.15.6` in Helm examples. Updated examples to current stable `1.19.4` to avoid recommending an outdated chart version.
- The prerequisites listed Linux kernel `4.19.57+`. Updated this to Cilium's current documented baseline of Linux kernel `5.10+`, or an equivalent distribution kernel.
- The production observability Helm example configured Hubble Relay, UI, and metrics but did not explicitly enable Hubble. Added `hubble.enabled=true`, which Cilium documents as required for Hubble metrics.
- The Hubble metrics list used the deprecated `http` metric. Updated it to `httpV2`, the current replacement documented by Cilium.
- The production observability example created PrometheusRule content later in the post but did not enable ServiceMonitor resources. Added ServiceMonitor Helm values for Cilium agent, operator, and Hubble metrics so Prometheus Operator-based scraping is configured consistently.
- The `cilium status --output json | jq ...` snippet used fields that are not part of the documented Cilium CLI status command contract. Replaced it with the documented `cilium status --wait` health check.
- The post used `cilium bpf perf list` inside the Cilium pod. Current Cilium installs provide `cilium-dbg` as the in-agent debug CLI, and the documented BPF commands do not include `bpf perf list`. Replaced it with `cilium-dbg bpf metrics list` and adjusted the comment to validate BPF datapath map access.

## Review Notes
Cilium Helm values and CLI behavior are version-specific. Future updates should re-check the pinned chart version, kernel baseline, Hubble metrics syntax, and Prometheus scraping configuration against the Cilium stable documentation before republishing.
