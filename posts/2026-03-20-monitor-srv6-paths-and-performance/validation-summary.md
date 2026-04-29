# Validation Summary: How to Monitor SRv6 Paths and Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- SRv6 (Segment Routing over IPv6)
- ICMPv6 / ping6 (iputils)
- traceroute6
- Linux `ip` route command (iproute2) with seg6 / seg6local
- Cisco IOS-XR segment-routing CLI (referenced)
- Python prometheus_client library
- Prometheus / PromQL
- Grafana
- Prometheus Alertmanager rules (YAML)

## Sources Consulted
- RFC 8986 — Segment Routing over IPv6 (SRv6) Network Programming (End.X, End.DT6 function definitions)
- RFC 4443 — ICMPv6 (Type 3 = Time Exceeded)
- IANA / draft-ietf-6man-sids — `5f00::/16` IETF-managed SRv6 SID prefix
- iputils `ping`/`ping6` man page (-c, -W, -q flags; rtt output format)
- iproute2 `ip-route(8)` man page (`-s` statistics flag, seg6/seg6local route encapsulation)
- prometheus_client Python library docs (https://github.com/prometheus/client_python) — Gauge/Counter, `start_http_server`, `.labels().set()`
- Prometheus PromQL docs — `avg_over_time` and range vectors
- Prometheus Alerting Rules docs — group/rule schema, `{{ $labels.x }}` and `{{ $value }}` templating

## Issues Found
No technical issues found.

## Review Notes
- `ICMP type 3 (time exceeded)` is correct in this IPv6/SRv6 context (ICMPv6 type 3 = Time Exceeded per RFC 4443). Note that in IPv4 ICMP, type 11 is Time Exceeded and type 3 is Destination Unreachable — readers unfamiliar with the distinction may want to keep that in mind, but the post is in IPv6 context throughout, so the labeling is accurate.
- `ping6` is the legacy iputils binary; on newer distributions it is a symlink/wrapper around `ping -6`. Either form works; the post's usage is correct.
- The `Counter` import in the Python exporter is unused (only `Gauge` is used). This is a minor style nit, not a correctness issue, so left as-is per the "only fix technical errors" guidance.
- The `traceroute6 -s 5f00:1:1::1 ...` example assumes the source SID is configured on a local interface; readers should adjust to their own source address. The syntax itself is valid.
- SRv6 SIDs are written in the locator:function form (e.g. `5f00:1:2:0:e001::` with locator `5f00:1:2:0::/64` and function `e001`), which is consistent with common Cisco/Linux SRv6 deployments.
