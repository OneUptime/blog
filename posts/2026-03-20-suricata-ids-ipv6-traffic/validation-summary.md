# Validation Summary: How to Configure Suricata IDS/IPS for IPv6 Traffic

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Suricata IDS/IPS
- IPv6 traffic inspection
- Suricata rule syntax
- Suricata YAML configuration
- AF_PACKET and NFQUEUE inline IPS modes
- ip6tables / Netfilter Queue
- systemd services
- jq and Python JSON log filtering

## Sources Consulted
- Suricata documentation: What is Suricata - https://docs.suricata.io/en/latest/what-is-suricata.html
- Suricata Quickstart - https://docs.suricata.io/en/latest/quickstart.html
- Suricata RPM installation - https://docs.suricata.io/en/latest/install/rpm.html
- Suricata command-line options - https://docs.suricata.io/en/latest/command-line-options.html
- Suricata rule format - https://docs.suricata.io/en/latest/rules/intro.html
- Suricata IP and ICMP rule keywords - https://docs.suricata.io/en/latest/rules/header-keywords.html
- Suricata thresholding keyword - https://docs.suricata.io/en/latest/rules/thresholding.html
- Suricata decode-event keyword and rule types - https://docs.suricata.io/en/latest/rules/decode-layer.html and https://docs.suricata.io/en/latest/rules/rule-types.html
- Suricata Linux IPS inline setup - https://docs.suricata.io/en/latest/ips/setting-up-ipsinline-for-linux.html
- Suricata rule management with suricata-update - https://docs.suricata.io/en/latest/rule-management/suricata-update.html
- Suricata rule reloads - https://docs.suricata.io/en/latest/rule-management/rule-reload.html
- IANA ICMPv6 Parameters - https://www.iana.org/assignments/icmpv6-parameters
- RFC 4861 Neighbor Discovery for IPv6 - https://datatracker.ietf.org/doc/html/rfc4861
- RFC 4291 IPv6 Addressing Architecture - https://datatracker.ietf.org/doc/html/rfc4291
- IANA IPv6 Special-Purpose Address Space - https://www.iana.org/assignments/iana-ipv6-special-registry
- jq manual - https://jqlang.org/manual/

## Issues Found
- The version check used `suricata --build-info | grep "Version"`, but Suricata's build-info output uses lowercase `version`, so the grep can return no output. Changed it to `suricata -V`, which is the documented version flag.
- The RPM installation command assumed `suricata` was already available from enabled repositories. Added the documented EPEL/dnf-plugins and OISF COPR enablement steps before `dnf install suricata`.
- The first rule used `ip6-exthdr:hopopts`, which is not a Suricata rule keyword. Replaced it with Suricata's documented `ipv6.hdr` sticky buffer and a match on the IPv6 Next Header byte for Hop-by-Hop Options.
- The ICMPv6 rules used `icmp6` as the rule protocol. Suricata documents and accepts `icmpv6`, so both rules were corrected.
- The Neighbor Discovery rules only targeted `$HOME_NET`, which can miss multicast Router Advertisement and Neighbor Advertisement traffic. Added `ff02::/16` to the destination address list.
- The ICMPv6 threshold syntax was made canonical according to Suricata's `threshold` keyword format.
- The IPv4-mapped IPv6 rule used an invalid Suricata keyword, `ip6.src`, and an imprecise "tunneling" description. Replaced it with a source-address match on `::ffff:0:0/96` and renamed it to detect IPv4-mapped IPv6 source addresses.
- The NFQUEUE ip6tables examples appended rules with `-A`, which may place them after existing accept/drop rules. Changed them to `-I`, matching Suricata's documented iptables examples for sending traffic to NFQUEUE.
- The AF_PACKET IPS note incorrectly showed `nfq` configuration. Replaced it with a two-interface AF_PACKET `copy-mode: ips` / `copy-iface` example and `stream.inline: auto`, matching Suricata's inline IPS documentation.
- The systemd service declared a PID file but did not force Suricata to create it. Added `--pidfile /run/suricata.pid` and aligned `PIDFile` with `/run/suricata.pid`.
- The jq filter used `.src_ip | contains(":")`, which errors on EVE records without `src_ip` such as stats events. Changed it to `(.src_ip? // "") | contains(":")`.

## Review Notes
- I validated the updated local Suricata rules with `suricata -T` using a Suricata 7.0.3 binary extracted locally from the Ubuntu package, and the configuration loaded successfully.
- The example `HOME_NET` uses documentation and ULA-style IPv6 ranges. In production, readers should replace these with their actual internal IPv6 prefixes.
