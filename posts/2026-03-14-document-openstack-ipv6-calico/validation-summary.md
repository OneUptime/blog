# Validation Summary: How to Document OpenStack IPv6 with Calico for Operations Teams

## Status
validated

## Post Type
Operations guide

## Technologies Covered
- OpenStack
- Calico for OpenStack
- Calico Felix
- Calico BIRD/BGP routing
- calicoctl
- IPv6, ICMPv6, NDP, and address types
- Linux iproute2 and ip6tables
- Bash

## Sources Consulted
- Calico Open Source documentation: Calico for OpenStack overview: https://docs.tigera.io/calico/latest/getting-started/openstack/overview
- Calico Open Source documentation: calicoctl ipam show: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico Open Source documentation: calicoctl get: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Open Source documentation: calicoctl node status: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico Open Source documentation: GlobalNetworkPolicy resource: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- OpenStackClient documentation: server command object: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/server.html
- OpenStackClient documentation: compute service command object: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/compute-service.html
- IANA ICMPv6 Parameters registry: https://www.iana.org/assignments/icmpv6-parameters/icmpv6-parameters.xhtml
- RFC 4193, Unique Local IPv6 Unicast Addresses: https://www.rfc-editor.org/rfc/rfc4193.html
- RFC 4291, IPv6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291.html
- RFC 4861, Neighbor Discovery for IPv6: https://www.rfc-editor.org/rfc/rfc4861.html

## Issues Found
- The ULA table listed `fd00::/8` as the full Unique Local range. RFC 4193 defines the ULA block as `fc00::/7`, with locally assigned prefixes using the L bit set. Updated the table to show `fc00::/7` and note that locally assigned prefixes typically use `fd00::/8`.
- The IPv6 key differences said "No NAT required (every VM can have a globally routable address)", which was too broad because ULA addresses are not globally routable. Reworded it to say NAT is not required for globally routed IPv6 and that VMs with GUA addresses can be globally routable.
- The troubleshooting script inferred the compute host by grepping default `openstack server list` output and taking the last field. OpenStackClient supports `--ip6` filtering and `server show`, while the default list output is not a reliable source for the hypervisor host. Updated the script to find the server ID with `openstack server list --all-projects --ip6 ... -c ID` and then read `OS-EXT-SRV-ATTR:host` via `openstack server show`.
- The Calico IPAM utilization command used `calicoctl ipam show --ip-version=6`, but current Calico documentation for `calicoctl ipam show` does not include an `--ip-version` option. Replaced it with `calicoctl ipam show`, which reports usage for all IP pools including IPv6 pools.
- The health-check loop listed all compute services and could include non-compute service hosts. Updated it to use `openstack compute service list --service nova-compute` before counting per-node routes.

## Review Notes
The remaining commands are environment-dependent but align with documented Calico and OpenStack command surfaces. The examples assume a Calico for OpenStack deployment using BIRD, which matches the current Calico OpenStack documentation, but operators using a different BGP implementation should adjust route and BGP checks accordingly.
