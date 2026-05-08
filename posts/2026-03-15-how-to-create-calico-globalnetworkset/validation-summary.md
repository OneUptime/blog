# Validation Summary: How to Create the Calico GlobalNetworkSet Resource

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico Open Source
- Calico GlobalNetworkSet
- Calico GlobalNetworkPolicy
- Kubernetes
- calicoctl
- kubectl

## Sources Consulted
- Calico Open Source GlobalNetworkSet resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkset
- Calico Open Source GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Open Source calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico Open Source calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl configuration guidance: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/overview
- Calico Cloud GlobalNetworkSet resource reference, consulted to distinguish Calico Cloud domain support from Calico Open Source: https://docs.tigera.io/calico-cloud/reference/resources/globalnetworkset

## Issues Found
- The introduction said Calico GlobalNetworkSet resources can contain domain names. Current Calico Open Source documentation defines `GlobalNetworkSet.spec.nets` as valid IPv4 or IPv6 CIDRs only. I changed the description to say the resource holds IP networks in CIDR notation.
- The verification command tested `203.0.113.10`, which came from the trusted-partners set rather than the `threat-intel-blocklist` used by the deny policy. I changed the text and example command to test an address from the deny list.
- The troubleshooting section said single hosts must use `/32`. That is correct for IPv4 but incomplete for IPv6. I updated it to mention `/32` for IPv4 and `/128` for IPv6.

## Review Notes
- The `apiVersion`, `kind`, `metadata.labels`, and `spec.nets` fields in the GlobalNetworkSet examples match the current Calico Open Source resource reference.
- The GlobalNetworkPolicy example uses a valid egress `destination.selector` to match GlobalNetworkSet labels.
- The `calicoctl apply -f` and `calicoctl get globalnetworkset -o yaml/-o wide` commands match the current calicoctl references.
- Current Calico documentation recommends installing the Calico API server and using `kubectl` for most operations in newer releases, while `calicoctl` remains valid and documented.
