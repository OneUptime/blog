# Validation Summary: Monitoring WireGuard Request/Response Performance in Cilium

## Status
validated

## Post Type
Tutorial / monitoring guide

## Technologies Covered
- Cilium
- Kubernetes CronJob
- WireGuard transparent encryption
- Hubble CLI and Hubble metrics
- Prometheus, Pushgateway, and PrometheusRule
- Grafana dashboards
- netperf TCP_RR benchmarks

## Sources Consulted
- Cilium WireGuard Transparent Encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption-wireguard/
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/stable/observability/hubble/hubble-cli/
- Prometheus Pushgateway documentation: https://prometheus.io/docs/instrumenting/pushing/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Netperf manual, TCP_RR request/response documentation: https://hewlettpackard.github.io/netperf/doc/netperf.html

## Issues Found
- The post described Hubble TCP/flow metrics as latency metrics. Cilium documents the `tcp` Hubble metric as TCP flag counts and the `flow` metric as processed flow counts, so the section was corrected to describe Hubble as flow visibility rather than request/response latency measurement.
- The Hubble command attempted to select `.Type == "L3_L4"` and treat `.time` as connection duration. Hubble flow JSON timestamps are event times, not duration values, so the command was changed to observe encrypted TCP flows and print timestamp/verdict fields.
- The netperf CronJob extracted the first field from the TCP_RR output. TCP_RR reports transaction rate as the final output field, so the command now suppresses banners with `-P 0` and extracts `$NF`.
- The prerequisites omitted the required `netserver` endpoint used by the CronJob. Added a prerequisite for a `netserver` exposed as `netperf-server.monitoring`.
- The Grafana dashboard referenced `cilium_wireguard_peers` as "WireGuard Peer Handshake Latency"; this is not a documented Cilium metric and peer count would not represent latency. Replaced it with the documented `hubble_tcp_flags_total` metric.
- The overview and node dashboard recommendations implied built-in Cilium/Hubble latency percentiles. Updated those bullets to refer to synthetic or application latency measurements.
- The shell checklist used `echo "\n..."`, which is not portable across shells. Replaced those lines with `printf`.
- The description and conclusion overstated "crypto overhead" and Hubble latency tracking. Updated them to describe synthetic request/response tracking and encrypted flow visibility.

## Review Notes
Cilium can expose WireGuard encryption state and flow visibility, but attributing a portion of request/response latency specifically to WireGuard still requires comparing controlled encrypted and unencrypted baselines or using application-level instrumentation. Hubble is useful for production traffic context and encrypted flow filtering, but it is not a replacement for latency instrumentation.
