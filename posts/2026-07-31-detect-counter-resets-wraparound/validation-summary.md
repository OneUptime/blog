# Validation Summary: How to Detect Counter Resets and Wraparound in High-Speed Network Infrastructure Metrics

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Prometheus
- PromQL
- Prometheus alerting rules
- Prometheus Node Exporter
- Linux network-interface statistics
- rtnetlink and `rtnl_link_stats64`
- ethtool
- SNMP interface counters

## Sources Consulted
- Prometheus query functions (`changes`, `clamp_min`, `increase`, `rate`, and `resets`): https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus querying basics (`offset`, range vectors, and staleness): https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus alerting rules: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus recording-rule best practices: https://prometheus.io/docs/practices/rules/
- Prometheus instrumentation practices: https://prometheus.io/docs/practices/instrumentation/
- Prometheus jobs and instances: https://prometheus.io/docs/concepts/jobs_instances/
- Linux kernel interface-statistics documentation: https://docs.kernel.org/networking/statistics.html
- Prometheus Node Exporter documentation: https://github.com/prometheus/node_exporter
- Prometheus Node Exporter Linux netdev collector source: https://github.com/prometheus/node_exporter/blob/master/collector/netdev_linux.go
- Prometheus Node Exporter netdev metric construction and legacy-name mapping: https://github.com/prometheus/node_exporter/blob/master/collector/netdev_common.go
- Prometheus Node Exporter Linux boot-time metric source: https://github.com/prometheus/node_exporter/blob/master/collector/stat_linux.go
- Prometheus Go client process collector (`process_start_time_seconds`): https://github.com/prometheus/client_golang/blob/main/prometheus/process_collector.go
- RFC 2863, The Interfaces Group MIB (`Counter64` high-capacity interface counters): https://www.rfc-editor.org/rfc/rfc2863.html

## Issues Found
No technical issues found.

## Review Notes
- The PromQL examples use current functions and valid selector, range-vector, aggregation, comparison, and `offset` syntax.
- Prometheus officially documents that `rate()` and `increase()` adjust for counter resets, that `resets()` counts decreases between consecutive float samples, and that rate must be calculated before aggregation.
- The alerting-rule fragment uses current fields and preserves the `instance` and `device` labels needed by its annotation template.
- The 32-bit octet-counter wrap calculations were independently checked: approximately 5.73 minutes at 100 Mb/s, 34.36 seconds at 1 Gb/s, 3.44 seconds at 10 Gb/s, and 0.344 seconds at 100 Gb/s.
- Linux documents rtnetlink as the preferred interface for `rtnl_link_stats64`, while `/proc/net/dev`, sysfs, and ethtool have the roles described in the post. The documented `ip -s -s link show dev eth0` and `ethtool -S eth0` commands are valid.
- RFC 2863 defines the SNMP high-capacity octet counters, including `ifHCInOctets` and `ifHCOutOctets`, as 64-bit counters.
- The `job="node"` matcher and `cluster` aggregation label are deployment-defined examples and must match the reader's Prometheus scrape configuration. This is an environment-specific caveat, not a technical error.
