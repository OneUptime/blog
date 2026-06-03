# Validation Summary: How to Troubleshoot NetworkPolicy Allowing Unintended Traffic

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Kubernetes NetworkPolicy
- kubectl
- jq
- netcat/nc
- Calico network policy logging
- Cilium and Hubble policy verdict monitoring

## Sources Consulted
- Kubernetes Network Policies concept documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes Namespaces documentation for the standard namespace name label: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Calico log rules documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Cilium policy verdict and policy creation documentation: https://docs.cilium.io/en/latest/security/policy-creation/
- Cilium command reference for cilium-dbg monitor and endpoint commands: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_monitor.html

## Issues Found
- Clarified that NetworkPolicy enforcement requires a network plugin that implements NetworkPolicy.
- Corrected the default isolation explanation to be direction-specific for ingress and egress, and noted that reply traffic for allowed connections is implicitly allowed.
- Reworded the policyTypes section because the example was not missing policyTypes; the real issue was missing egress isolation.
- Replaced the non-standard `name: kube-system` namespace selector with the standard `kubernetes.io/metadata.name: kube-system` label.
- Added TCP port 53 alongside UDP port 53 in DNS egress examples.
- Replaced invalid netcat protocol flags `-tcp` and `-udp` with valid TCP default and UDP `-u` usage.
- Fixed policy selector audit snippets so they only inspect NetworkPolicies in the pod's namespace and account for empty selectors and matchExpressions.
- Reworded the conflicting policies section to avoid implying deny-rule precedence in native Kubernetes NetworkPolicy.
- Replaced deprecated or inaccurate Cilium monitoring commands with current `cilium-dbg`/Hubble-based examples.
- Replaced the unsupported Calico namespace annotation example with Calico Log-rule based guidance.
- Fixed the test matrix to use `nc` host/port checks instead of HTTP curl checks against non-HTTP services such as databases and caches.

## Review Notes
Some diagnostic commands still depend on the deployed CNI, image contents, and cluster naming conventions. UDP connectivity checks with netcat can be less definitive than application-level UDP tests because UDP is connectionless.
