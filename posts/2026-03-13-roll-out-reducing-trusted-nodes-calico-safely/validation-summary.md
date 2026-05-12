# Validation Summary: How to Roll Out Calico Policies for Reducing Trusted Nodes Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (v3.26+) — projectcalico.org/v3 API
- Kubernetes (kube-apiserver, node labels)
- GlobalNetworkPolicy resource
- calicoctl CLI
- etcd (ports 2379/2380)
- netcat (`nc`) for connectivity testing
- Mermaid (diagram)

## Sources Consulted
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico selector syntax reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy#selectors
- Calico host endpoints / node label sync: https://docs.tigera.io/calico/latest/network-policy/hosts/protect-hosts
- etcd ports documentation (2379 client, 2380 peer): https://etcd.io/docs/v3.5/op-guide/configuration/
- Kubernetes well-known labels (`kubernetes.io/hostname`): https://kubernetes.io/docs/reference/labels-annotations-taints/
- `nc` (netcat) man page for `-z` and `-v` flags

## Issues Found
No technical issues found.

- The `apiVersion: projectcalico.org/v3` and `kind: GlobalNetworkPolicy` are correct for Calico v3.x.
- Selector functions `has(kubernetes.io/hostname)` and equality `kubernetes.io/hostname == 'trusted-node-01'` use valid Calico selector syntax.
- `spec.order`, `spec.selector`, `spec.ingress[].action`, `source.selector`, `source.nets`, `destination.ports`, and `spec.types` are all valid fields per the Calico resource schema.
- Port numbers are correct: etcd client (2379), etcd peer (2380), SSH (22), Kubernetes API server (6443).
- `calicoctl apply -f <file>` is the correct CLI usage.
- `nc -zv <host> <port>` correctly performs a zero-I/O verbose scan.

## Review Notes
- The selector `has(kubernetes.io/hostname)` will match endpoints carrying that label. For host endpoints, Calico can sync node labels via the `kubelet`-managed node label sync (see Calico host endpoint docs). Readers applying this policy to host endpoints should ensure node label sync / appropriate HostEndpoint resources exist; otherwise the policy will not apply as intended.
- The final `Deny` rule has no source restriction, which is the intended catch-all; this is a standard "allow-list then deny" pattern.
- The post says "Calico v3.26+" which is a real release line (v3.26 GA'd in 2023); the syntax used remains valid in current Calico releases.
- Some prose phrasing is awkward (e.g., "This guide covers roll out Trusted Node Reduction"), but per the task instructions, stylistic-only issues were not edited.
