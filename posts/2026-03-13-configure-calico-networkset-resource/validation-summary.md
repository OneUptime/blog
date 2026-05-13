# Validation Summary: Configure Calico NetworkSet Resource

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico NetworkSet and GlobalNetworkSet resources
- Calico NetworkPolicy and GlobalNetworkPolicy resources
- calicoctl
- YAML

## Sources Consulted
- Calico Open Source NetworkSet resource documentation: https://docs.tigera.io/calico/latest/reference/resources/networkset
- Calico Open Source GlobalNetworkSet resource documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkset
- Calico Open Source NetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico Open Source GlobalNetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Open Source HostEndpoint resource documentation: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico Open Source calicoctl get documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Open Source calicoctl apply documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/apply

## Issues Found
- The introduction said Calico NetworkSet resources group DNS names. In Calico Open Source, NetworkSet and GlobalNetworkSet `spec.nets` contain IPv4 or IPv6 CIDRs. DNS/domain entries are documented for Calico Enterprise/Cloud using `allowedEgressDomains`, not for the Open Source resource examples in this post. I changed the wording to "IP addresses and CIDRs."
- The GlobalNetworkPolicy SSH example used `selector: "has(node)"`, which implies endpoints already have a `node` label. Calico GlobalNetworkPolicy selectors apply to labeled workload and host endpoints, but `node` is not a universal endpoint label. I changed the example to target endpoints explicitly labeled `role == 'ssh-server'`.

## Review Notes
- The example CIDRs `203.0.113.100/32` and `198.51.100.0/29` are documentation/example address ranges, so they are safe placeholders but should be replaced with real organization-owned ranges before use.
- Calico NetworkSet matching is based on packet source and destination IPs. NAT between the Calico-enabled node and the listed networks can affect whether policy matches as expected.
