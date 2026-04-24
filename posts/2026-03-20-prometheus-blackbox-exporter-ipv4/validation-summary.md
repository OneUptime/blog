# Validation Summary: How to Use Prometheus Blackbox Exporter for IPv4 Endpoint Monitoring

## Status
validated

## Post Type
Guide

## Technologies Covered
- Prometheus
- Prometheus Blackbox Exporter
- Prometheus scrape configuration
- Prometheus alerting rules
- Prometheus relabeling
- systemd
- HTTP
- TCP
- ICMP
- TLS/SSL certificate monitoring

## Sources Consulted
- Prometheus Blackbox Exporter README: https://github.com/prometheus/blackbox_exporter
- Prometheus Blackbox Exporter configuration reference: https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md
- Prometheus Blackbox Exporter releases: https://github.com/prometheus/blackbox_exporter/releases
- Prometheus guide: Understanding and using the multi-target exporter pattern: https://prometheus.io/docs/guides/multi-target-exporter/
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus alerting rules reference: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus template reference: https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- Prometheus releases: https://github.com/prometheus/prometheus/releases

## Issues Found
- The installation section pinned `blackbox_exporter` to `0.24.0`, which was outdated. I updated it to `0.28.0` based on the current official release listing.
- The systemd setup wrote `/etc/systemd/system/blackbox_exporter.service` using plain shell redirection, which would fail unless the whole shell was already running as root. I changed that command to `sudo tee`, added `sudo systemctl daemon-reload`, and stopped short of starting the service before the config file exists.
- The post said `preferred_ip_protocol: "ip4"` forces IPv4. The Blackbox Exporter configuration reference documents that `ip_protocol_fallback` defaults to `true`, so I added `ip_protocol_fallback: false` to the HTTP, HTTPS, TCP, and ICMP modules and corrected the conclusion accordingly.
- The Prometheus scrape examples did not actually use the `https_2xx` or `icmp` modules, even though the post claimed HTTPS certificate and ICMP monitoring. I added dedicated `blackbox_https` and `blackbox_icmp` scrape jobs so the guide now matches the stated scope.
- The HTTPS target example used a raw IP address while also relying on standard TLS verification. Blackbox Exporter documents separate hostname/SNI handling for IP-based probes, so I changed the example to a hostname-based HTTPS target for a correct certificate-monitoring example.

## Review Notes
- The corrected Blackbox Exporter module file was loaded successfully with a current `blackbox_exporter` `v0.28.0` binary during local validation.
- The corrected Prometheus scrape config and alert rules passed `promtool check config` and `promtool check rules` using Prometheus `v3.11.2`.
- ICMP probe privileges are still environment-dependent on Linux, as documented by Blackbox Exporter: root, `CAP_NET_RAW`, or a permitted `net.ipv4.ping_group_range` configuration is required.
