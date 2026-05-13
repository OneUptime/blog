# Validation Summary: How to Fix Calico Blocking kube-dns

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Kubernetes CoreDNS/kube-dns
- Calico GlobalNetworkPolicy
- calicoctl
- kubectl

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Calico GlobalNetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get

## Issues Found
- The description and root cause text mentioned only UDP 53 even though the solution correctly allows both UDP and TCP DNS traffic. Updated both references to UDP/TCP 53 for consistency.
- The diagnosis command used `calicoctl get globalnetworkpolicy | grep ...`, which only checks the default tabular listing and can miss deny actions in policy rules. Updated it to inspect YAML output.
- The Calico GlobalNetworkPolicy used `order: 5` with the comment "Highest priority". Calico evaluates lower order values first, so `5` is not inherently the highest priority. Updated the comment and prevention guidance to say the allow policy must use an order lower than the deny policy.
- The GlobalNetworkPolicy selector matched `k8s-app == 'kube-dns'` across all namespaces. Calico GlobalNetworkPolicy is cluster-scoped, so the policy should be restricted to `kube-system` to target CoreDNS. Added `namespaceSelector: projectcalico.org/name == 'kube-system'`.
- The apply command only applied the Kubernetes NetworkPolicy manifest even though the article also provides a GlobalNetworkPolicy fix. Added the corresponding `kubectl apply` command for the GlobalNetworkPolicy manifest.

## Review Notes
- The Kubernetes NetworkPolicy syntax is valid and `namespaceSelector: {}` correctly allows sources from all namespaces.
- The `kubectl run` verification command uses current flags and valid command separator syntax. The listed namespaces must exist before running the loop.
- The `k8s-app: kube-dns` label is common for CoreDNS in Kubernetes clusters, but operators should confirm the actual labels on their CoreDNS pods before applying the snippets.
