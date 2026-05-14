# Validation Summary: How to Avoid Common Mistakes with IP Autodetection in Calico

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Kubernetes
- Calico IP autodetection
- calicoctl
- kubectl

## Sources Consulted
- Calico documentation: Configure IP autodetection, https://docs.tigera.io/calico/latest/networking/ipam/ip-autodetection
- Calico documentation: Configuring calico/node, https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Calico documentation: IPPool resource reference, https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: calicoctl get reference, https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: calicoctl ipam show reference, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico documentation: calicoctl ipam check reference, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Kubernetes documentation: kubectl get reference, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get

## Issues Found
- The configuration example used an `IPPool`, which configures the pool of IP addresses assigned to workloads and tunnels. It does not configure Calico node IP autodetection. I replaced it with the documented Tigera operator `Installation` resource using `spec.calicoNetwork.nodeAddressAutodetectionV4.kubernetes: NodeInternalIP`.
- The inspection commands focused on IP pools and IPAM blocks, which are not the primary state for node IP autodetection. I changed them to inspect Calico `Node` resources, Kubernetes node addresses, and the operator `Installation` resource.
- The verification command `kubectl get pods -A -o wide | awk '{print $8}' | sort -u` selects the `NODE` column in typical wide pod output, not the pod IP column. I replaced it with node and Installation checks that validate the autodetection configuration.
- `calicoctl ipam check` checks IPAM data structure integrity against Kubernetes, not whether Calico selected the intended node IP address. I replaced it with checks that display the applied Installation resource and Calico node address state.
- The architecture diagram showed IP pool block allocation and pod IP assignment, which are IPAM concepts rather than node IP autodetection. I changed it to show Kubernetes node input, autodetection method, and Calico node address selection.

## Review Notes
The corrected `Installation` resource applies to Calico operator installations. Manifest-based installations use the documented `IP_AUTODETECTION_METHOD` or `IP6_AUTODETECTION_METHOD` environment variables on the `calico-node` DaemonSet instead.
