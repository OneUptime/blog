# Validation Summary: How to Configure Snort IDS for IPv6 Detection

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Snort 3
- LibDAQ
- Snort Lua configuration
- Snort intrusion detection rules
- IPv6 and ICMPv6
- DNS AAAA records
- Linux systemd

## Sources Consulted
- Snort 3 Rule Writing Guide - Rules: https://docs.snort.org/start/rules
- Snort 3 Rule Writing Guide - Reading Traffic: https://docs.snort.org/start/inspection
- Snort 3 Rule Writing Guide - Alert Logging: https://docs.snort.org/start/alert_logging
- Snort 3 Rule Writing Guide - Protocol Headers: https://docs.snort.org/rules/headers/protocols
- Snort 3 Rule Writing Guide - `ip_proto`: https://docs.snort.org/rules/options/non_payload/ip_proto
- Snort 3 Rule Writing Guide - `itype`: https://docs.snort.org/rules/options/non_payload/itype
- Snort 3 source and generated user/reference docs: https://github.com/snort3/snort3
- LibDAQ source documentation: https://github.com/snort3/libdaq
- IANA Protocol Numbers registry: https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml
- IANA ICMPv6 Parameters registry: https://www.iana.org/assignments/icmpv6-parameters
- IANA DNS Parameters registry: https://www.iana.org/assignments/dns-parameters/dns-parameters.xhtml

## Issues Found
- The installation commands used `apt install snort3`, omitted required source-build dependencies, did not build LibDAQ, and used a hard-coded older Snort tarball with direct `cmake`. I changed the example to build LibDAQ and Snort 3 from the official GitHub repositories with the documented `configure_cmake.sh` workflow and required libraries.
- The source install defaults did not line up with the post's later `/etc/snort` paths. I added commands to create `/etc/snort/rules`, copy the installed Lua config files there, download the community rules archive, and create `local.rules`.
- The Snort Lua configuration used `EXTERNAL_NET = '!HOME_NET'`, which does not reference the Snort variable correctly. I changed it to `!$HOME_NET`.
- The configuration snippet used `RULE_PATH` and `default_variables` without showing the required `include 'snort_defaults.lua'`. I added the include after `HOME_NET` and `EXTERNAL_NET`, matching Snort's default configuration order.
- The `ips` table defined `include` twice, so Lua would overwrite the first rule file with the second. I changed this to the documented `rules = [[ include ... ]]` form for multiple rule includes.
- The `ips` configuration did not pass rule variables with `variables = default_variables`, and custom DNS/IPv6 variables were not exposed to rules. I added the rule-variable synchronization and `variables = default_variables`.
- The rule include paths depended on Snort's default relative `RULE_PATH`, which would not point at `/etc/snort/rules`. I set `RULE_PATH = '/etc/snort/rules'` and synchronized `default_variables.paths.RULE_PATH`.
- Hyperscan detection options were enabled without setting the Hyperscan search engine. I added `search_engine = { search_method = "hyperscan" }` and included the Hyperscan development package in the build dependencies.
- `alert_csv.fields` used comma-separated field names, but Snort expects a multi-value field list. I changed the field list to space-separated names.
- The example rules used unsupported Snort 3 rule protocol headers (`ip6`, `icmp6`) and an unsupported `ip6_hdr:hopopts` rule option. I replaced them with valid Snort 3 rule syntax using `ip`, `icmp`, and `ip_proto`.
- The multiline rules used Snort 2-style trailing backslashes. I removed them and used Snort 3's whitespace-tolerant multiline rule format.
- The DNS AAAA detection matched the ASCII string `AAAA`, but DNS query type AAAA is encoded as type 28 on the wire. I changed the content match to the DNS wire-format `|00 1c 00 01|` sequence for AAAA/IN.
- The SSH scan rule claimed to detect IPv6 but matched the mixed IPv4/IPv6 `HOME_NET`. I changed it to use an IPv6-only `IPV6_HOME_NET` variable.
- Runtime commands wrote CSV alerts to the default working directory while later examples read `/var/log/snort/alert_csv.txt`. I added `-l /var/log/snort/` to the relevant run commands.
- The examples used `/var/log/snort` without creating it. I added a `sudo mkdir -p /var/log/snort` step before the run commands.
- The IPv6 alert filter used `grep ":"`, which also matches the timestamp in every alert. I replaced it with an `awk` filter that checks the source and destination address columns.
- The Unified2 analysis comment referenced `u2boat` while the command used `u2spewfoo`, and Unified2 was not enabled in the earlier commands. I corrected the comment to describe `u2spewfoo` and note that it applies when `-A unified2` is enabled.
- The closing paragraph implied IPv6-specific rule protocol keywords are used directly. I revised it to reflect Snort 3's traditional `ip`, `icmp`, `tcp`, and `udp` rule headers plus IPv6 address variables, `ip_proto`, and built-in IPv6 decoder alerts.

## Review Notes
- The `2001:db8::/32` network is a documentation prefix and should be replaced with the reader's real IPv6 allocation in production.
- The built-in IPv6 decoder alerts require `enable_builtin_rules = true`, which is now present in the `ips` configuration.
- Readers who keep Snort configuration under `/usr/local/etc/snort` instead of `/etc/snort` should adjust `RULE_PATH` and the `-c` command paths consistently.
