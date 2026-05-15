# Validation Summary: How to Enable IP Forwarding and NAT for OpenVPN on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- OpenVPN
- Linux kernel IPv4 and IPv6 forwarding sysctls
- firewalld zones, policies, and masquerading
- nftables and connection tracking verification commands

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, Configuring firewalls and packet filters: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/configuring_firewalls_and_packet_filters/
- Red Hat Enterprise Linux 9 documentation, Configuring and managing networking: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/configuring_and_managing_networking/
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- firewalld zone options documentation: https://firewalld.org/documentation/zone/options.html
- firewalld concepts documentation: https://firewalld.org/documentation/concepts.html
- Linux kernel IP sysctl documentation: https://docs.kernel.org/networking/ip-sysctl.html
- OpenVPN 2.6 manual: https://openvpn.net/community-docs/community-articles/openvpn-2-6-manual.html

## Issues Found
- The NAT section enabled masquerading without specifying a zone and described it as applying to all outgoing traffic. firewalld documentation recommends enabling masquerading on the zone bound to the external interface, so the commands and explanation now use the `public` outbound zone from the example.
- The selective NAT policy section removed masquerading without specifying the outbound zone and described it as a global masquerade. The command now removes masquerading from the `public` outbound zone and the explanatory comment makes the ingress and egress zone dependency explicit.
- The VPN interface section offered `internal` as an alternate VPN zone, but the later policy example uses `trusted` as its ingress zone. Added a note to use `internal` as the ingress zone if that alternate zone is chosen.
- The OpenVPN hook section used "PostUp/PostDown" terminology, which is not OpenVPN directive naming. The heading now refers to OpenVPN `up`/`down` scripts, matching the actual directives used in the snippet.
- The OpenVPN hook scripts added and removed masquerading from the default zone, which might not be the outbound zone. The scripts now target the `public` outbound zone consistently.
- The verification and troubleshooting commands queried masquerading without a zone, which checks the default zone rather than necessarily checking the outbound zone. The commands now query the `public` zone used in the examples.
- The nftables verification command only listed `ip firewalld`. RHEL documentation shows firewalld-generated rules can be listed from `inet firewalld`, `ip firewalld`, and `ip6 firewalld`; the example now includes `inet firewalld` as the primary check and keeps `ip firewalld` for IPv4-specific rules.

## Review Notes
The corrected examples assume the outbound interface is assigned to the `public` zone and the VPN tunnel is assigned to the `trusted` zone. If a system uses different firewalld zones, the zone names should be adjusted consistently in the masquerade, policy, verification, and hook-script commands.
