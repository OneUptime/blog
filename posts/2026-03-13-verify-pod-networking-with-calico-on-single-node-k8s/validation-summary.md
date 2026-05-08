# Validation Summary: How to Verify Pod Networking with Calico on Single-Node Kubernetes

## Status
validated

## Post Type
Tutorial / verification guide

## Technologies Covered
- Kubernetes
- kubectl
- Calico
- calicoctl
- Calico IPAM
- Kubernetes Services and DNS
- Linux iptables

## Sources Consulted
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl expose reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#expose
- Calico calicoctl ipam show reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/show/
- Calico BGP peering and node status documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico IP pool resource documentation: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico default IP pool configuration documentation: https://docs.tigera.io/calico-cloud/networking/ipam/initial-ippool
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip

## Issues Found
- The introduction said IPIP or VXLAN encapsulation "would be needed" for cross-node traffic. Calico encapsulation is configuration-dependent and may be disabled, always enabled, or cross-subnet only. I changed the wording to say cross-node encapsulation depends on the IP pool configuration and is not exercised by a single-node test.
- The introduction included network policy enforcement in the verification scope, but the guide does not apply or test a NetworkPolicy. I narrowed the scope statement to IP allocation, connectivity, and DNS service discovery.
- Step 2 said Felix should report as running from `calicoctl node status`. The documented output reports that the Calico process is running and then shows BGP status. I changed the wording to match the command output and clarified that BIRD peers may be absent on a single-node cluster without external BGP peers.
- The conclusion claimed all relevant Calico features were confirmed working. The post does not test every relevant feature, such as network policy enforcement, so I narrowed the conclusion to the core single-node networking path actually tested by the guide.

## Review Notes
The commands are syntactically valid for current Kubernetes and Calico documentation. The `busybox` image is acceptable for quick connectivity checks, but in future revisions a purpose-built troubleshooting image with `curl`, `dig`, and TLS-capable tooling would make DNS and HTTPS egress tests more predictable across environments.
