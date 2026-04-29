# Validation Summary: How to Set Up IPv6 Uptime Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 uptime monitoring
- OneUptime
- Prometheus
- Prometheus Blackbox Exporter
- PromQL
- curl
- External uptime monitoring services

## Sources Consulted
- OneUptime Website Monitor docs — https://oneuptime.com/docs/monitor/website-monitor
- OneUptime Ping Monitor docs — https://oneuptime.com/docs/monitor/ping-monitor
- OneUptime IP Monitor docs — https://oneuptime.com/docs/monitor/ip-monitor
- Prometheus guide: Understanding and using the multi-target exporter pattern — https://prometheus.io/docs/guides/multi-target-exporter/
- Prometheus query operators reference — https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus Blackbox Exporter configuration reference — https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md
- curl man page — https://curl.se/docs/manpage.html
- Better Stack Uptime monitor docs — https://betterstack.com/docs/uptime/uptime-monitor/
- Better Stack Uptime API monitor update docs — https://betterstack.com/docs/uptime/api/update-an-existing-monitor/
- Better Stack rebrand announcement — https://betterstack.com/press/introducing-better-stack/
- UptimeRobot IPv6 support announcement — https://uptimerobot.com/blog/new-features-bulk-actions-ipv6-support/
- UptimeRobot monitoring interval docs — https://help.uptimerobot.com/en/articles/11360876-what-is-a-monitoring-interval

## Issues Found
1. **The OneUptime setup steps mixed monitor types and input formats.** The original text paired "Website Monitor or Ping Monitor" with a URL-only input example, but OneUptime's docs separate Website monitors (URL input) from Ping/IP monitors (hostname or IP input). Updated the steps to distinguish Website vs. Ping/IP monitoring and corrected the UI action to **Create Monitor**.

2. **The OneUptime DNS-resolution claim was too specific and not supported by the official docs.** The post said OneUptime uses the "first A or AAAA record returned" for DNS-based endpoints. Replaced that with a documented, accurate recommendation: use a literal IPv6 URL or monitor the IPv6 address directly to verify IPv6 explicitly.

3. **The Blackbox Exporter scrape target implied the exporter itself had to be reached over IPv6.** The `replacement: "[::1]:9115"` example is unnecessary for IPv6 endpoint monitoring and is less portable than the official multi-target exporter pattern. Updated it to `127.0.0.1:9115`; the target IP family is controlled by `preferred_ip_protocol` and `ip_protocol_fallback` in the Blackbox module.

4. **The PromQL dual-stack comparison example would not match correctly as written.** The original query used `AND`, used `instance="www.example.com"` even though the earlier relabeling makes `instance` equal to the full target URL, and omitted vector matching for the differing `job` labels. Updated the query to use lowercase `and`, `on(instance)`, and the correct `instance` label value.

5. **The external-service section contained outdated and plan-dependent guidance.** "Better Uptime" is now Better Stack Uptime, and a fixed 1-minute interval is not universally available across plans and vendors. Updated the section to use the current product name, note IPv6 selection where supported, and recommend choosing the shortest interval the plan supports.

## Review Notes
- The shell script is technically valid, and `curl -6`, `--max-time`, and `-w "%{http_code}"` are current options. It assumes a working `mail` command is installed and configured on the host.
- The Blackbox Exporter module settings `preferred_ip_protocol: "ip6"` and `ip_protocol_fallback: false` are current and correctly force IPv6-only probing.
- The example IPv6 addresses use the documentation prefix `2001:db8::/32`, which is appropriate for examples.
