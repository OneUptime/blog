# Validation Summary: How to Monitor IPv6 Address Utilization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 / IPAM concepts (/32, /48, /64 prefix hierarchy)
- NetBox (IPAM) via the `pynetbox` Python client
- Kea DHCP server Control Agent (HTTP REST API, `statistic-get-all` command)
- Prometheus (`prometheus_client` Python library, exposition, alert rules)
- Grafana / Prometheus alerting (PromQL with `humanizePercentage` template)
- Bash + Python for ad-hoc reporting

## Sources Consulted
- Kea Control Agent — HTTP command response format: https://kea.readthedocs.io/en/latest/arm/ctrl-channel.html#http-ctrl-channel-command-response-format
- Kea statistics — `statistic-get-all`: https://kea.readthedocs.io/en/latest/arm/stats.html#the-statistic-get-all-command
- NetBox IPAM filtersets (source of truth for filter names): https://github.com/netbox-community/netbox/blob/main/netbox/ipam/filtersets.py
- pynetbox documentation: https://pynetbox.readthedocs.io/
- prometheus_client (Python) — `start_http_server`: https://github.com/prometheus/client_python (`prometheus_client/exposition.py`)
- Prometheus templating functions (`humanizePercentage`): https://prometheus.io/docs/prometheus/latest/configuration/template_reference/

## Issues Found

1. **Wrong NetBox prefix filter name (`prefix_length` → `mask_length`).** The NetBox `PrefixFilterSet` exposes `mask_length` (and `mask_length__gte`/`__lte`) as the prefix-length filter; `prefix_length` is not a recognized filter. Three calls used the wrong name and would return empty/incorrect result sets. Fixed in the exporter (`collect_prefix_utilization`) and in both `nb.ipam.prefixes.filter(... prefix_length=48)` / `prefix_length=64` calls inside the report script — all switched to `mask_length`.

2. **Kea Control Agent response treated as a single object instead of a list.** Per the official Kea docs, HTTP responses from the Control Agent are *always* wrapped in a JSON array (one element per service when `service` is specified, one element otherwise — kept for backward compatibility). The original code did `data.get("arguments", {})` directly, which raises `AttributeError: 'list' object has no attribute 'get'`. Added `isinstance(stats, list)` / `isinstance(data, list)` unwrap guards in both the Python exporter (`collect_dhcpv6_pool_utilization`) and the bash script's embedded Python parser. The `[[value, timestamp]]` shape used downstream for `value[0][0]` is correct per Kea statistics docs.

## Review Notes
- The exporter defines `PREFIX_TOTAL_ADDRESSES` and imports `Info` and `ipaddress` but never uses them; harmless, not technically wrong.
- `collect_dhcpv6_pool_utilization` is defined but never invoked in `main` and contains a `# Create gauge dynamically` comment with no implementation — this is illustrative skeleton code rather than a runnable collector. Worth completing in a future revision (e.g., create a `Gauge` keyed on `subnet_id` and `.set(value[0][0])`).
- `start_http_server(9477, addr="::")` is valid; binding to `::` on dual-stack Linux also accepts IPv4 connections via IPv4-mapped IPv6 addresses by default.
- The `parent` filter on `nb.ipam.ip_addresses` is valid (`MultiValueCharFilter` → `search_by_parent`) and accepts a CIDR.
- `humanizePercentage` in the alert annotation correctly formats a 0–1 ratio as a percentage; the alert expression returns the ratio (`assigned/total`) so this is consistent.
- Arithmetic on prefix counts is correct: `2 ** (48 - 32) = 65,536` /48s per /32 and `2 ** (64 - 48) = 65,536` /64s per /48.
- The `PRACTICAL_POOL = 10000` constant is acknowledged in-comment as a placeholder; for a production deployment this should come from the actual DHCPv6 pool definition or be derived from Kea `total-nas` per subnet.
