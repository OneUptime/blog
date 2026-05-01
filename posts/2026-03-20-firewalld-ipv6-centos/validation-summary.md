# Validation Summary: How to Configure firewalld IPv6 Rich Rules on CentOS

## Status
validated

## Post Type
Guide

## Technologies Covered
- firewalld
- firewall-cmd
- IPv6
- Linux firewall zones
- firewalld rich rules
- CentOS / RHEL

## Sources Consulted
- firewalld `firewall-cmd` man page: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- firewalld `firewalld.richlanguage` man page: https://firewalld.org/documentation/man-pages/firewalld.richlanguage
- firewalld `firewalld.conf` man page: https://firewalld.org/documentation/man-pages/firewalld.conf.html
- firewalld predefined zones documentation: https://firewalld.org/documentation/zone/predefined-zones.html
- firewalld zone options documentation: https://firewalld.org/documentation/zone/options
- Red Hat Enterprise Linux 8 Securing Networks documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/pdf/securing_networks/using-and-configuring-firewalld_securing-networks
- RFC 4291, IP Version 6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/rfc3849/

## Issues Found
- Several example IPv6 addresses were invalid because they used non-hexadecimal hextets such as `mgmt`, `trusted`, and `bad`. I replaced them with valid documentation-prefix examples under `2001:db8::/32`.
- The ICMP rate-limit rich rule combined `protocol value="ipv6-icmp"` with `icmp-type name="echo-request"`. The official rich-language grammar allows a single primary element in that position, so I removed the invalid `protocol` element and kept the valid `icmp-type` rule.
- The command `firewall-cmd --query-service=ssh --family=ipv6` was incorrect because `--query-service` does not accept a `--family` option. I replaced it with `firewall-cmd --query-service=ssh`.
- The backend check was described as verifying whether IPv6 was enabled, but `FirewallBackend` only reports the firewalld backend selection (`nftables` or `iptables`). I corrected the explanation.
- The runtime/permanent description was imprecise. I updated it to match firewalld’s documented runtime-versus-permanent behavior.
- The ICMP example `firewall-cmd --get-icmptypes | tr ' ' '\n' | grep ipv6` would not reliably list IPv6-specific ICMP types. I replaced it with `firewall-cmd --get-icmptypes`.
- The ICMP block inversion comments were misleading. I clarified that inversion makes only the listed ICMP types accepted while the others are rejected.
- The predefined zone list omitted `home` and `work`. I added them.

## Review Notes
- The post is technically sound after correction and remains applicable to firewalld-based CentOS and RHEL systems.
- In practice, `--list-all`, `--list-rich-rules`, and `--query-service` operate on the default zone unless `--zone` is specified.
- `--add-icmp-block` is not inherently IPv6-only; if a reader wants ICMP filtering strictly for IPv6 traffic, a rich rule with `family="ipv6"` is the clearer approach.
