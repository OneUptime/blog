# Validation Summary: How to Configure Dynamic DNS Updates for IPv6

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- BIND 9
- Dynamic DNS (RFC 2136)
- TSIG authentication
- `nsupdate`
- IPv6 AAAA and PTR records
- NetworkManager dispatcher
- Linux `ip` command

## Sources Consulted
- BIND 9 Administrator Reference Manual: dynamic update policy behavior and zone configuration syntax — https://bind9.readthedocs.io/en/v9.21.14/reference.html
- BIND 9 Security Configurations: guidance for TSIG-authenticated dynamic updates and `allow-update` usage — https://bind9.readthedocs.io/en/v9.20.16/chapter7.html
- BIND 9 Manual Pages: `tsig-keygen`, `nsupdate`, `rndc`, and `arpaname` — https://bind9.readthedocs.io/en/v9.20.16/manpages.html
- RFC 3596: IPv6 AAAA records and `ip6.arpa` nibble-reversed PTR naming — https://datatracker.ietf.org/doc/rfc3596/
- NetworkManager dispatcher manual: dispatcher arguments and action names — https://networkmanager.dev/docs/api/latest/NetworkManager-dispatcher.html
- Local man pages used for command behavior verification: `nsupdate(1)` and `ip-address(8)`

## Issues Found
- The reverse zone name in the BIND configuration and PTR update example did not match the `2001:db8::/32` prefix used elsewhere in the post. I changed it to `8.b.d.0.1.0.0.2.ip6.arpa` so the zone boundary matches RFC 3596 nibble-reversed IPv6 delegation.
- The `allow-update` comments implied you could combine a TSIG key with an IPv6 source-prefix restriction as a single authenticated policy. I rewrote the comment to keep the example TSIG-based and to point readers toward `update-policy` for finer-grained restrictions, which matches current BIND guidance.
- The automatic update script filtered out addresses marked `mngtmpaddr`, which can exclude the stable IPv6 address used as the template for privacy addresses. I changed the lookup to `ip -6 addr show ... scope global primary` so it selects a global non-temporary address more reliably.
- The NetworkManager dispatcher example would run the script for every dispatcher event. I added an action guard so the script only reacts to `up` and `dhcp6-change` events while still allowing manual execution.
- The PTR example comment said the PTR record was updated "simultaneously" even though it was shown as a separate `nsupdate` request. I changed the wording to reflect the actual behavior.

## Review Notes
- `type master;` is still valid in current BIND as a synonym for `type primary;`, so no change was required.
- The paths `/etc/bind` and `/var/lib/bind`, and the `bind` group ownership example, are Debian/Ubuntu-style defaults and may differ on other distributions.
- The `dig AAAA host1.example.com @2001:db8::53` verification example is accepted by current `dig`, so it was left unchanged.
