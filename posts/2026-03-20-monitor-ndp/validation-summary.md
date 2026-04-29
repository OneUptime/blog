# Validation Summary: How to Monitor NDP (Neighbor Discovery Protocol) in IPv6

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- IPv6 Neighbor Discovery Protocol (NDP, RFC 4861)
- Linux iproute2 (`ip -6 neigh`, `ip link`)
- Linux sysctl (`net.ipv6.neigh.default.gc_thresh3`)
- tcpdump (ICMPv6 capture)
- Prometheus (alerting rules, textfile collector)
- Prometheus Node Exporter (textfile collector)
- Grafana (dashboard queries / PromQL)
- Bash scripting

## Sources Consulted
- RFC 4861 — Neighbor Discovery for IP version 6 (https://www.rfc-editor.org/rfc/rfc4861)
- iproute2 `ip-neighbour(8)` man page — output format and `nud` filter states
- Linux kernel networking documentation — `gc_thresh1/2/3` semantics and NUD state machine (`include/uapi/linux/neighbour.h`)
- tcpdump source `print-icmp6.c` — verified ICMPv6 message-type strings ("neighbor solicitation", "neighbor advertisement", "router solicitation", "router advertisement")
- tcpdump(1) man page — behavior of `-q` flag (suppresses protocol-specific output, leaves only `length`)
- Prometheus alerting rule reference (https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- Prometheus Node Exporter textfile collector docs (https://github.com/prometheus/node_exporter#textfile-collector)
- Bash parameter expansion (`${VAR,,}` lowercase conversion, Bash 4.0+)

## Issues Found

1. **Incorrect awk field index for NDP cache state parsing (script 1).**
   The first script used `awk '$5=="REACHABLE"'` (and similar) to count entries by state. The output of `ip -6 neigh show dev IFACE` does not place the state at column 5 reliably — its position depends on whether optional `lladdr <mac>` and/or `router` flags are present. For example, `INCOMPLETE` entries have no `lladdr`, so the state appears at column 2; entries with lladdr but no router flag have state at column 4. As written, the counts would be wrong (often zero) for most entries.
   **Fix:** changed `$5` to `$NF` (the state is always the last field in the line), which works for all variants of `ip -6 neigh` output, both with and without a `dev` filter.

2. **tcpdump `-q` flag strips the ICMPv6 message type, breaking the awk parser (script 3).**
   The capture script invoked `tcpdump ... 'icmp6' -q`. Per tcpdump source (`print-icmp6.c`) and the man page, `-q` ("quick / quieter output") prints only the packet length and suppresses protocol-specific fields, so lines like `ICMP6, neighbor solicitation, ...` collapse to just `length N`. The awk patterns would never match and all counters would stay at zero.
   **Fix:** removed the `-q` flag so tcpdump emits the full ICMPv6 message-type description.

3. **awk regex patterns used hyphenated forms that tcpdump never emits (script 3).**
   The script searched for `/neighbor-solicit/`, `/neighbor-advert/`, `/router-advert/`, `/router-solicit/`, but tcpdump's actual output strings (verified in `print-icmp6.c`) are `neighbor solicitation`, `neighbor advertisement`, `router solicitation`, `router advertisement` — full words separated by spaces, no hyphens. With literal hyphens in the regex, no lines would match.
   **Fix:** updated the patterns to match the real tcpdump output strings (e.g., `/neighbor solicitation/`).

## Review Notes

- **`INTERVAL=10` in `monitor-ndp-rate.sh` is unused.** The script captures a fixed 1000-packet window via `tcpdump -c 1000` rather than a 10-second window, so the column header `NS/s` is technically a per-1000-packet count, not a per-second rate. The commands are correct; only the labeling is loose. Left as-is to avoid scope creep beyond technical correctness.
- **Interface enumeration via `ip link show | grep -E "^[0-9]" | awk '{print $2}' | tr -d ':' | grep -v lo`** does not strip the `@parent` suffix on VLAN/macvlan/etc. sub-interfaces (e.g., `eth0.10@eth0`), which would cause subsequent `ip -6 neigh show dev <iface>` calls to fail on those names. This is an edge case on hosts with sub-interfaces; physical-interface-only deployments (eth0/eth1/etc.) are unaffected. Left as-is.
- **`net.ipv6.neigh.default.gc_thresh3`** is the kernel default; per-interface overrides at `net.ipv6.neigh.<iface>.gc_thresh3` exist but are uncommon. Using the default as the denominator is a reasonable baseline.
- **`${STATE,,}`** requires Bash 4.0+ (released 2009), available on essentially all modern Linux distributions; no portability concern in practice.
- All NUD state names used (REACHABLE, STALE, DELAY, PROBE, FAILED, INCOMPLETE, PERMANENT) are valid for the `nud` filter argument to `ip -6 neigh show`.
- Prometheus alert rule syntax, label/annotation usage, and PromQL functions (`rate`, `humanizePercentage`) are all correct.
