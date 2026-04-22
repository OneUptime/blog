# Validation Summary: How to Verify SLAAC Address Assignment on Linux

## Status
validated

## Post Type
Tutorial / diagnostic guide

## Technologies Covered
- IPv6 SLAAC
- Linux iproute2 `ip` command
- Linux IPv6 Router Advertisement sysctls
- IPv6 Neighbor Discovery and Duplicate Address Detection
- `rdisc6` / ndisc6
- `tcpdump` / libpcap capture filters
- systemd-resolved `resolvectl`
- NetworkManager DNS inspection

## Sources Consulted
- ip-address(8), iproute2 manual: https://manpages.debian.org/testing/iproute2/ip-address.8.en.html
- ip-route(8), iproute2 manual: https://man7.org/linux/man-pages/man8/ip-route.8.html
- ip(8), iproute2 manual: https://manpages.debian.org/bookworm/iproute2/ip.8.en.html
- Linux kernel IP sysctl documentation: https://docs.kernel.org/networking/ip-sysctl.html
- RFC 4861, Neighbor Discovery for IP version 6: https://www.rfc-editor.org/rfc/rfc4861
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://www.rfc-editor.org/rfc/rfc4862
- RFC 8106, IPv6 Router Advertisement Options for DNS Configuration: https://datatracker.ietf.org/doc/html/rfc8106
- rdisc6(8), ndisc6 manual: https://manpages.debian.org/testing/ndisc6/rdisc6.8.en.html
- resolvectl(1), systemd manual: https://man7.org/linux/man-pages/man1/resolvectl.1.html
- systemd.network(5), IPv6AcceptRA settings: https://man7.org/linux/man-pages/man5/systemd.network.5.html
- NetworkManager IPv6 settings reference: https://networkmanager.dev/docs/api/latest/settings-ipv6.html
- ping(8), iputils manual: https://manpages.debian.org/unstable/iputils-ping/ping.8.en.html
- pcap-filter(7), libpcap filter syntax: https://man7.org/linux/man-pages/man7/pcap-filter.7.html

## Issues Found
- The address-state guidance said `dynamic` could mean SLAAC or DHCPv6. iproute2 documents IPv6 `dynamic` filtering as stateless address configuration, so the wording was corrected and `proto kernel_ra` was added as the newer, more explicit RA-origin marker.
- The lifetime guidance implied both `valid_lft` and `preferred_lft` must be non-zero. Deprecated but still valid addresses can have `preferred_lft 0`, so the text now distinguishes valid lifetime from preferred lifetime.
- The `scope global` note described the address as global unicast only. Linux global scope can include ULAs, so the note now says the address is not link-local and may be GUA or ULA.
- `ip -6 addr show eth0 details` used invalid `ip` syntax. It was changed to `ip -d -6 addr show dev eth0`.
- The route section treated SLAAC-related prefix routes as `proto kernel` and used `ip -6 route show detail`, which is invalid syntax. The section now checks RA-learned routes with `ip -6 route show proto ra` and shows all routes with `ip -6 route show`.
- The route-expiry note overgeneralized RA Router Lifetime. It now specifically says default routes expire with the RA Router Lifetime.
- The `/proc/net/snmp6` Router Advertisement grep used `icmpv6inrouter`, which does not match the Linux counter name. It now uses `Icmp6InRouterAdvertisements`.
- The "Complete NDP statistics" label was inaccurate because `grep Icmp6` returns all ICMPv6 counters, not only NDP. It now says "Complete ICMPv6 statistics."
- DAD checks grepped uppercase `TENTATIVE` / `DADFAILED`, while `ip` address flags are lowercase in normal output. The commands now use case-insensitive grep.
- The full verification script now quotes `$IFACE`, uses `dev "$IFACE"` for address and default-route checks, uses the exact RA counter name, and uses `ping -6` instead of the compatibility `ping6` form.
- The introduction's "host or router" wording was narrowed to hosts or forwarding interfaces configured to accept RAs, matching Linux `accept_ra` behavior.

## Review Notes
The post is technically relevant and salvageable. `rdisc6` behavior can vary by package capabilities or setuid configuration, so some systems may require running it with elevated privileges even though the example command is valid.
