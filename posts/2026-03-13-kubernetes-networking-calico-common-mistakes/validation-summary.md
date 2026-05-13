# Validation Summary: How to Avoid Common Mistakes with Kubernetes Networking for Calico Users

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Kubernetes
- Calico Open Source
- Calico IPAM
- Calico IPPool resources
- calicoctl
- BGP
- VXLAN and IP-in-IP encapsulation
- Prometheus metrics

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico IPAM overview: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- calicoctl IPAM show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico MTU configuration guide: https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico outgoing NAT guide: https://docs.tigera.io/calico/latest/networking/configuring/workloads-outside-cluster
- Calico kube-controllers Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/kube-controllers/prometheus
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus

## Issues Found
- The `calicoctl ipam show` guidance referred to a "Utilization" column. Current Calico documentation shows usage as percentages in the "IPS IN USE" and "IPS FREE" columns, so the comment was corrected.
- The new IPPool example hardcoded `ipipMode: Always` without noting that pools should match the cluster's encapsulation mode. The text now frames the snippet as an IP-in-IP example and instructs readers to match their cluster mode.
- The `natOutgoing` explanation implied that internet access always fails without Calico NAT. The text now accounts for environments that provide upstream routing or NAT for pod CIDRs.
- The best-practices section said Calico Felix exposes IPAM metrics. Current Calico documentation shows IPAM metrics such as `ipam_allocations_in_use` and `ipam_ippool_size` are exposed by kube-controllers, so this was corrected.
- The MTU best practice said to never rely on auto-detection in production. Calico documentation states that auto-detection is the default and can work correctly when encapsulation modes are configured accurately, so the recommendation was made more precise.

## Review Notes
The remaining commands and resource fields reviewed are consistent with current Calico documentation. The post is version-neutral, so no version-specific caveats were required beyond validating against current Calico Open Source documentation.
