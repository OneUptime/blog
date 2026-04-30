# Validation Summary: How to Configure IPv6 on Palo Alto Networks Firewalls

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Palo Alto Networks NGFW
- PAN-OS
- IPv6
- Neighbor Discovery Protocol (NDP)
- Router Advertisements (RA) / SLAAC
- IPv6 static routing
- PAN-OS security policy
- NAT64
- DHCPv6 relay / DHCPv6 client with prefix delegation

## Sources Consulted
- Palo Alto Networks, "Configure Layer 3 Interfaces" https://docs.paloaltonetworks.com/pan-os/11-0/pan-os-networking-admin/configure-interfaces/layer-3-interfaces/configure-layer-3-interfaces
- Palo Alto Networks, "Configure Session Settings" https://docs.paloaltonetworks.com/pan-os/11-1/pan-os-networking-admin/session-settings-and-timeouts/configure-session-settings
- Palo Alto Networks, "PAN-OS 11.1 Configure CLI Command Hierarchy" https://docs.paloaltonetworks.com/ngfw/pan-os-cli-quick-start/cli-command-hierarchy/pan-os-11-1-configure-cli-command-hierarchy
- Palo Alto Networks, "PAN-OS 11.1 CLI Ops Command Hierarchy" https://docs.paloaltonetworks.com/ngfw/pan-os-cli-quick-start/cli-command-hierarchy/pan-os-11-1-cli-ops-command-hierarchy
- Palo Alto Networks, "Firewall as a DHCP Server and Client" https://docs.paloaltonetworks.com/pan-os/11-0/pan-os-networking-admin/dhcp/firewall-as-a-dhcp-server-and-client
- Palo Alto Networks, "DHCP" https://docs.paloaltonetworks.com/ngfw/networking/dhcp
- Palo Alto Networks, "IPv6 Support by Feature" https://docs.paloaltonetworks.com/compatibility-matrix/reference/ipv6-support-by-feature
- Palo Alto Networks, "NAT64" https://docs.paloaltonetworks.com/ngfw/administration/set-up-firewalls/policy/network-address-translation/about-nat64
- Palo Alto Networks, "Configure NAT64 for IPv6-Initiated Communication" https://docs.paloaltonetworks.com/ngfw/networking/nat64/configure-nat64-for-ipv6-initiated-communication

## Issues Found
- The post omitted the required global **IPv6 Firewalling** setting. I added the prerequisite note and the corresponding CLI command because PAN-OS ignores IPv6-based configuration when IPv6 firewalling is disabled.
- The Step 1 CLI commands used the wrong configuration path and keywords for PAN-OS IPv6 interface settings. I corrected them to the documented `layer3 ipv6` hierarchy and `enable-on-interface` syntax.
- The WAN and LAN examples reused the same IPv6 prefix, which would be an invalid routed design. I split the examples so the WAN uses `2001:db8:0:1::/64` and the LAN uses `2001:db8:1:1::/64`.
- The static route used `2001:db8:isp::1`, which is not a valid IPv6 address because `isp` is not a hexadecimal hextet. I replaced it with a valid example next hop on the WAN subnet.
- The Router Advertisement example used unsupported `router-advertisement prefix ...` CLI syntax. I replaced it with the documented PAN-OS model, where prefix advertisement settings are configured under the IPv6 address on the interface.
- The LAN RA section did not actually assign an IPv6 address to `ethernet1/2`, so the example was incomplete. I added the interface IPv6 address and the per-address advertisement settings required for SLAAC.
- The verification commands included incorrect IPv6 operational syntax: `show routing route type ipv6`, `show neighbor all`, `show session all filter proto 6`, and `ping ... source ethernet1/1`. I replaced them with documented PAN-OS commands for IPv6 routing, NDP neighbors, IPv6 session filtering, and IPv6 ping syntax.
- The security policy note said IPv6 policy applies on either source or destination IPv6 address, which is misleading. I corrected it to reflect PAN-OS rule matching across zones, source and destination address, application, and service.
- The DHCP note claimed DHCPv6 server functionality exists on the firewall in PAN-OS 9.0+. I corrected this because Palo Alto documents DHCP server support as IPv4-only; the firewall supports DHCPv6 relay and DHCPv6 client with prefix delegation instead.

## Review Notes
- The post now aligns with PAN-OS virtual-router based IPv6 configuration. Newer PAN-OS documentation also covers logical routers under the Advanced Routing Engine, but the virtual router workflow used here remains technically valid.
- The examples use documentation prefixes from `2001:db8::/32`; production deployments must replace them with real routed prefixes and valid upstream next-hop addresses.
