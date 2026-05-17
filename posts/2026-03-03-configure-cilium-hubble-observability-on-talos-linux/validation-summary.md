# Validation Summary: How to Configure Cilium Hubble Observability on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Cilium (CNI)
- Hubble (CLI, Relay, UI, metrics)
- Helm
- kubectl
- Kubernetes Ingress (NGINX annotations)
- Prometheus / ServiceMonitor (kube-prometheus-stack)
- CiliumNetworkPolicy (L7 / HTTP visibility)
- PromQL

## Sources Consulted
- Cilium Hubble setup docs — https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium Hubble metrics docs — https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Helm chart `hubble-metrics` service template — https://github.com/cilium/cilium/blob/main/install/kubernetes/cilium/templates/hubble/metrics-service.yaml
- cilium/hubble repository (for stable.txt branch) — https://github.com/cilium/hubble
- Homebrew `hubble` formula — https://formulae.brew.sh/formula/hubble
- Talos Linux Cilium deployment guidance (KubePrism port 7445, required capabilities)

## Issues Found
1. **ServiceMonitor label selector was wrong.** The post selected `k8s-app: cilium`, which matches the cilium-agent service rather than the dedicated `hubble-metrics` service. The Cilium Helm chart labels the `hubble-metrics` service with `k8s-app: hubble`. Changed `matchLabels` to `k8s-app: hubble` so Prometheus actually scrapes the Hubble metrics endpoint on port 9965.
2. **Stale GitHub branch in Hubble CLI install snippet.** The `stable.txt` URL referenced `cilium/hubble/master/stable.txt`; the cilium/hubble repository's default branch is now `main`. Updated the URL to `https://raw.githubusercontent.com/cilium/hubble/main/stable.txt` to use the canonical, forward-compatible path.

## Review Notes
- The `hubble-relay` service port-forward (`4245:80`) is correct — the chart's default relay service port is `80`, mapped to the relay's gRPC target.
- `brew install hubble` is the correct Homebrew formula for the Hubble CLI on macOS.
- The `hubble.metrics.enabled="{dns,drop,tcp,flow,icmp,http}"` syntax is valid. Note that current Cilium documentation recommends `httpV2` over the legacy `http` metric and often includes `port-distribution`; the bracketed-list format itself is correct, so no change was made.
- `kubectl exec ds/cilium -- cilium status` still works today, but Cilium 1.14+ renamed the in-agent CLI to `cilium-dbg`. If `cilium` is eventually removed as a backwards-compatible alias, this command would need to become `cilium-dbg status`. Left as-is since it continues to work.
- The DNS-by-query-name example uses `hubble observe ... -o json | grep`. Hubble does support `--dns-query` for native filtering, but the grep approach is valid and matches the author's intent of a quick search.
- `k8sServicePort=7445` is correct for Talos Linux (KubePrism local API endpoint), and the security context capability list matches Talos's documented Cilium requirements.
