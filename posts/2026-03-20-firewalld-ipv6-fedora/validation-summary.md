# Validation Summary: How to Configure firewalld IPv6 Rich Rules on Fedora

## Status
validated

## Post Type
Guide

## Technologies Covered
- Fedora Linux
- firewalld
- firewall-cmd
- nftables
- IPv6
- Cockpit

## Sources Consulted
- firewalld `firewall-cmd(1)`: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- firewalld `firewalld.richlanguage(5)`: https://firewalld.org/documentation/man-pages/firewalld.richlanguage
- firewalld `firewalld.service(5)`: https://firewalld.org/documentation/man-pages/firewalld.service.html
- firewalld `firewalld.conf(5)`: https://firewalld.org/documentation/man-pages/firewalld.conf.html
- firewalld HowTo, "Add a Service": https://firewalld.org/documentation/howto/add-a-service.html
- Fedora Project Wiki, "Changes/firewalld default to nftables": https://fedoraproject.org/wiki/Changes/firewalld_default_to_nftables
- RFC 3849, documentation prefix `2001:db8::/32`: https://www.rfc-editor.org/info/rfc3849
- RFC 4193, Unique Local IPv6 Unicast Addresses: https://www.rfc-editor.org/rfc/rfc4193
- Official upstream firewalld service definitions: https://github.com/firewalld/firewalld/tree/main/config/services

## Issues Found
- The post said Fedora `34+` uses the nftables backend by default. I corrected this to Fedora `32+`, which matches Fedora's change record and upstream firewalld documentation.
- Several example IPv6 prefixes were syntactically invalid because they used non-hexadecimal hextets such as `corp`, `mgmt`, and `attacker`. I replaced them with valid documentation and ULA-style prefixes.
- The rich-rule examples were written as multi-line quoted strings, while the official rich language documentation specifies the rule as a single-line string. I converted the examples to the documented format.
- The custom service example claimed to be IPv6-specific but used `--add-service`, which opens the service generically in the zone. I changed it to reference the custom service from an IPv6 rich rule.
- The DNS example in the IPv6-only section also used `--add-service=dns`, which was not IPv6-specific. I changed it to an IPv6 rich rule using `service name="dns"`.
- The explanation for `--query-rich-rule` implied packet testing. I corrected it to match the documented behavior: it checks whether the specified rich rule has been added.
- The wording for `--list-all-zones` was tightened to match the manual page: it lists everything added for or enabled in all zones.
- The overview sentence claiming Fedora firewalld configuration is "the same as CentOS/RHEL" was made more precise to avoid overstating cross-distribution equivalence.

## Review Notes
- Commands and claims were validated against official documentation and RFCs, but they were not executed against a live Fedora host in this workspace.
- The post assumes the default zone is `public`, which matches current firewalld defaults; administrators can change that default, so zone-specific behavior can differ on customized systems.
- Upstream firewalld documentation currently marks the `iptables` backend as deprecated; the post's focus on the `nftables` backend is appropriate.
