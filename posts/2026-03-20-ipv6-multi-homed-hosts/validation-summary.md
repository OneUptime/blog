# Validation Summary: How to Configure IPv6 on Multi-Homed Hosts

## Status
validated

## Post Type
Guide / tutorial

## Technologies Covered
- Linux IPv6 routing with `iproute2` (`ip route`, `ip rule`)
- IPv6 policy-based routing and source-prefix routing
- IPv6 source address selection (`RFC 6724`)
- `systemd-networkd` persistent routing configuration
- glibc `getaddrinfo()` policy configuration via `/etc/gai.conf`
- IPv6 default-router preference and ECMP concepts

## Sources Consulted
- [ip-route(8) manual page](https://man7.org/linux/man-pages/man8/ip-route.8.html)
- [ip-rule(8) manual page](https://man7.org/linux/man-pages/man8/ip-rule.8.html)
- [gai.conf(5) manual page](https://man7.org/linux/man-pages/man5/gai.conf.5.html)
- [systemd.network(5)](https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html)
- [RFC 6724: Default Address Selection for IPv6](https://www.rfc-editor.org/rfc/rfc6724)
- [RFC 8028: First-Hop Router Selection in a Multi-Prefix Network](https://www.rfc-editor.org/rfc/rfc8028)
- [RFC 4191: Default Router Preferences and More-Specific Routes](https://www.rfc-editor.org/rfc/rfc4191)
- [RFC 8043: Source-Address-Dependent Routing and Source Address Selection for IPv6 Hosts](https://www.rfc-editor.org/rfc/rfc8043)
- [RFC 3704: Ingress Filtering for Multihomed Networks](https://www.rfc-editor.org/rfc/rfc3704)
- Local CLI help: `ip -6 route help`, `ip -6 rule help`

## Issues Found
1. The post used invalid example IPv6 literals such as `fe80::gw-a`, `fe80::gw-b`, and `2001:db8:external::...`. I replaced them with valid documentation addresses (`fe80::1`, `fe80::2`, and `2001:db8:ffff::...`) because non-hexadecimal groups are not valid IPv6 syntax.
2. The introduction and routing discussion overstated the failure mode as upstream "reverse-path filtering" and Step 6 incorrectly implied Linux only installs one IPv6 default route. I corrected the text to use upstream ingress filtering terminology and clarified that Linux can keep multiple IPv6 default routes, with metrics or ECMP affecting main-table selection.
3. Step 3 said `/etc/gai.conf` controls source address selection. Per `gai.conf(5)`, it configures `getaddrinfo()` sorting in glibc rather than kernel routing policy. I corrected the comments to distinguish userspace destination ordering from kernel source selection and kept the route `src` example as the actual routing-level source preference.
4. The `systemd-networkd` example used `[IPv6RoutingPolicyRule]`, which is not a documented section name. I changed both examples to the correct `[RoutingPolicyRule]` section from `systemd.network(5)`.
5. The `systemd-networkd` policy-table examples only added default routes to tables `100` and `200`. That would leave those tables without an on-link route for their own `/64`, so same-prefix traffic could fall through to the default route. I added explicit connected prefix routes to each custom table to mirror the working `ip -6 route add ... dev ... table N` example from Step 2.
6. The ECMP examples were presented too generally for provider-specific source prefixes. I added a caveat that ECMP in the main table does not replace the per-source policy tables when each uplink is tied to a different prefix, which aligns better with the RFC 6724 / RFC 8028 multi-prefix model.

## Review Notes
- The post remains Linux-host-specific. Actual behavior for RA-learned default routes also depends on RFC 4191 router preferences and RFC 8028 first-hop router selection, which can vary somewhat by network manager and implementation details.
- `gai.conf(5)` still documents RFC 3484 terminology because it is a glibc man page, while the current IPv6 default address selection standard is RFC 6724. The updated post now reflects that split correctly.
- Local checks: `validation.json` was validated with `jq`; `ip -6 route help` and `ip -6 rule help` were used to confirm command syntax; the embedded `test-multihomed-ipv6.sh` snippet was extracted and passed `bash -n`. Runtime validation on a live dual-uplink host was not possible in this workspace, so the review relied on RFCs, upstream man pages, and `systemd` documentation.
