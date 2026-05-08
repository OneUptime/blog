# Validation Summary: How to Validate Calico Policies for Reducing Trusted Nodes Before Production

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico GlobalNetworkPolicy
- Calico host endpoints
- Kubernetes node labels
- calicoctl
- kubectl
- netcat

## Sources Consulted
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico host endpoint policy for Kubernetes nodes: https://docs.tigera.io/calico/latest/network-policy/hosts/kubernetes-nodes
- Calico host endpoint selector-based policies: https://docs.tigera.io/calico/latest/reference/host-endpoints/selector
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico guidance for scheduling Typha to well-known nodes: https://docs.tigera.io/calico/latest/network-policy/comms/reduce-nodes
- Kubernetes label syntax and selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/

## Issues Found
- The post described "Trusted Node Reduction" as if it were a direct Calico GlobalNetworkPolicy feature. Calico's official "reduce nodes" documentation is about scheduling Typha to well-known nodes, while the example in the post is host endpoint policy. I changed the wording to describe trusted node access reduction through host endpoint policy.
- The policy targeted `has(kubernetes.io/hostname)` and selected the trusted source by hostname label. Calico's Kubernetes node protection guidance recommends enabling automatic host endpoints and applying explicit labels that sync from nodes to host endpoints. I changed the policy to select `has(kubernetes-host)` and trusted sources with `trusted-node == 'true'`, and added the corresponding labeling commands.
- The port-based Calico policy rules did not specify a protocol. I added `protocol: TCP` to the allow and deny rules that match TCP ports such as SSH, etcd, and the Kubernetes API server.
- The implementation applied the policy without first enabling automatic host endpoints. I added the documented `calicoctl patch kubecontrollersconfiguration default` command so the policy can apply to node host interfaces.

## Review Notes
The resulting example is a focused host endpoint policy pattern. It does not replace Calico's Typha node-affinity guidance when the operational goal is specifically reducing the number of nodes that expose Typha's TCP 5473 listen port.
