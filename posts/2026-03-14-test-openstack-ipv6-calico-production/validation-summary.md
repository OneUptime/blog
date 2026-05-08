# Validation Summary: How to Test OpenStack IPv6 with Calico in Production-Like Environments

## Status
validated

## Post Type
Tutorial / testing guide

## Technologies Covered
- OpenStack Networking / Neutron
- OpenStackClient CLI
- Calico for OpenStack
- IPv6, SLAAC, Router Advertisements, ICMPv6, and NDP
- Bash, SSH, netcat, iperf3, and Linux routing commands

## Sources Consulted
- OpenStackClient latest security group rule command documentation: https://static.openstack.org/docs/python-openstackclient/latest/cli/command-objects/security-group-rule.html
- OpenStackClient subnet command documentation: https://docs.openstack.org/python-openstackclient/3.11.0/command-objects/subnet.html
- OpenStack Neutron IPv6 configuration guide: https://docs.openstack.org/ocata/networking-guide/config-ipv6.html
- OpenStack Neutron latest Networking Guide security group behavior: https://docs.openstack.org/neutron/latest/doc-neutron.pdf
- Calico for OpenStack overview: https://docs.tigera.io/calico/latest/getting-started/openstack/overview
- Calico OpenStack IPv6 guest OS guidance: https://docs.tigera.io/calico/latest/networking/openstack/ipv6
- Calico OpenStack IP addressing and connectivity guide: https://docs.tigera.io/calico/latest/networking/openstack/connectivity
- RFC 8200, Internet Protocol Version 6 Specification: https://www.rfc-editor.org/rfc/rfc8200.html
- RFC 4890, Recommendations for Filtering ICMPv6 Messages in Firewalls: https://www.rfc-editor.org/rfc/rfc4890.html

## Issues Found
- The security group example used `--protocol icmpv6`. Current OpenStackClient documentation lists `ipv6-icmp` for Network v2 security group rules, so the example was changed to `--protocol ipv6-icmp` with `--ethertype IPv6`.
- The TCP 22 security group example did not explicitly create an IPv6 rule. It now creates separate IPv4 and IPv6 SSH rules so the later SSH-over-IPv6 test has a matching ingress rule.
- The IPv4 ICMP rule did not specify an ethertype. It now uses `--ethertype IPv4` to avoid ambiguity next to the IPv6 ICMP rule.
- The DNS test label implied DNS transport over IPv6, but the command only checks for an AAAA lookup from a VM reached over IPv4. The label was changed to "AAAA DNS lookup from VM1".
- The troubleshooting text claimed that failing to explicitly allow ICMPv6 in user security groups causes NDP to fail. Neutron automatically installs basic NDP and MLD sanity rules, so the text was corrected to distinguish ICMPv6 echo rules for ping from required ICMPv6 handling elsewhere in the path.
- The MTU troubleshooting note implied routers may fragment IPv6 packets. RFC 8200 specifies that IPv6 fragmentation is source-only, so the note was corrected to mention Path MTU and ICMPv6 Packet Too Big handling.

## Review Notes
The OpenStack CLI was not installed in the local environment, so command validation was performed against official OpenStackClient and Neutron documentation rather than local `--help` output.
