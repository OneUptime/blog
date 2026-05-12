# Validation Summary: How to Secure Service IP Advertisement with Calico

## Status
validated

## Post Type
Tutorial / Security hardening guide

## Technologies Covered
- Calico (BGPConfiguration, NetworkPolicy, IPPool, LoadBalancer IPAM)
- Kubernetes (Services, LoadBalancer type)
- BGP (route advertisement, communities, prefix advertisements)

## Sources Consulted
- Calico BGPConfiguration reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico advertise service IPs: https://docs.tigera.io/calico/latest/networking/configuring/advertise-service-ips
- Calico LoadBalancer IPAM (service-loadbalancer): https://docs.tigera.io/calico/latest/networking/ipam/service-loadbalancer
- Calico IPPool reference (allowedUses field): https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico CNI plugin configuration: https://docs.tigera.io/calico/latest/reference/cni-plugin/configuration

## Issues Found
No technical issues found.

Verified items that initially looked suspicious but turned out correct:
- The Service annotation `projectcalico.org/ipv4pools` (without the `cni.` prefix) is the correct annotation for selecting an IP pool for a LoadBalancer Service. (The `cni.projectcalico.org/ipv4pools` variant is for Pods, not Services.)
- The `serviceLoadBalancerIPs` field on `BGPConfiguration` takes a list of `{cidr: ...}` entries — matches the post's example.
- `communities` (with `name`/`value` in standard `aa:nn` or large `aa:nn:mm` format) and `prefixAdvertisements` (with `cidr` and `communities` referencing the named communities) on `BGPConfiguration` are valid.
- The Calico NetworkPolicy structure (with a bare `- action: Deny` catch-all rule after a specific Allow rule) is valid.

## Review Notes
- The post uses the custom community value `65000:999` and names it `do-not-export`. The actual well-known BGP `NO_EXPORT` community is `65535:65281`. The post's approach (a custom community that upstream routers are configured to filter on) is valid and common in practice, but readers should understand that the "do-not-export" behavior is enforced by router-side configuration, not by the well-known community semantics.
- The post references an IP pool named `external-lb-pool` in the Service annotation without showing the corresponding `IPPool` resource definition. In practice, that `IPPool` must exist and should have `allowedUses: [LoadBalancer]` for the LoadBalancer IPAM to assign from it. This is implied but not spelled out — fine for a focused post, worth noting for future expansion.
- The LoadBalancer IPAM feature requires the LoadBalancer controller to be enabled in `KubeControllersConfiguration`. The post does not mention this prerequisite; readers new to Calico's LoadBalancer IPAM may want to consult the official docs for the full setup.
- The mermaid diagram uses `\n` for line breaks in node labels, which works in modern mermaid versions; no issues.
