# Validation Summary: How to Troubleshoot IPv6 Address Not Assigned

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Linux IPv6 sysctls
- SLAAC
- DHCPv6
- Neighbor Discovery Protocol (NDP)
- Router Advertisements
- `iproute2`
- `ndisc6` / `rdisc6`
- `systemd-networkd` / `networkctl`
- NetworkManager
- `ip6tables`

## Sources Consulted
- Linux kernel IP sysctl documentation: https://docs.kernel.org/6.1/networking/ip-sysctl.html
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://datatracker.ietf.org/doc/html/rfc4861
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://datatracker.ietf.org/doc/html/rfc4862
- RFC 8981, Temporary Address Extensions for Stateless Address Autoconfiguration in IPv6: https://datatracker.ietf.org/doc/html/rfc8981
- NetworkManager `nm-settings-nmcli` reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- `systemd.network` reference: https://www.freedesktop.org/software/systemd/man/257/systemd.network.html
- `networkctl` reference: https://www.freedesktop.org/software/systemd/man/latest/networkctl.html
- NDisc6 project documentation: https://www.remlab.net/ndisc6/
- ISC DHCP `dhclient` manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhclient
- Local command help checked for syntax: `ip address help`, `ip6tables --help`, `networkctl --help`

## Issues Found
- The post said a link-local `fe80::/10` address is "always present" when IPv6 is enabled. I changed this to "normally present" because Linux supports configurations that suppress link-local generation.
- The Router Advertisement example implied `accept_ra=1` was sufficient in all cases. I corrected it to note that Linux requires `accept_ra=2` when IPv6 forwarding is enabled.
- The `use_tempaddr` note incorrectly cited RFC 7217. I changed it to a temporary-privacy-address description and clarified that `use_tempaddr=1` still prefers public addresses, because RFC 7217 covers stable privacy addresses while temporary/privacy addresses are covered by the temporary-address privacy extensions.
- The DHCPv6 section incorrectly treated the RA Managed flag as meaning DHCPv6 is strictly required for addresses. I corrected the explanation to reflect that DHCPv6-managed addressing can coexist with SLAAC when the advertised prefix also has the Autonomous flag.
- The diagnostic checklist treated any `accept_ra >= 1` value as OK. I fixed the script so it warns when `accept_ra=1` is set on a forwarding interface, because Linux ignores RAs in that case unless `accept_ra=2`.
- The DHCPv6-client check assumed portable `systemd` unit names for `dhclient` and `dhcpcd`. I replaced it with process-based checks for common clients/managers and updated the conclusion to include DHCPv6-managed networks as a common failure mode.

## Review Notes
- `rdisc6` is provided by the `ndisc6` package and may not be installed by default on all Linux distributions.
- The `ip6tables` examples are technically valid, but many modern Linux systems use nftables underneath or manage firewall policy through higher-level tooling.
- The post is Linux-specific; the sysctl paths and service-management checks do not apply as written to BSD, macOS, or Windows.
