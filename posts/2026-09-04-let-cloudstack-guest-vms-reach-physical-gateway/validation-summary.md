# Validation Summary: How to Let CloudStack Guest VMs Reach the Physical Gateway

## Status
validated

## Post Type
Technical networking guide with deployment and troubleshooting commands.

## Technologies Covered
- Apache CloudStack shared, isolated, and L2 guest networks
- CloudMonkey CLI and CloudStack networking APIs
- KVM, libvirt, Linux bridges, and VLAN trunks
- IPv4 addressing, ARP, DHCP, DNS, routing, and source NAT
- Security groups, iproute2, iputils, traceroute, and tcpdump/libpcap

## Sources Consulted
- CloudStack Advanced Zone Physical Network Configuration: https://docs.cloudstack.apache.org/en/latest/adminguide/networking/advanced_zone_config.html
- CloudStack KVM networking: https://docs.cloudstack.apache.org/en/latest/installguide/hypervisor/kvm.html#configuring-the-networking
- CloudStack Security Groups: https://docs.cloudstack.apache.org/en/latest/adminguide/networking/security_groups.html
- CloudStack System VM diagnostics: https://docs.cloudstack.apache.org/en/latest/adminguide/systemvm.html#troubleshoot-networks-from-system-vms
- CloudStack networking documentation source, including L2 and network offerings: https://github.com/apache/cloudstack-documentation/blob/main/source/adminguide/networking.rst
- Multiple Guest Networks documentation source: https://github.com/apache/cloudstack-documentation/blob/main/source/adminguide/networking/multiple_guest_networks.rst
- CloudStack 4.23 createNetwork API: https://cloudstack.apache.org/api/apidocs-4.23/apis/createNetwork.html
- CloudStack 4.23 listVirtualMachines API: https://cloudstack.apache.org/api/apidocs-4.23/apis/listVirtualMachines.html
- CloudStack list API references checked for command names and parameters:
  https://cloudstack.apache.org/api/apidocs-4.22/apis/listPhysicalNetworks.html,
  https://cloudstack.apache.org/api/apidocs-4.22/apis/listTrafficTypes.html,
  https://cloudstack.apache.org/api/apidocs-4.22/apis/listNics.html,
  https://cloudstack.apache.org/api/apidocs-4.22/apis/listNetworks.html,
  https://cloudstack.apache.org/api/apidocs-4.22/apis/listRouters.html,
  https://cloudstack.apache.org/api/apidocs-4.22/apis/listEgressFirewallRules.html,
  https://cloudstack.apache.org/api/apidocs-4.22/apis/listPublicIpAddresses.html
- CloudMonkey usage and help implementation: https://github.com/apache/cloudstack-cloudmonkey/wiki/Usage and https://github.com/apache/cloudstack-cloudmonkey/blob/main/cmd/help.go
- CloudStack Linux VLAN bridge implementation: https://github.com/apache/cloudstack/blob/main/scripts/vm/network/vnet/modifyvlan.sh
- libvirt virsh domiflist: https://libvirt.org/manpages/virsh.html#domiflist
- iproute2 manuals: https://github.com/iproute2/iproute2/blob/main/man/man8/ip.8 and https://github.com/iproute2/iproute2/blob/main/man/man8/bridge.8
- iputils manuals: https://github.com/iputils/iputils/blob/master/doc/ping.xml and https://github.com/iputils/iputils/blob/master/doc/arping.xml
- traceroute manual: https://manpages.debian.org/trixie/traceroute/traceroute.1.en.html
- tcpdump manual and libpcap filter grammar: https://www.tcpdump.org/manpages/tcpdump.1.html and https://github.com/the-tcpdump-group/libpcap/blob/master/pcap-filter.manmisc.in
- RFC 5737, IPv4 documentation ranges: https://www.rfc-editor.org/rfc/rfc5737.html
- RFC 2131, DHCP server selection and multiple-server operation: https://www.rfc-editor.org/rfc/rfc2131.txt

## Issues Found
1. **Capture interface and VLAN assumptions.** The original bridge filter required a VLAN tag and used the traffic-label bridge without establishing that it was the VM's actual source bridge. CloudStack's Linux bridge implementation can attach a VLAN subinterface to a separate guest bridge, where traffic is untagged. Changed the bridge capture to use the source bridge identified by libvirt, removed its VLAN filter, retained the tag filter on the trunk, and documented topology and capture-visibility caveats. Softened the conclusion drawn from a missing tap packet.
2. **Capture scope.** The examples captured all ARP and ICMP on a tenant VLAN despite instructing readers to capture only the test VM. Added a test-NIC MAC filter to each capture.
3. **Unusable external test destination.** The traceroute target was in TEST-NET-2. Replaced it with an explicit external-test placeholder and explained that readers must supply an approved reachable destination.
4. **DHCP redundancy.** Requiring exactly one responding DHCP service excluded valid coordinated redundant servers. Changed the requirement to authorized responders with coordinated allocation.
5. **Static guest addressing.** Merely choosing an unused address from an approved range can conflict with CloudStack's allocation state and filtering. Required the CloudStack-managed shared guest to use its allocated NIC address and distinguished external-IPAM L2 addressing.
6. **Network offering and scope prerequisites.** Clarified the explicit-VLAN administrator requirement and offering support for VLAN, IP range, and DNS. Added subdomainaccess=false so the stated domain scope does not silently inherit a global subdomain-access default.
7. **Missing host lookup and arping privileges.** Added list virtualmachines to retrieve the host information requested by the text; list nics and list networks do not provide that VM host lookup. Used sudo for arping, whose raw-packet operation needs CAP_NET_RAW.
8. **Offering rollback qualification.** Reverting an offering is subject to CloudStack's supported update constraints. Qualified the rollback instruction instead of implying arbitrary offering restoration is always possible.

## Review Notes
- The core distinction between a virtual-router gateway on a typical isolated network and a physical gateway on a shared subnet is correct. The source-NAT explanation is explicitly conditional; routed isolated offerings need different upstream routing assumptions.
- Confirmed the createNetwork fields against the 4.23 API. CloudMonkey command parameters should still be checked against the connected management server's API cache, as the post advises. List commands were cross-checked against the published 4.22 API references.
- The latest documentation URLs are moving targets; retrieved pages exposed both 4.22 and 4.23 labels. The Multiple Guest Networks rendered page returned HTTP 403, so its official repository source was consulted. This access failure is not evidence that the link is invalid. The other networking and diagnostics references resolve to the intended subjects.
- Security groups require a compatible zone/provider and offering. Shared L2 membership alone does not provide tenant isolation.
- This was a documentation and source review, not a live CloudStack deployment. No network creation, VM operations, packet captures, or infrastructure changes were executed. Actual VLAN propagation, DHCP behavior, gateway reachability, and migration remain environment-specific acceptance checks.
- Checked shell syntax for every Bash block and parsed validation.json. The post's section structure and author metadata were preserved.
