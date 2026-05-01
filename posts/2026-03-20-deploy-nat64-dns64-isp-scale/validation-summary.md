# Validation Summary: How to Deploy NAT64/DNS64 at ISP Scale

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- NAT64
- DNS64
- Jool
- BIND 9
- IPv6
- BGP anycast

## Sources Consulted
- Jool official docs: Stateful NAT64 Run — https://www.jool.mx/en/run-nat64.html
- Jool official docs: `instance` mode — https://www.jool.mx/en/usr-flags-instance.html
- Jool official docs: `pool4` mode — https://www.jool.mx/en/usr-flags-pool4.html
- Jool official docs: `session` mode — https://www.jool.mx/en/usr-flags-session.html
- Jool official docs: `stats` mode — https://www.jool.mx/en/usr-flags-stats.html
- Jool official docs: Session synchronization — https://www.jool.mx/en/session-synchronization.html
- ISC BIND 9 Configuration Reference (`dns64`, `clients`, `mapped`, `exclude`) — https://bind9.readthedocs.io/en/v9.20.20/reference.html
- Ubuntu Server documentation for BIND service management — https://ubuntu.com/server/docs/how-to/networking/install-dns/
- RFC 6052: IPv6 Addressing of IPv4/IPv6 Translators — https://datatracker.ietf.org/doc/html/rfc6052
- RFC 6147: DNS64 — https://www.rfc-editor.org/rfc/rfc6147
- RFC 7050: Discovery of the IPv6 Prefix Used for IPv6 Address Synthesis — https://www.rfc-editor.org/rfc/rfc7050
- RFC 8215: Local-Use IPv4/IPv6 Translation Prefix — https://www.rfc-editor.org/rfc/rfc8215.html
- RFC 8880: Special Use Domain Name 'ipv4only.arpa' — https://www.rfc-editor.org/rfc/rfc8880.html

## Issues Found
- The post described `64:ff9b::/96` as the "standard NAT64 prefix". I changed this to "well-known NAT64 prefix" to match RFC 6052 terminology and avoid implying that NAT64 must use that prefix.
- The Jool `pool4 add` examples omitted the required port-range argument. I added `1-65535` for TCP/UDP and `0-65535` for ICMP to match Jool's documented CLI syntax.
- The Jool install block did not include kernel headers, which Jool's Debian/Ubuntu installation docs call out for DKMS builds. I added `apt install linux-headers-$(uname -r)` before installing `jool-dkms`.
- The sentence describing Jool as "the most widely used open-source NAT64 implementation for Linux" was not verifiable from the official docs consulted. I changed it to the technically supported description that Jool is an open-source NAT64 implementation for Linux.
- The BIND DNS64 example referenced an undefined `rfc1918` ACL, used an invalid IPv6 literal (`2001:db8:dns::1`), and overrode `exclude` incompletely. I defined the ACL, changed the listener/test address to a valid documentation IPv6 address, and added the IPv4-mapped exclusion prefix from the BIND documentation example.
- The restart command used `systemctl restart named`, but the surrounding example is explicitly Debian/Ubuntu-oriented. I changed this to `systemctl restart bind9.service` to match Ubuntu's documented service name.
- The DNS64 test used `google.com` and expected a synthesized NAT64 AAAA record, but `google.com` already has native AAAA records, so synthesis is not the expected behavior. I replaced the test with `ipv4only.arpa`, the standards-based DNS64/NAT64 discovery name from RFC 7050 and RFC 8880.
- The monitoring example counted lines from `jool session display`, which does not equal the number of active sessions. I replaced it with `jool stats display | grep JSTAT_SESSIONS`, which exposes the actual session counter.
- The routing/scaling wording implied a simpler anycast deployment than stateful NAT64 actually requires. I tightened the text to specify internal BGP anycast and that each translator's pool4 space must route back to the owning node.

## Review Notes
- Jool package versions in distro repositories can lag upstream releases, so operators should confirm that the packaged version supports their running kernel.
- The post uses the well-known prefix `64:ff9b::/96`, which is appropriate for global IPv4 destinations. For non-global IPv4 space or more specialized deployments, a network-specific or local-use translation prefix may be more appropriate under RFC 6052 and RFC 8215.
- Stateful NAT64 high availability needs routing symmetry or state synchronization. Jool supports session synchronization with `joold`, but its documentation warns that active/active synchronization has caveats at higher scale.
