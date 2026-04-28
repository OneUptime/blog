# Validation Summary: How to Implement Network Segmentation in Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher (Projects, Project Network Isolation)
- Kubernetes NetworkPolicy (`networking.k8s.io/v1`)
- Cilium / CiliumNetworkPolicy (`cilium.io/v2`) for Layer 7 policies
- Prometheus (Rancher monitoring stack in `cattle-monitoring-system`)
- kubectl (exec, networking validation)
- PostgreSQL (port 5432)
- DNS (port 53 UDP/TCP)

## Sources Consulted
- Kubernetes NetworkPolicy reference: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes well-known labels (`kubernetes.io/metadata.name`, NamespaceDefaultLabelName GA in 1.22): https://kubernetes.io/docs/reference/labels-annotations-taints/
- Rancher Project Network Isolation documentation: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/manage-projects/manage-project-network-isolation
- Cilium CiliumNetworkPolicy reference (`cilium.io/v2`): https://docs.cilium.io/en/stable/network/kubernetes/policy/
- Cilium L7 HTTP policy examples: https://docs.cilium.io/en/stable/security/policy/language/#layer-7-examples
- Rancher Monitoring documentation (`cattle-monitoring-system` namespace): https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/monitoring-v2-configuration

## Issues Found
No technical issues found.

## Review Notes
- The "Frontend to Backend" NetworkPolicy uses `namespaceSelector` and `podSelector` as siblings within the same `from` peer, which correctly AND's them (only pods labeled `app: web` in the `frontend` namespace are allowed). This indentation is subtle but correct — readers should be careful not to put them as separate list items, which would OR them.
- The `kubernetes.io/metadata.name` label is automatically applied to namespaces since Kubernetes 1.22 (GA). Older clusters (pre-1.21) would require manual labeling — worth noting if targeting legacy installations.
- The Prometheus scrape example uses port 9090. While 9090 is the Prometheus server's own port, scrape targets typically expose metrics on application-specific ports (e.g., 8080, 9100). The policy is self-consistent only if the backend pods expose metrics on 9090; readers should adjust the port to match their actual metrics endpoint.
- Rancher's "Project Network Isolation" feature relies on Canal/Calico or another CNI that supports NetworkPolicies — if the cluster uses a CNI without policy enforcement, the toggle will have no effect. The post correctly notes the CNI requirement.
- The Cilium L7 example uses `cilium.io/v2`, which is the stable API version. `cilium.io/v2alpha1` exists for newer features (e.g., CiliumClusterwideNetworkPolicy variants) but is not needed here.
