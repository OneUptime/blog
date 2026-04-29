# Validation Summary: How to Monitor IPv6 Address Allocation Logs

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Kea DHCPv6 server (ISC)
- Kea Control Agent REST API
- Python (re, urllib.request, prometheus_client)
- Bash / curl
- Prometheus metrics (Gauge, Counter)
- DHCPv6 protocol concepts (DUIDs, IAIDs, NAs, prefix delegation)

## Sources Consulted
- Kea DHCPv6 message identifiers (`dhcp6_messages.mes`): https://github.com/isc-projects/kea/blob/master/src/bin/dhcp6/dhcp6_messages.mes
- Kea Statistics documentation: https://kea.readthedocs.io/en/latest/arm/stats.html
- Kea API Reference (`stat-lease6-get`, `statistic-get`): https://kea.readthedocs.io/en/latest/api.html
- Kea Stat Commands Hooks Library: https://reports.kea.isc.org/dev_guide/d1/d88/libdhcp_stat_cmds.html
- Kea Management API / Control Agent response format: https://kea.readthedocs.io/en/latest/arm/ctrl-channel.html

## Issues Found

1. **Wrong Kea log message identifiers (Step 1)** — Post used `LEASE6_ALLOC`, `LEASE6_EXPIRE`, and `LEASE6_RENEW`, which are not actual Kea log message names. The real identifiers in `dhcp6_messages.mes` are `DHCP6_LEASE_ALLOC` and `DHCP6_LEASE_RENEW`. Kea has no `DHCP6_LEASE_EXPIRE`; expired/reclaimed leases are logged via the allocation engine (e.g., `ALLOC_ENGINE_V6_LEASE_RECLAIMED`). Updated all message names and the conclusion text accordingly.

2. **Wrong log line format and regex (Step 1)** — Post described a fictional log format (`address: …, valid-lft: …`) modeled after the legacy ISC dhcpd. The actual Kea `DHCP6_LEASE_ALLOC` message text is `%1: lease for address %2 and iaid=%3 has been allocated for %4 seconds`, where `%1` is the client label like `duid=[…], tid=0x…`. Rewrote the regex and the fields stored in `active_leases` to match (DUID, IAID, lifetime). Removed the `mac` group since the real log line doesn't contain `hwtype=…` MAC tokens.

3. **Wrong statistic name for DHCPv6 (Step 2)** — Post used `subnet[1].assigned-addresses`, which is the DHCPv4 statistic. For DHCPv6 the correct name is `subnet[1].assigned-nas` (Network Addresses). Corrected the statistic name and the corresponding key in the Python parsing.

4. **Missing Control Agent response wrapper (Step 2)** — When commands are forwarded through the Kea Control Agent with a `service` parameter, the response is wrapped in a JSON list (one entry per service). The post indexed straight into `data['arguments'][...]`; corrected to `data[0]['arguments'][...]`.

5. **Wrong command name (Step 3)** — Post used `lease6-stats`, which is not a real Kea command. The correct command from the `stat_cmds` hook library is `stat-lease6-get`. Updated the command and added the same Control Agent list-unwrap (`json.load(resp)[0]`).

6. **Wrong column index for assigned NAs (Step 3)** — The `stat-lease6-get` result-set columns are `subnet-id, total-nas, cumulative-assigned-nas, assigned-nas, declined-addresses, total-pds, cumulative-assigned-pds, assigned-pds`. The post used `entry[2]` (which is *cumulative*-assigned-nas) for the currently assigned count. Corrected to `entry[3]` (`assigned-nas`) and added a comment listing the column order.

7. **Wrong DUID delimiter in extraction grep (Step 4)** — Pattern was `'duid: \[\K[^\]]+'`, but Kea formats the client label as `duid=[...]`. Updated the grep to `'duid=\[\K[^\]]+'` and the message filter from `LEASE6_ALLOC` to `DHCP6_LEASE_ALLOC` to match the corrected identifier.

## Review Notes
- The naive `addr[:9]` "/32 prefix" grouping in Step 1 is preserved as in the original — it is an illustrative string-prefix bucket and is not a true bit-prefix calculation; for short or `fe80::` addresses it can yield odd labels. The original author appears to have used it as a quick visual grouping.
- Kea's REST API returns `service` as an array; specifying multiple services would return multiple result objects in the top-level list. The corrected code only looks at the first response, which matches the single-service request.
- The Step 2 script depends on the `ALERT_WEBHOOK` environment variable being set in the caller; this is unchanged from the original.
- The `start_http_server(9477, addr="::")` call in Step 3 uses a keyword argument that has been supported by `prometheus_client` since 0.15.0 (2022); fine for modern installations.
- Kea's `DHCP6_LEASE_ALLOC` is at INFO level in the `kea-dhcp6.leases` logger, which is enabled by default. Operators with custom logging configs may need to confirm the message is reaching the parsed log file.
