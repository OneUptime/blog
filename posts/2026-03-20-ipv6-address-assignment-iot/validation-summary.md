# Validation Summary: How to Understand IPv6 Address Assignment for IoT Devices

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing
- SLAAC
- EUI-64 interface identifiers
- RFC 7217 stable privacy addresses
- RFC 8981 temporary addresses
- DHCPv6
- ISC DHCP `dhcpd6.conf`
- Linux `ip`, `sysctl`, and `nmcli`
- RIOT OS GNRC networking
- IPAM address discovery scripts

## Sources Consulted
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://www.rfc-editor.org/rfc/rfc4862
- RFC 7217, A Method for Generating Semantically Opaque Interface Identifiers with IPv6 Stateless Address Autoconfiguration (SLAAC): https://www.rfc-editor.org/rfc/rfc7217
- RFC 8064, Recommendation on Stable IPv6 Interface Identifiers: https://www.rfc-editor.org/rfc/rfc8064
- RFC 8981, Temporary Address Extensions for Stateless Address Autoconfiguration in IPv6: https://www.rfc-editor.org/rfc/rfc8981
- RFC 9915, Dynamic Host Configuration Protocol for IPv6 (DHCPv6): https://www.rfc-editor.org/rfc/rfc9915.html
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849.html
- Linux kernel IP sysctl documentation: https://docs.kernel.org/6.18/networking/ip-sysctl.html
- NetworkManager IPv6 settings reference: https://networkmanager.dev/docs/api/latest/settings-ipv6.html
- NetworkManager nmcli settings reference: https://www.networkmanager.dev/docs/api/latest/nm-settings-nmcli.html
- ISC DHCP 4.4 `dhcpd.conf` manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- ISC DHCP 4.4 `dhcp-options` manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcp-options
- RIOT OS `netif.h` API reference: https://api.riot-os.org/gnrc_2netif_8h.html
- RIOT OS GNRC network interface API: https://api.riot-os.org/group__net__gnrc__netif.html
- RIOT OS IPv6 address definitions: https://doc.riot-os.org/ipv6_2addr_8h.html
- Local `ip -6 addr help`, `ip -6 neigh help`, and `nmcli connection help` output for CLI syntax validation

## Issues Found
- The post treated RFC 4941 as the current temporary-address specification. I updated the diagram, section heading, and selection table to RFC 8981, and clarified that temporary addresses typically supplement a stable address rather than replace it.
- The EUI-64 section said it was the default behavior on most devices and described it as collision-free. That is no longer a safe generalization, especially after RFC 8064, so I revised it to describe EUI-64 as still common on constrained IoT stacks and changed the benefit wording to deterministic IID generation.
- The Linux stable-privacy example omitted the `stable_secret` requirement for `addr_gen_mode=2` and the NetworkManager example implied `nmcli connection modify` takes a device name. I corrected the Linux example to set `stable_secret`, noted when to replace `default` with an interface name, and changed the NetworkManager example to use a connection-profile placeholder.
- The DHCPv6 configuration used invalid IPv6 literals such as `2001:db8:iot:1::/64`, `::sensor1`, and `::door1`, which are not valid hexadecimal IPv6 addresses. I replaced them with valid RFC 3849 documentation addresses and generalized the reservation comment from “DUID-LL” to “client DUID” while keeping a DUID-LL example value.
- The manufacturing-time static-assignment snippet mixed Contiki-NG and RIOT OS concepts and was not syntactically complete because `netif` was undefined and the code was not wrapped in a function. I converted it into a RIOT-specific example with the correct headers, `gnrc_netif_iter(NULL)`, and a valid helper function.
- The IPAM discovery script had the shebang after a comment, used an invalid IPv6 prefix, and parsed `ip -6 neigh show` incorrectly, which would record the interface name instead of the MAC address. I moved the shebang to the first line, fixed the prefix, filtered by the configured subnet, and corrected the `read` field parsing.

## Review Notes
- The DHCPv6 example is accurate for ISC DHCP 4.4 syntax specifically; readers using other DHCPv6 servers will need equivalent configuration in their server’s format.
- The RIOT example keeps `GNRC_NETIF_IPV6_ADDRS_FLAGS_STATE_VALID`, which RIOT documents as skipping DAD when activated. That is appropriate only when address uniqueness is guaranteed by provisioning.
