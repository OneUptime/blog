# Validation Summary: Troubleshoot Legacy Firewalls with Calico IPAM

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Calico IPAM
- Calico IPPool resources
- Calico GlobalNetworkSet resources
- Calico network policy
- Kubernetes pods and kubectl
- Legacy firewall allow-listing
- Outbound NAT/SNAT

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico GlobalNetworkSet resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkset
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico outgoing NAT documentation: https://docs.tigera.io/calico-cloud/networking/configuring/workloads-outside-cluster
- Calico calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Kubernetes kubectl JSONPath documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The IPPool example implied that any firewall-approved CIDR could be used. Updated the comment to state that the CIDR should be within the cluster pod CIDR, matching Calico guidance that workload IP pools should normally be subsets of the Kubernetes pod CIDR.
- The NAT verification tcpdump command filtered for the pod CIDR as the source, which would check for non-NATted traffic. Updated it to filter for the node IP as the source when checking traffic on the node's external interface.
- The firewall automation section described Calico GlobalNetworkSets as a way to group pod IPs for external firewall management. Updated the section to export pod IPs from Kubernetes for firewall API automation, and clarified that GlobalNetworkSets are for matching external CIDRs in Calico policy.
- The conclusion described GlobalNetworkSets as firewall rule management. Updated it to describe them as Calico policy management for firewall-approved external CIDRs.

## Review Notes
The examples are version-neutral and use current Calico v3 resource APIs. The `calicoctl` command could not be tested locally because it is not installed in this environment, so command syntax was checked against official Calico documentation instead.
