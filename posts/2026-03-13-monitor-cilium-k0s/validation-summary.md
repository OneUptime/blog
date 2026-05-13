# Validation Summary: Monitor Cilium on k0s Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- k0s Kubernetes
- Cilium
- Hubble
- Kubernetes CNI
- eBPF kube-proxy replacement
- Prometheus metrics

## Sources Consulted
- k0s Networking documentation: https://docs.k0sproject.io/stable/networking/
- k0s Configuration Options documentation: https://docs.k0sproject.io/stable/configuration/
- k0s Cluster extensions documentation: https://docs.k0sproject.io/stable/extensions/
- Cilium k0s installation guide: https://docs.cilium.io/en/stable/installation/k0s/
- Cilium Kubernetes without kube-proxy guide: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/

## Issues Found
- The post described k0s as having "no separate etcd" and an "embedded control plane." k0s has controller/worker roles and can use Konnectivity for isolated controller-worker communication, so the wording was corrected.
- The prerequisites pinned `k0s v1.27+` and `cilium CLI v0.15+`, which is too broad/outdated for a current Cilium installation. This was changed to require a k0s cluster running a Kubernetes version supported by the selected Cilium release and a current Cilium CLI.
- The k0s configuration enabled Cilium kube-proxy replacement but did not disable k0s kube-proxy. Added `spec.network.kubeProxy.disabled: true`.
- The Cilium Helm values used `kubeProxyReplacement: strict`, which is outdated in current Cilium releases. Updated it to `kubeProxyReplacement: true`.
- The Cilium Helm chart version was `1.15.0`, which is outdated for a 2026 validation. Updated the example to `1.19.3`, matching current stable Cilium documentation at review time.
- The metrics section assumed Cilium metrics were available but the Helm values did not enable them. Added `prometheus.enabled: true` and `operator.prometheus.enabled: true`, and enabled Hubble metrics.
- The `k0sctl kubeconfig` command omitted the config file argument used by the rest of the example. Updated it to `k0sctl kubeconfig --config k0s-config.yaml`.
- The connectivity test used `--namespace cilium-test`, but `--namespace` is the Cilium installation namespace inherited from the parent command. Updated it to `--test-namespace cilium-test`.
- The Cilium endpoint inspection command selected a pod with shell substitution and omitted the container. Updated it to execute against `ds/cilium` with `-c cilium-agent`.
- The metrics list included `cilium_policy_count`, which is not the current metric name. Updated it to `cilium_policy` and added `hubble_drop_total` for Hubble-observed dropped flows.

## Review Notes
The guide is technically relevant and salvageable. The examples were reviewed against official documentation, but they were not executed against a live k0s cluster in this workspace because no cluster, `cilium` CLI, or Helm binary was available locally.
