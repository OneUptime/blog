# Validation Summary: How to Monitor Calico Policies for Reducing Trusted Nodes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (projectcalico.org/v3 API)
- Kubernetes (network policy, node labels)
- calicoctl CLI
- GlobalNetworkPolicy resource
- netcat (nc) for connectivity testing
- etcd, kube-apiserver, SSH (referenced via standard ports)

## Sources Consulted
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico selector syntax reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy#selector-syntax
- Calico HostEndpoint documentation: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- calicoctl command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Kubernetes well-known labels (`kubernetes.io/hostname`): https://kubernetes.io/docs/reference/labels-annotations-taints/
- etcd port reference (client 2379, peer 2380): https://etcd.io/docs/latest/op-guide/configuration/
- Kubernetes API server default port 6443: https://kubernetes.io/docs/reference/networking/ports-and-protocols/

## Issues Found
No technical issues found.

- `apiVersion: projectcalico.org/v3` and `kind: GlobalNetworkPolicy` are the correct API/kind.
- Selector syntax `has(kubernetes.io/hostname)` and `kubernetes.io/hostname == 'trusted-node-01'` is valid Calico selector syntax (labels with dots/slashes do not require additional quoting around the label name).
- Action values `Allow` and `Deny` use the correct PascalCase per the Calico schema.
- `types: [Ingress]`, `ingress[].source.selector`, `ingress[].source.nets`, and `ingress[].destination.ports` are all valid fields.
- Port numbers are correct: 2379/2380 for etcd client/peer, 22 for SSH, 6443 for the Kubernetes API server.
- `calicoctl apply -f` is a valid command and the `nc -zv host port` form correctly tests TCP connectivity (`$?` reports 0 on success, non-zero on failure).

## Review Notes
- For a `GlobalNetworkPolicy` like this to actually apply to node-to-node (host) traffic, the cluster must have `HostEndpoint` resources configured for the nodes — the prerequisites only mention Calico v3.26+ and the CLIs, not host endpoint setup. This is an operational caveat rather than a code error, but readers without host endpoints will see the policy match pod endpoints only.
- The single `Deny` rule at the end will only apply on ingress to endpoints selected by the policy; traffic between non-selected endpoints (or egress) is unaffected. Worth keeping in mind when adapting the example.
- A minor grammatical awkwardness in the Introduction ("covers monitor Trusted Node Reduction") was left in place per the instruction not to make stylistic changes.
