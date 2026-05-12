# Validation Summary: How to Prevent Pods from Being Unable to Ping Each Other with Calico

## Status
validated

## Post Type
Guide / Best practices

## Technologies Covered
- Calico (`projectcalico.org/v3` GlobalNetworkPolicy, IPPool)
- Kubernetes NetworkPolicy (`networking.k8s.io/v1`)
- `calicoctl` CLI
- `kubectl` CLI (run, exec, wait, jsonpath, overrides)
- IPIP and VXLAN encapsulation modes
- CoreDNS via the `kubernetes.io/metadata.name` namespace label

## Sources Consulted
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy (verified `Allow`, `Deny`, `Log`, `Pass` are the accepted `action` values and their semantics)
- Calico IPPool reference: https://docs.tigera.io/calico/latest/reference/resources/ippool (verified `cidr`, `ipipMode`, `vxlanMode` fields)
- Calico Staged Network Policy documentation: https://docs.tigera.io/calico/latest/network-policy/staged-network-policies (cross-referenced as the formal "audit mode" feature)
- Kubernetes NetworkPolicy v1 spec (verified `podSelector: {}`, `policyTypes`, `from`/`to` with `podSelector`/`namespaceSelector`, `ports` with `protocol`/`port`)
- Kubernetes `NamespaceDefaultLabelName` feature (GA in 1.22) confirming the automatic `kubernetes.io/metadata.name` label
- `kubectl run` reference for `--overrides`, `--dry-run=client`, and `-o yaml` behavior

## Issues Found
No technical issues found.

## Review Notes
- The post calls the Log+Pass GlobalNetworkPolicy approach "Calico's policy audit mode." This is an informal use of the term — Calico has a formal feature for this called Staged Network Policies (`StagedGlobalNetworkPolicy` / `StagedNetworkPolicy`), now available in open-source Calico (v3.32+). The Log+Pass approach is still valid: `Log` logs the packet and continues to the next rule, and `Pass` skips remaining policies and jumps to the endpoint's profile rules. In a typical Kubernetes cluster, Calico auto-creates per-namespace profiles that allow traffic, so the policy effectively logs without enforcing. Worth being aware that if an endpoint has no profiles assigned, `Pass` defaults to `Deny` — so the "log but don't enforce" comment is a simplification that holds in standard Kubernetes/Calico setups.
- The `kubectl run ... --overrides='{"spec":{"nodeName":"<node-a>"}}' --dry-run=client -o yaml | kubectl apply -f -` pattern is valid; `--overrides` deep-merges the supplied JSON into the generated pod spec, so `spec.nodeName` is honored.
- `kubectl wait pod/node-a-pod pod/node-b-pod --for=condition=Ready --timeout=60s` is correct syntax; `kubectl wait` accepts multiple resources of the same type in one invocation.
- The `kubernetes.io/metadata.name` namespace label used to select `kube-system` for the DNS egress rule is correct; it is automatically applied by the apiserver to all namespaces since Kubernetes 1.22.
- The recommendation about "Calico's GlobalNetworkPolicy order field" is accurate — `order` is a real numeric field where lower values have higher precedence within a tier.
- The DNS egress rule allows UDP/53 only. TCP/53 is also used for DNS responses larger than 512 bytes (and is increasingly common); some workloads may also need TCP/53 allowed. Not strictly an error — the post's matrix in Prevention 4 covers UDP/53 specifically — just a caveat for readers copying the snippet into production.
- The Diagnosis Steps `kubectl run pre-test ... --restart=Never -- sleep 300` is fine, though `--restart=Never` is the legacy flag for creating a pod (vs. a deployment); current `kubectl run` defaults already create a pod, but `--restart=Never` remains supported and explicit.
