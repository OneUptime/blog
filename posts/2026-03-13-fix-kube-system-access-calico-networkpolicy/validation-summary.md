# Validation Summary: How to Fix kube-system Access Problems with Calico NetworkPolicy

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Kubernetes namespaces and labels
- Calico network policy enforcement
- CoreDNS / kube-dns access
- Metrics Server
- kubectl

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Namespaces documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kubernetes Well-Known Labels documentation: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Calico Kubernetes policy advanced tutorial: https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-policy/kubernetes-policy-advanced
- Calico NetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Metrics Server official repository and installation manifest: https://github.com/kubernetes-sigs/metrics-server

## Issues Found
- The metrics-server NetworkPolicy example used separate `namespaceSelector` and `podSelector` entries under `to`. Kubernetes treats separate `to` entries as OR conditions, so the original policy allowed all pods in `kube-system` on the metrics-server port and also selected `metrics-server` pods only in the policy's own namespace. Changed the example to put `namespaceSelector` and `podSelector` in the same peer entry so it selects metrics-server pods in `kube-system`.
- The metrics-server example allowed TCP port `4443`. The current official Metrics Server manifest uses `--secure-port=10250` and exposes container port `10250` named `https`. Updated the policy port to `10250`.

## Review Notes
- The DNS egress example is technically valid and follows the Calico tutorial pattern of allowing DNS egress to `kube-system`, though selecting the DNS pods specifically would be a tighter policy.
- The `kubernetes.io/metadata.name` namespace label is stable as of Kubernetes 1.22 and is set automatically by the Kubernetes control plane.
- Direct NetworkPolicy behavior for traffic addressed to Service ClusterIPs can vary by plugin and packet rewriting path. The metrics-server fix now matches the current pod serving port; clusters that restrict access through the `metrics-server` Service may also need to account for Service port `443` depending on their CNI behavior.
