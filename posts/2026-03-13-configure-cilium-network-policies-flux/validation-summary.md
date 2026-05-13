# Validation Summary: How to Configure Cilium Network Policies with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- CiliumNetworkPolicy
- CiliumClusterwideNetworkPolicy
- Kubernetes
- Flux CD v2
- Kustomize
- Hubble
- eBPF network policy enforcement

## Sources Consulted
- Cilium Network Policy documentation: https://docs.cilium.io/en/stable/network/kubernetes/policy.html
- Cilium Policy Enforcement Modes: https://docs.cilium.io/en/latest/security/policy/intro/
- Cilium Layer 3 policy examples: https://docs.cilium.io/en/stable/security/policy/layer3.html
- Cilium DNS-based policy documentation: https://docs.cilium.io/en/latest/security/dns.html
- Cilium Kubernetes constructs in policy documentation: https://docs.cilium.io/en/latest/security/policy/kubernetes/
- Cilium Hubble setup and CLI validation documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium Hubble CLI inspection documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html
- Cilium command reference for `cilium-dbg endpoint list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list.html
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Kubernetes kubectl reference for `kubectl exec`: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The default-deny example used `ingress: []` and `egress: []`. Cilium's documented default-deny examples use an empty rule item (`- {}`) to select endpoints into default-deny mode without allowing traffic, so the YAML was updated to use `ingress: - {}` and `egress: - {}`.
- The Hubble observation command assumed the Hubble API was already reachable from the local CLI. Cilium's Hubble setup documentation recommends `-P` / `--port-forward` for local CLI validation, so the command was updated to `hubble observe -P ...`.
- The endpoint inspection command used `cilium endpoint list`, but current Cilium command reference documents agent-side endpoint listing as `cilium-dbg endpoint list`. The command was updated accordingly and uses the documented default Cilium namespace, `kube-system`.

## Review Notes
The Flux `Kustomization` manifest uses the current `kustomize.toolkit.fluxcd.io/v1` API and valid fields. The Cilium policy fields for L3/L4/L7 HTTP, `toFQDNs`, DNS rules, entities, and clusterwide policies align with current Cilium documentation. In clusters where Cilium is installed into a non-default namespace, adjust the final `kubectl exec -n kube-system daemonset/cilium` command to that namespace.
