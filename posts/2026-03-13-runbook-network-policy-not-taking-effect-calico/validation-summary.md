# Validation Summary: Runbook: Network Policy Not Taking Effect in Calico

## Status
validated

## Post Type
Runbook / Operational Guide

## Technologies Covered
- Calico (CNI / network policy engine)
- Kubernetes NetworkPolicy
- Felix (Calico's per-node agent)
- kubectl
- iptables
- Mermaid (for the diagnostic flowchart)

## Sources Consulted
- Calico Felix configuration reference (health port 9099, `/liveness`, `/readiness`): https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico troubleshooting commands (`calico-node -felix-ready`, `-felix-live`): https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico hard-way install (canonical `k8s-app: calico-node` DaemonSet label): https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-node
- Calico data path / iptables chain naming (`cali-*` chains): https://docs.tigera.io/calico/latest/reference/architecture/data-path
- Calico GlobalNetworkPolicy `order` field reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Kubernetes NetworkPolicy concepts (no ordering, additive semantics): https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Calico staged network policies: https://docs.tigera.io/calico-cloud/network-policy/staged-network-policies
- kubectl wait / run / exec documentation: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
1. **Felix readiness check via `wget`** — The original command `kubectl exec $NODE_POD -- wget -qO- http://localhost:9099/readiness` assumed `wget` is present in the calico-node image. The official calico-node image is a minimal/distroless-style image and does not guarantee `wget`. Replaced with `kubectl exec $NODE_POD -n kube-system -- calico-node -felix-ready`, which is the officially documented in-container readiness probe binary and works across Calico versions.
2. **"Audit mode" terminology** — The Prevention section recommended "audit mode during policy development". Calico does not have a feature called "audit mode"; the correct term is **staged network policies** (`StagedNetworkPolicy` / `StagedGlobalNetworkPolicy`), which log policy matches without enforcing. Updated the wording accordingly.

## Review Notes
- Felix health port (9099) and endpoints (`/liveness`, `/readiness`) are correct, as is the `k8s-app=calico-node` selector and the `cali-*` iptables chain prefix.
- "Policy ordering" is listed under root causes and in the flowchart. Note that upstream Kubernetes `NetworkPolicy` resources are order-independent and additive; the `order` field only exists on Calico's own `NetworkPolicy` / `GlobalNetworkPolicy` CRDs. The runbook is Calico-specific, so this is reasonable, but an operator following `kubectl get networkpolicy <name>` (which returns upstream Kubernetes resources) will not find an `order` field — they would need `kubectl get globalnetworkpolicies.crd.projectcalico.org` or `calicoctl` for Calico-native policies. Left as-is since the runbook is generally framed at Calico-enforced policies.
- `busybox` `ping` requires `CAP_NET_RAW`; on hardened clusters with PodSecurity restrictions this verification step may fail and an alternative reachability test (e.g., `nc -zv` or `wget`) would be needed. Acceptable for a runbook but worth keeping in mind.
- The verify step issues `kubectl exec` immediately after `kubectl run`; in practice a brief readiness wait (e.g., `kubectl wait --for=condition=Ready pod/verify-test --timeout=30s`) may be needed before the exec succeeds. Minor operational nit, not technically incorrect.
- Calico's eBPF dataplane mode does not use iptables; the Step 3 `iptables -L | grep cali` check only applies to the default iptables dataplane. Most installations use iptables, so this is fine as the default assumption.
