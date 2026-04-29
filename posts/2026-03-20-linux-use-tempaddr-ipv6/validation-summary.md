# Validation Summary: Understanding Linux use_tempaddr for IPv6 Privacy

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux kernel IPv6 networking
- IPv6 SLAAC and Router Advertisements
- Linux `sysctl`
- `iproute2` / `ip`
- NetworkManager / `nmcli`
- `curl`, `wget`, and `strace`

## Sources Consulted
- Linux kernel IP sysctl documentation: https://docs.kernel.org/networking/ip-sysctl.html
- Linux kernel 6.1 IP sysctl documentation: https://docs.kernel.org/6.1/networking/ip-sysctl.html
- `ip-address(8)` manual page: https://man7.org/linux/man-pages/man8/ip-address.8.html
- NetworkManager IPv6 settings reference: https://www.networkmanager.dev/docs/api/latest/settings-ipv6.html
- RFC 8981, Temporary Address Extensions for Stateless Address Autoconfiguration in IPv6: https://datatracker.ietf.org/doc/html/rfc8981
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://datatracker.ietf.org/doc/html/rfc4862
- RFC 6724, Default Address Selection for Internet Protocol Version 6 (IPv6): https://datatracker.ietf.org/doc/html/rfc6724
- curl tool documentation: https://curl.se/docs/manpage.html

## Issues Found
- The introduction said RFC 8981 was "formerly RFC 4941" and implied a direct implementation mapping. I changed it to say RFC 8981 obsoletes RFC 4941 and that `use_tempaddr` controls the privacy-extension behavior. This matches the RFC relationship more accurately.
- The `use_tempaddr` value table treated `2` as the only prefer-temporary setting and said value `1` means the temporary address is never used. I changed it to reflect the kernel's documented behavior: `== 1` prefers public/stable addresses, and any value `> 1` prefers temporary addresses.
- The lifecycle section said a new temporary address is generated after `preferred_lft` expires. I changed it to say Linux normally generates a new temporary address before the old one is deprecated, and the old address becomes deprecated when `preferred_lft` reaches zero. This matches RFC 8981's regeneration model.
- The post listed `temp_valid_lft` default as 7 days. I changed it to 2 days to match the Linux kernel documentation and RFC 8981 defaults.
- The `temp_valid_lft = 86400` example was described as keeping the address valid for 24 hours after the preferred lifetime expires. I changed the wording to clarify that `86400` is 24 hours total validity from address creation, not 24 additional hours after deprecation.
- The sample address output implied fixed lifetimes. I added a note that observed lifetimes depend on router-advertised prefix lifetimes and local `temp_*` sysctl values.
- The `curl` verification example used `--interface ""`, which is unnecessary for the stated purpose. I simplified it to `curl -6 ...`, which is clearer and directly documented.
- The `mngtmpaddr` section implied that temporary addresses would not be generated at all if a manually added address lacked `mngtmpaddr`. I changed it to clarify that temporary addresses are not generated from that manual address, while SLAAC can still provide its own template address.
- The NetworkManager section implied `nmcli connection modify` immediately updates the live interface sysctl. I clarified that the check should be done after reconnecting or activating the connection.
- The conclusion said `use_tempaddr = 2` is correct for any Linux client system. I softened that to "usually the right setting" because the original wording was too absolute.

## Review Notes
- Actual `preferred_lft` and `valid_lft` values seen in `ip -6 addr` output are constrained by both local `temp_*` sysctl settings and the lifetimes advertised in Router Advertisements.
- On NetworkManager-managed systems, per-connection `ipv6.ip6-privacy` settings can override or reapply `use_tempaddr` behavior when the connection activates.
