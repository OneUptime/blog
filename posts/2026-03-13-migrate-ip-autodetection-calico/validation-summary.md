# Validation Summary: How to Migrate to IP Autodetection in Calico Safely

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Kubernetes
- Calico IPAM
- Calico IP autodetection
- calicoctl
- kubectl

## Sources Consulted
- Calico documentation: Configure IP autodetection: https://docs.tigera.io/calico/latest/networking/ipam/ip-autodetection
- Calico documentation: IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: calicoctl ipam show: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico documentation: calicoctl ipam check: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Kubernetes documentation: kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes documentation: JSONPath support: https://v1-35.docs.kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The configuration example used an `IPPool` resource. That resource controls pod IP allocation pools, block size, encapsulation modes, and outgoing NAT; it does not configure Calico node IP autodetection. I replaced it with the operator `Installation` resource using `spec.calicoNetwork.nodeAddressAutodetectionV4.kubernetes: NodeInternalIP`, which is a documented Calico autodetection configuration.
- The verification command used `kubectl get pods -A -o wide | awk '{print $8}' | sort -u`, which prints the pod node column in standard `kubectl get pods -o wide` output, not the detected node IP. I replaced it with a `kubectl get nodes` JSONPath command that prints each node name and its Kubernetes `InternalIP`, matching the autodetection method shown in the corrected configuration.
- The architecture diagram showed IPPool block allocation to pods, which describes Calico IPAM allocation rather than node IP autodetection. I updated it to show Kubernetes node address selection feeding Calico's internode routing address.

## Review Notes
The `calicoctl get ippools -o yaml`, `calicoctl ipam show --show-blocks`, and `calicoctl ipam check` commands are valid, but IPAM pool and block checks validate pod IP allocation state rather than proving that every Calico node selected the desired routing address. Future revisions could add a direct Calico Node resource check, such as reviewing `spec.bgp.ipv4Address`, but no further changes were required for technical correctness.
