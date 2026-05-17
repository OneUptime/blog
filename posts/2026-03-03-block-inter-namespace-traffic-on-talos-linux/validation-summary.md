# Validation Summary: How to Block Inter-Namespace Traffic on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine config, `talosctl patch machineconfig`)
- Kubernetes NetworkPolicy (`networking.k8s.io/v1`)
- Cilium CNI 1.15 (Helm install, `cilium monitor`, Hubble)
- Flannel (mentioned as default Talos CNI)
- CoreDNS (default Kubernetes DNS)
- Prometheus (cross-namespace scraping)
- ingress-nginx (cross-namespace ingress)
- Kyverno (`ClusterPolicy` with `generate` rule)
- `kubernetes.io/metadata.name` automatic namespace label (KEP-2161)

## Sources Consulted
- Talos / Sidero docs — Deploy Cilium CNI: https://docs.siderolabs.com/kubernetes-guides/cni/deploying-cilium
- Cilium 1.15 — Kubernetes Without kube-proxy: https://docs.cilium.io/en/v1.15/network/kubernetes/kubeproxy-free/
- Cilium — Policy Enforcement Modes: https://docs.cilium.io/en/stable/security/policy/intro/
- Cilium — `cilium-dbg monitor` reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor/
- cilium-cli source: https://github.com/cilium/cilium-cli
- Kyverno — Generate rules: https://kyverno.io/docs/policy-types/cluster-policy/generate/
- Kyverno — Match/Exclude syntax: https://kyverno.io/docs/policy-types/cluster-policy/match-exclude/
- Kubernetes — Namespaces concept: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- KEP-2161 (automatic `kubernetes.io/metadata.name` label): https://github.com/kubernetes/enhancements/issues/2161

## Issues Found

1. **Cilium policy-verdict command was not runnable as written.**
   The original command `cilium monitor --type policy-verdict -n production` had two problems: `cilium monitor` is not a subcommand of the standalone cilium-cli (it lives inside the agent pod), and `-n` on `cilium monitor` is the short flag for `--numeric` rather than a Kubernetes namespace filter. Replaced it with the correct in-pod invocation via `kubectl -n kube-system exec ds/cilium -- cilium monitor --type policy-verdict`, and added a Hubble alternative (`hubble observe --namespace production --type policy-verdict`) for namespace-scoped filtering.

2. **Kyverno `ClusterPolicy` used the deprecated pre-1.5 `match`/`exclude` syntax.**
   Updated `match.resources` and `exclude.resources` to the modern `match.any[].resources` / `exclude.any[].resources` form required by current Kyverno releases. Also added `generate.synchronize: true` so the generated `NetworkPolicy` stays in sync with the `ClusterPolicy`.

## Review Notes

- Cilium `kubeProxyReplacement=true` (boolean) is correct for 1.15 — the legacy string values (`strict`, `partial`, `disabled`) were deprecated in 1.14.
- `policyEnforcementMode=default` is valid; it is also the chart's default, so the flag is technically a no-op but harmless.
- The Talos CNI disable patch (`cluster.network.cni.name: none`) is the documented structure.
- The script `apply-isolation.sh` uses a substring grep to skip system namespaces; this is fine for the three default names listed but would false-positive on any user namespace whose name is a substring of one of the system names. Not technically wrong, but worth tightening with `grep -wq` in a future revision.
- The `wget` examples rely on the pod's DNS search path resolving `my-service.staging.svc` to `my-service.staging.svc.cluster.local`. This works under standard CoreDNS / kubelet defaults.
- Port `9090`/`9091` in the Prometheus-scrape NetworkPolicy assume the production pods expose their metrics endpoint on those ports; in many real deployments the scrape target port is application-specific. Not incorrect, just a deployment-specific choice.
