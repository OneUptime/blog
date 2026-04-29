# Validation Summary: How to Monitor QUIC/HTTP3 Performance over IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- QUIC / HTTP/3 protocol
- IPv6
- curl (HTTP/3 client measurements via `--http3`, `-6`)
- Python `prometheus_client` library (Histogram, Counter, start_http_server)
- Prometheus / PromQL (`histogram_quantile`, `rate`)
- Grafana dashboard JSON
- Nginx `stub_status` module
- tcpdump BPF filters (`ip6 and udp port 443`)
- nload bandwidth monitor

## Sources Consulted
- curl manual / `curl --help all` output for `--http3`, `--http3-only`, `--write-out` variables (`%{time_appconnect}`, `%{time_total}`, `%{http_version}`, `%{http_code}`) — https://curl.se/docs/manpage.html
- prometheus_client Python library docs — https://prometheus.github.io/client_python/ (verified `start_http_server(port, addr=...)` signature and Histogram/Counter API)
- Prometheus PromQL `histogram_quantile` docs — https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile
- nload(1) man page — `-u` accepts a single-character unit code (`h|b|k|m|g|H|B|K|M|G`)
- Nginx `ngx_http_stub_status_module` docs — https://nginx.org/en/docs/http/ngx_http_stub_status_module.html
- tcpdump(8) man page / pcap-filter(7) for `ip6 and udp port 443` filter syntax
- RFC 9114 (HTTP/3) and RFC 9000 (QUIC) for protocol semantics (handshake / 0-RTT / 1-RTT, connection migration)

## Issues Found
- **nload unit flag was malformed.** The post had `nload -u Mbit eth0`. Per the nload man page, `-u` accepts a single-character argument from the set `h|b|k|m|g|H|B|K|M|G` (lowercase = bits/s, uppercase = bytes/s). `Mbit` is not a valid value and nload rejects it. Changed to `nload -u m eth0` (MBit/s), which matches the intent of the original line.

## Review Notes
- The Python exporter imports `Gauge` and `re` but does not use them. Not a correctness issue, just unused imports.
- `histogram_quantile(0.95, quic_handshake_duration_seconds_bucket)` works but is conventionally wrapped with `rate(...[5m])` to compute a quantile over a rolling window. The form shown computes a quantile across the cumulative histogram, which is valid but tends to be less useful operationally. Left as-is to avoid changing intent.
- `curl --http3` (without `--http3-only`) does fall back to earlier HTTP versions if the QUIC connection cannot be established, so the `version != "3"` downgrade detection in the Python script is correct.
- The Nginx section is honest that `stub_status` does not expose QUIC-specific counters and that those require Nginx Plus or a custom build — accurate as of the current open-source `stub_status` module.
- Mainline open-source Nginx has supported QUIC/HTTP/3 since 1.25.0 (May 2023); the post's framing of QUIC stats as Plus/custom-only is specifically about the *statistics endpoint*, not QUIC support itself, which is correct.
- `start_http_server(8000, addr="::")` correctly binds the Prometheus metrics endpoint to IPv6 (and dual-stack on most Linux systems).
