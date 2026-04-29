# Validation Summary: How to Implement MAP-T for Stateless IPv4 to IPv6 Translation

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- MAP-T
- MAP-E
- DS-Lite
- IPv4/IPv6 translation
- DHCPv6 Softwire46 options
- Linux networking
- Jool

## Sources Consulted
- RFC 7599, Mapping of Address and Port using Translation (MAP-T): https://datatracker.ietf.org/doc/html/rfc7599
- RFC 7597, Mapping of Address and Port with Encapsulation (MAP-E): https://datatracker.ietf.org/doc/html/rfc7597
- RFC 7598, DHCPv6 Options for Configuration of Softwire Address and Port-Mapped Clients: https://datatracker.ietf.org/doc/html/rfc7598
- RFC 9313, Pros and Cons of IPv6 Transition Technologies for IPv4-as-a-Service (IPv4aaS): https://www.ietf.org/rfc/rfc9313.html
- Linux `ip-link(8)` man page: https://www.man7.org/linux/man-pages/man8/ip-link.8.html
- Jool cheat sheet: https://www.jool.mx/en/cheat-sheet.html
- Jool MAP-T run guide: https://www.jool.mx/en/run-mapt.html
- Local `ip -6 tunnel help` and `ip link help ip6tnl` output

## Issues Found
- The original Linux CE/BR commands used `ip6tnl`/`ip4ip6`, which configures IPv4-over-IPv6 tunneling rather than MAP-T translation. I replaced those sections with a Linux example that uses `jool_mapt`, and I added the missing note that shared-address MAP-T deployments typically also require CE-side NAPT44.
- The address/port mapping example was internally inconsistent. The original values for the IPv6 prefix, derived IPv4 address, PSID offset, and port range did not match the MAP algorithm. I replaced them with the RFC example values (`2001:db8::/40`, `192.0.2.18`, PSID `0x34`, offset `6`) and corrected the Python PSID code accordingly.
- The comparison table described MAP-T customer NAT as “stateless” and claimed “None” protocol overhead for translation. I corrected this to reflect that MAP-T CEs typically do stateful NAPT44 and that translation usually increases packet size by about 20 bytes because the IPv4 header becomes an IPv6 header.
- The DHCPv6 section incorrectly treated option 89 as a standalone MAP-T rule option. I corrected it to reflect RFC 7598, where MAP-T provisioning is carried in `OPTION_S46_CONT_MAPT` (95), encapsulating `OPTION_S46_RULE` (89) and `OPTION_S46_DMR` (91), with optional `OPTION_S46_PORTPARAMS` (93).
- The introduction and conclusion overstated that the CE’s port range is always derived from its IPv6 address alone. I clarified that MAP information comes from MAP provisioning and may be provisioned separately when no address bits are embedded in the delegated IPv6 prefix.

## Review Notes
- Jool’s public MAP-T documentation is dated and some pages still reference old release-candidate wording, so exact package names and version availability should be checked on the target distro before deployment.
- The post is now technically consistent, but production MAP-T CE deployments still need a NAT44 policy that enforces the assigned PSID-derived source-port range.
