# Validation Summary: How to Configure ISATAP Tunneling for IPv6 on IPv4 Intranets

## Status
validated

## Post Type
Guide

## Technologies Covered
- ISATAP
- IPv6
- IPv4
- Linux `iproute2`
- `radvd`
- Debian `ifupdown`
- DNS

## Sources Consulted
- RFC 5214, Intra-Site Automatic Tunnel Addressing Protocol (ISATAP): https://datatracker.ietf.org/doc/rfc5214/
- RFC 6964, Operational Guidance for IPv6 Deployment in IPv4 Sites Using ISATAP: https://www.ietf.org/rfc/rfc6964
- `ip-tunnel(8)` Linux man page: https://man7.org/linux/man-pages/man8/ip-tunnel.8.html
- `ip-address(8)` Linux man page: https://man7.org/linux/man-pages/man8/ip-address.8.html
- `radvd.conf(5)` Debian man page: https://manpages.debian.org/bookworm/radvd/radvd.conf.5.en.html
- `interfaces(5)` Debian man page: https://manpages.debian.org/unstable/ifupdown/interfaces.5.en.html
- Microsoft DNS global query block list documentation: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/dnscmd

## Issues Found
- The introduction overstated the addressing model by describing only the lower 32 bits. I corrected it to describe the ISATAP interface identifier format defined in RFC 5214.
- The address-format example contained an incorrect and self-contradictory hex explanation. I replaced it with the correct hexadecimal and expanded IPv6 representation for `10.0.0.5`.
- The host default-route example used `::5efe:a00:1` as the next hop. I corrected this to the router's ISATAP link-local address `fe80::5efe:a00:1`, which is the appropriate next hop for router discovery and default routing on ISATAP.
- The router example added an explicit `/64` route after assigning an address from that prefix. Linux automatically creates the prefix route unless `noprefixroute` is used, so I removed the redundant route command.
- The `radvd` example was missing `UnicastOnly on;`, which is required for non-broadcast multiple-access links such as ISATAP. I added it and tightened the surrounding comment.
- The `/etc/network/interfaces` example used `inet6 tunnel` with `mode isatap`, which is not documented as a supported `ifupdown` tunnel mode. I replaced it with a technically valid `inet6 manual` stanza that uses `pre-up`/`up`/`down` commands to create and remove the ISATAP tunnel.
- The DNS section was incomplete for Windows DNS environments because the `isatap` name is commonly blocked by the DNS global query block list by default. I added that caveat.

## Review Notes
ISATAP is a legacy transition mechanism and the post correctly advises preferring native dual-stack for new deployments. Linux can also participate in router advertisement processing on tunnel interfaces, but this post now consistently documents a manual static-address/static-route host configuration path.
