# Validation Summary: How to Monitor IPv4 Network Health with Uptime Monitoring Tools

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus Blackbox Exporter (ICMP, TCP, HTTP modules)
- Prometheus scrape configuration with relabel_configs
- Alertmanager / Prometheus alerting rules
- Bash / shell scripting with `ping` and `curl`
- Uptime Kuma (self-hosted uptime monitor) via Docker
- IPv4 network health metrics (RTT, packet loss, HTTP latency)

## Sources Consulted
- Prometheus Blackbox Exporter documentation and CONFIGURATION.md (https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md) — verified module config keys (`prober`, `timeout`, `preferred_ip_protocol`, `valid_status_codes`, `follow_redirects`)
- Prometheus documentation on scrape_configs and relabel_configs (https://prometheus.io/docs/prometheus/latest/configuration/configuration/) — verified the standard `__address__` / `__param_target` / `instance` relabel pattern used with blackbox
- Prometheus alerting rule syntax (https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/) — verified `expr`, `for`, `labels`, `annotations` structure and template usage of `{{ $labels.instance }}` / `{{ $value }}`
- Blackbox exporter exported metrics (`probe_success`, `probe_duration_seconds`) — confirmed both metrics exist and behavior matches usage
- Linux iputils `ping(8)` man page — confirmed `-c` (count) and `-W` (timeout in seconds on Linux) flags
- Uptime Kuma official README / Docker run instructions (https://github.com/louislam/uptime-kuma) — verified the `docker run` command, image tag `louislam/uptime-kuma:1`, default port 3001, and the supported monitor types (Ping, TCP, HTTP, DNS)

## Issues Found
No technical issues found.

## Review Notes
- The HighLatency alert uses `probe_duration_seconds` rather than the more granular `probe_icmp_duration_seconds{phase="rtt"}`. Both work; the latter would isolate just the round-trip-time phase if the author wanted finer fidelity in the future.
- `ping -W 2` interprets the value as seconds on Linux (iputils). On macOS/BSD `-W` is in milliseconds, so the script would behave differently there. The post's gateway/router/IPv4 framing implies a Linux operator, but a portability note could be helpful.
- The HTTP blackbox module example uses `valid_status_codes: [200, 204]`. This is correct, but note that omitting the field would default to accepting any 2xx response — fine either way.
- Uptime Kuma 2.x is in active development; the post pins the stable `1` tag, which is currently the recommended production tag.
