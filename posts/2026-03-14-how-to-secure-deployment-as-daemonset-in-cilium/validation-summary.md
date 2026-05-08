# Validation Summary: Securing DaemonSet Deployment in Cilium

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy
- CiliumClusterwideNetworkPolicy
- Cilium host firewall / host policies
- Hubble
- Helm
- kubectl

## Sources Consulted
- Cilium Network Policy documentation: https://docs.cilium.io/en/stable/network/kubernetes/policy/
- Cilium Policy Enforcement Modes documentation: https://docs.cilium.io/en/stable/security/policy/intro/
- Cilium Host Policies documentation: https://docs.cilium.io/en/stable/security/policy/host/
- Cilium Host Firewall documentation: https://docs.cilium.io/en/stable/security/host-firewall/
- Cilium Layer 3 policy examples: https://docs.cilium.io/en/stable/security/policy/language/
- Cilium DNS policy examples: https://docs.cilium.io/en/stable/security/dns/
- Cilium CLI command reference for status, config, and connectivity tests: https://docs.cilium.io/en/latest/cmdref/
- Cilium debug CLI command reference for endpoint, identity, and monitor commands: https://docs.cilium.io/en/stable/cmdref/
- Hubble CLI documentation: https://docs.cilium.io/en/stable/observability/hubble/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The first policy was described as a `CiliumNetworkPolicy`, but the YAML uses `CiliumClusterwideNetworkPolicy`. Changed the surrounding text to match the resource kind.
- The `nodeSelector` policy targets host policies, which require Cilium host firewall support. Added the host firewall prerequisite.
- The verification command used `kubectl get cnp -n production` for a cluster-scoped `CiliumClusterwideNetworkPolicy`. Changed it to `kubectl get ccnp daemonset-agent-policy`.
- The default-deny ingress example used `ingress: []`. Cilium's documented default-deny pattern uses an empty rule item, so this was changed to `ingress: - {}`.
- Several commands used agent-local `cilium` subcommands (`policy`, `identity`, `endpoint`, and `monitor`) that are provided by `cilium-dbg` in current Cilium agent pods, not by the Kubernetes-facing `cilium` CLI. Updated those examples to run `cilium-dbg` through `kubectl exec`.
- The monitor command used `--output json`, but `cilium-dbg monitor` uses `--json` / `-j` for JSON output. Updated the command.
- The cross-namespace Hubble JSON pipeline emitted multi-line JSON objects before sorting. Added `jq -c` so `sort` and `uniq -c` operate on complete flow records.

## Review Notes
- The Cilium debug policy command is deprecated in current documentation, so the post now uses Kubernetes CRD listing commands for policy inventory.
- The host policy example assumes worker nodes actually carry the `node-role.kubernetes.io/worker` label; many clusters do not label worker nodes this way by default.
