# Validation Summary: How to Fix Calico Policy Blocking DNS

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico NetworkPolicy and GlobalNetworkPolicy
- Kubernetes NetworkPolicy
- Kubernetes namespaces and namespace selectors
- CoreDNS / kube-dns service discovery
- kubectl commands

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Well-Known Labels, Annotations and Taints documentation: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico default deny policy guidance: https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-default-deny
- Calico automatic labels documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels

## Issues Found
- The post description mentioned only UDP port 53, but the post correctly recommends both UDP and TCP port 53. Updated the description to say "UDP and TCP port 53".
- The Calico GlobalNetworkPolicy example allowed UDP/TCP port 53 to any destination. Updated the destination rules to select the documented `k8s-app == "kube-dns"` DNS pods so the example matches the stated CoreDNS/kube-dns access fix.

## Review Notes
The Kubernetes NetworkPolicy example is syntactically valid and uses the stable `networking.k8s.io/v1` API. The `kubernetes.io/metadata.name` namespace label is documented as an immutable namespace label and is appropriate for matching `kube-system`. The `kubectl patch --type=json -p='[...]'` command matches the current kubectl JSON patch syntax. The Calico GlobalNetworkPolicy fields, rule actions, protocols, selectors, and port list syntax are current in Calico Open Source 3.32 documentation.
