# Validation Summary: How to Monitor for IPv6 Privacy Extension Compliance

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Linux kernel IPv6 sysctls (`addr_gen_mode`, `use_tempaddr`)
- IPv6 EUI-64 / RFC 7217 stable-privacy / RFC 4941 (RFC 8981) temporary addresses
- Bash scripting (`ip`, `awk`, `grep`, `sysctl`)
- Ansible (playbook, `shell` module, Jinja2 filters)
- Prometheus Node Exporter textfile collector
- Prometheus alerting rules (PromQL)
- cron

## Sources Consulted
- Linux kernel IPv6 sysctl documentation (`Documentation/networking/ip-sysctl.rst`) — `addr_gen_mode`, `use_tempaddr`, `stable_secret`
- RFC 4291 — IPv6 Addressing Architecture (EUI-64 / Modified EUI-64 IID construction)
- RFC 5952 — IPv6 textual representation / leading-zero suppression rules
- RFC 7217 — Stable, semantically opaque IIDs (mode 2/3 basis)
- RFC 4941 / RFC 8981 — Privacy / temporary addresses for SLAAC
- Prometheus Node Exporter docs — `--collector.textfile.directory` flag
- Ansible documentation — `shell` module and Jinja2 filter behavior

## Issues Found

1. **EUI-64 detection regex too strict for compressed IPv6 hextets** (`README.md`, in `check_ipv6_privacy.sh`). The original regex `^[0-9a-f]{2}[0-9a-f]{2}:[0-9a-f]{2}ff:fe[0-9a-f]{2}:[0-9a-f]{4}$` required exactly 4 hex chars in hextets 5, 7, and 8. Per RFC 5952, `ip` suppresses leading zeros within each hextet, so hextet 5 (form `XXFF`) can display as `ff`, `Xff`, or `XXff`, and hextets 7/8 can be 1–4 chars. The strict regex would miss valid EUI-64 addresses (e.g., MAC bytes that yield a leading-zero high byte in any of those positions). Replaced with `^[0-9a-f]{1,4}:[0-9a-f]{0,2}ff:fe[0-9a-f]{2}:[0-9a-f]{1,4}$`, which correctly anchors on the inserted `fffe` signature while accepting suppressed leading zeros. Hextet 6 always begins with `fe`, so it is never suppressed and stays as `fe[0-9a-f]{2}`.

## Review Notes
- The shorthand `addr_gen_mode ... 3 (random)` is slightly imprecise: mode 3 still produces RFC 7217 stable-privacy addresses; the difference vs. mode 2 is only that the secret is auto-generated when `stable_secret` is unset. The post's intent is clear in context, so this was left as-is.
- The post references RFC 4941. RFC 8981 (Feb 2021) formally obsoletes RFC 4941, but Linux kernel docs and most distro tooling still reference RFC 4941, so the reference is not incorrect — future revisions could note RFC 8981 (notably, the default `TEMP_VALID_LIFETIME` was reduced from 7 to 2 days in RFC 8981).
- The Prometheus textfile collector path `/var/lib/node_exporter/textfile_collector/` is the de facto upstream convention but is not a built-in default — operators must pass `--collector.textfile.directory=...` to node_exporter. Worth a one-line caveat in a future revision.
- The Prometheus metrics script enumerates all entries under `/proc/sys/net/ipv6/conf/`, including the `all` and `default` pseudo-interfaces, which produces extra series; the alerting rule already filters them with `interface!~"lo|all|default"`, so this is benign but worth noting.
- The IID-extraction `awk -F: '{print $(NF-3)":"$(NF-2)":"$(NF-1)":"$NF}'` correctly handles `::` zero-compression because every EUI-64 IID inherently contains the `ff:fe` middle hextets, so the last 4 colon-separated fields are always the IID. No fix needed.
