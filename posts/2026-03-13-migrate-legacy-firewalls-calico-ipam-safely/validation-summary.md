# Validation Summary: Migrate Legacy Firewalls with Calico IPAM Safely

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source v3.x
- Calico IPAM
- Calico IPPool resources
- Calico IPReservation resources
- Calico GlobalNetworkPolicy resources
- Kubernetes Deployments
- kubectl
- calicoctl
- iptables

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico create multiple IP pools guide: https://docs.tigera.io/calico/latest/networking/ipam/ippools
- Calico use a specific IP address with a pod guide: https://docs.tigera.io/calico/latest/networking/ipam/use-specific-ip
- Calico IPReservation resource reference: https://docs.tigera.io/calico/latest/reference/resources/ipreservation
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico default deny policy guide: https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-default-deny
- Calico log rules guide: https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The post described the IPPool as "node-scoped" and said firewall rules could target stable node-based CIDRs. Calico IPPool `nodeSelector` restricts which nodes can use a pool; it does not guarantee a fixed per-node pod CIDR. Updated the heading and wording to "node-group-scoped" and "node-group CIDRs."
- The prerequisites said only "Calico v3.x" even though the guide relies on Calico IPAM-specific features and IPReservation. Updated the prerequisite to require Calico IPAM and IPReservation support.
- The fixed-IP example used `cni.projectcalico.org/ipAddrs` but did not reserve the address from automatic IPAM allocation. Added an `IPReservation` manifest for `10.64.1.100` before the Deployment.
- The validation command said to test from a pod in the allowed CIDR, but a newly created BusyBox pod would normally source from the cluster pod CIDR, not the example legacy subnet `10.1.2.0/24`. Updated the comment to run the test from an environment with the expected source IP, or schedule it where egress preserves that source address.
- The firewall removal step implied the allow policy alone was enough to replace firewall behavior. Added a note to confirm both the Calico allow policy and any default-deny policy are working before removing the corresponding firewall rule.
- The conclusion still used the old "node-scoped" wording. Updated it to match the corrected node-group-scoped IPPool guidance.

## Review Notes
- The `GlobalNetworkPolicy` selector intentionally matches pods across namespaces. In production, readers may want to narrow this with a namespace selector or use a namespaced Calico `NetworkPolicy`.
- The fixed-IP Deployment uses one replica. Additional replicas would need distinct manually assigned IPs or a different firewall migration strategy.
- The IPPool example uses `ipipMode: CrossSubnet`; readers using VXLAN or no encapsulation should match their existing Calico encapsulation mode.
