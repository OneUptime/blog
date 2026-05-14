# Validation Summary: Avoid Mistakes When Integrating Calico IPAM With Legacy Firewalls

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico CNI and Calico IPAM
- Calico IPPool resources
- Calico GlobalNetworkPolicy
- Kubernetes pods and `kubectl`
- Legacy firewall allowlists and CIDR-based routing
- Linux `iptables`

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico outgoing NAT documentation: https://docs.tigera.io/calico/latest/networking/configuring/workloads-outside-cluster
- Calico IPAM blocks documentation: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico `calicoctl ipam show` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico external IP/network policy documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/external-ips-policy
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The post overstated pod IP churn by saying pod IPs change on every pod restart. Updated the wording to say pod IPs can change when pods are replaced or rescheduled, which avoids confusing container restarts with pod replacement.
- The `natOutgoing: false` explanation said BGP routing was required. Updated it to say pod CIDRs must be routable, commonly via BGP, because Calico's documentation describes BGP peering as a common on-premises approach but the core requirement is routability.
- The `kubectl run` curl example used the base `alpine` image, which does not include `curl` by default. Changed it to `curlimages/curl:8.8.0` and used the correct argument form for `kubectl run`.
- The `calicoctl ipam show --show-blocks` parsing used `awk 'NR>1 {print $1}'`, which would print table separators or the first table column instead of block CIDRs. Changed it to extract the CIDR column only for `Block` rows.
- The Calico GlobalNetworkPolicy example matched a destination port without specifying a protocol. Added `protocol: TCP` for the PostgreSQL egress rule.
- The firewall topology summary labeled pod CIDRs as appropriate for NAT mode and described the service CIDR as if it were normally the source for service-to-external traffic. Updated those labels to distinguish direct pod routing from `natOutgoing=true` node SNAT behavior.
- The policy section implied the legacy firewall always only needs to allow the pod CIDR. Updated it to allow the relevant Kubernetes address range, which may be the pod CIDR or the node CIDR depending on `natOutgoing`.

## Review Notes
The examples are illustrative and use placeholder CIDRs and hostnames. Operators should substitute the actual Calico IP pools, node address ranges, no-NAT exception pools, and firewall rule syntax used in their environment.
