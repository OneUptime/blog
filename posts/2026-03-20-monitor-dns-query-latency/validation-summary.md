# Validation Summary: How to Monitor DNS Query Latency and Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- `dig` (BIND DNS lookup utility)
- `getent` / NSS (glibc name service switch)
- `dnsperf` (DNS-OARC DNS performance testing tool)
- Prometheus + blackbox_exporter (DNS prober module)
- PromQL queries
- `systemd-resolved` / `resolvectl`
- Bash scripting

## Sources Consulted
- [Prometheus blackbox_exporter README](https://github.com/prometheus/blackbox_exporter/blob/master/README.md)
- [Prometheus blackbox_exporter DNS prober source (prober/dns.go)](https://github.com/prometheus/blackbox_exporter/blob/master/prober/dns.go) — confirmed all DNS metrics are gauges (no `_bucket` histograms)
- [dnsperf(1) Linux man page](https://linux.die.net/man/1/dnsperf)
- [dnsperf(1) Debian/Ubuntu manpages](https://manpages.debian.org/testing/dnsperf/dnsperf.1.en.html) — confirmed `-n` means "runs through file", not total queries
- [DNS-OARC dnsperf repository](https://github.com/DNSPerf/dnsperf)

## Issues Found

1. **Incorrect Prometheus P99 latency query.** The post used `histogram_quantile(0.99, rate(probe_dns_lookup_time_seconds_bucket[5m]))`. The blackbox_exporter does not expose any histogram metrics for DNS — every DNS-related metric (`probe_dns_duration_seconds`, `probe_dns_answer_rrs`, `probe_duration_seconds`, etc.) is a gauge, so there is no `_bucket` series and `histogram_quantile` cannot be applied. Replaced with `quantile_over_time(0.99, probe_duration_seconds{job="dns"}[5m])`, which is the correct way to derive a percentile from gauge samples scraped over time.

2. **Incorrect DNS failure-rate query.** The post used `rate(probe_success{job="dns"}[5m]) < 1`. `probe_success` is a 0/1 gauge (not a monotonically increasing counter), so `rate()` produces nonsensical per-second deltas. Replaced with `avg_over_time(probe_success{job="dns"}[5m]) < 1`, which is the standard pattern for detecting any failure within the window.

3. **Misleading `dnsperf -n` comment.** The post said "1000 queries, 10 concurrent" but `-n` in dnsperf means "run through the input file N times". With a 5-line query file and `-n 1000`, dnsperf actually issues 5000 queries. Updated the comment to reflect the actual behavior ("run through 5-query file 1000 times = 5000 queries, act as 10 clients").

## Review Notes

- The `dig`, `getent`, `dnsperf`, and `resolvectl statistics` commands are all syntactically correct and current.
- The blackbox_exporter `dns` prober configuration (`prober: dns`, `query_name`, `query_type`, `preferred_ip_protocol`) matches the documented module schema.
- The relabel_configs pattern for blackbox probing is the canonical one from the blackbox_exporter README.
- The continuous monitoring script's `grep "ANSWER:" | awk '{print $NF}'` extracts the value following `ADDITIONAL:` (the last field on the dig flags line) rather than the answer count. This is functionally suboptimal but not strictly broken — the script still records *something* useful per query — so it was left as-is per the "only fix what is technically wrong" guidance.
- The `dnsperf -t 30` (30-second per-query timeout) is unusually high but valid; the default is 5s.
- The "under 5ms cached / under 100ms uncached" thresholds in the conclusion are reasonable rules of thumb, though actual values depend heavily on geographic location and resolver configuration.
