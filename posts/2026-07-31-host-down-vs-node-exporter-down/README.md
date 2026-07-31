# Host Down or Node Exporter Down? How to Distinguish Machine Failure from a Broken Scrape

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Node Exporter, Blackbox Exporter, Host Monitoring, Alerting, Incident Response

Description: Combine scrape health with independent network and service probes to separate an unreachable machine from an exporter or Prometheus configuration failure.

---

`up{job="node"} == 0` does not mean the machine is down. It means Prometheus attempted to scrape the configured Node Exporter endpoint and the scrape failed. The cause might be a dead host, a stopped exporter, a firewall, bad TLS credentials, an invalid metrics response, or a timeout.

Prometheus cannot infer machine power state from one failed HTTP request. Add independent observations, preserve a shared host identity, and name alerts for what they actually prove.

## Treat `up` as Scrape Health

Prometheus creates these series for each active target:

```text
up{job="node",instance="host:9100"} 1  # scrape succeeded
up{job="node",instance="host:9100"} 0  # scrape failed
```

The value `0` includes failures such as:

- connection refused;
- route or firewall failure;
- DNS failure;
- TLS handshake or authentication failure;
- scrape timeout;
- non-2xx HTTP response;
- response body or sample limit exceeded; or
- invalid exposition data.

Inspect the target's `lastError` in Prometheus's Targets page or `/api/v1/targets`. The error often separates transport, authentication, timeout, and parse failures immediately.

## Add Independent Probes

The official Blackbox Exporter supports HTTP, HTTPS, DNS, TCP, ICMP, and gRPC probes. Choose probes that use a different endpoint and, where possible, a different path through the system.

A useful minimum is:

- Node Exporter scrape on TCP 9100;
- one machine-reachability probe, such as ICMP or a TCP port provided by the host; and
- optionally a raw TCP 9100 probe to distinguish “port accepts connections” from “Prometheus can parse and authenticate the metrics response.”

ICMP alone is weak evidence because many networks block it while the host remains healthy. An SSH TCP probe is also incomplete if SSH is intentionally disabled. For critical machines, a management-controller, cloud-instance-health, or independent application probe provides a stronger failure domain.

## Give Every Signal the Same Host Label

The Node Exporter endpoint and probe target often have different `instance` labels. Add a canonical `host` label in service discovery. This example assumes the Blackbox Exporter has an `icmp` module configured and the permissions required to send ICMP probes:

```yaml
scrape_configs:
  - job_name: node
    static_configs:
      - targets: ["10.20.0.17:9100"]
        labels:
          host: "db-01"

  - job_name: host-icmp
    metrics_path: /probe
    params:
      module: [icmp]
    static_configs:
      - targets: ["10.20.0.17"]
        labels:
          host: "db-01"
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: "blackbox-exporter.monitoring.svc:9115"
```

For dynamic discovery, derive `host` from a stable node or inventory identifier, not by stripping ports from an arbitrary address in PromQL. Ensure each probe job produces at most one current series per `host`, or aggregate it deliberately before joining.

## Build an Evidence Matrix

With one reachability probe per host:

```promql
# Scrape fails, but the machine responds independently
(up{job="node"} == 0)
and on (host)
(probe_success{job="host-icmp"} == 1)
```

This supports an exporter-or-scrape-path diagnosis. It does not yet prove the exporter process is stopped.

```promql
# Both observations fail from this monitoring location
(up{job="node"} == 0)
and on (host)
(probe_success{job="host-icmp"} == 0)
```

This shows that the Node Exporter scrape and the selected host probe both failed from the monitoring location. It does not distinguish a powered-off host from a routing, firewall, DNS, or monitoring-site failure.

Add a TCP probe of port 9100 to refine the case:

| Node scrape | Host probe | TCP 9100 probe | Likely next investigation |
| --- | --- | --- | --- |
| success | success | success | healthy observations |
| failure | success | failure | exporter stopped, wrong bind address, or port policy |
| failure | success | success | TLS/auth, HTTP status, timeout, body limit, or parse failure |
| failure | failure | failure | host, route, segment, or probe-location failure |
| success | failure | success | chosen host probe is blocked or misconfigured |

The table suggests where to investigate; it is not a proof of root cause.

## Name Alerts for Observations

Use specific alert names:

```yaml
groups:
  - name: node-reachability
    rules:
      - alert: NodeExporterScrapeFailedHostReachable
        expr: |
          (up{job="node"} == 0)
          and on (host)
          (probe_success{job="host-icmp"} == 1)
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Node Exporter scrape failing on reachable host {{ $labels.host }}"

      - alert: HostUnreachableFromMonitoring
        expr: |
          (up{job="node"} == 0)
          and on (host)
          (probe_success{job="host-icmp"} == 0)
        for: 3m
        labels:
          severity: critical
        annotations:
          summary: "Host {{ $labels.host }} is unreachable from monitoring"
```

Allow slack for transient failures. Prometheus alerting guidance recommends avoiding pages for small blips. Choose `for` durations based on scrape interval, probe interval, and recovery objective.

If you also have a generic Node Exporter scrape-failure alert, inhibit that generic symptom for the same `host` when `HostUnreachableFromMonitoring` fires. The two example alerts above are mutually exclusive because they require different `probe_success` values. Keep the detailed exporter failure visible in the incident timeline or as a lower-severity alert rather than sending duplicate pages.

## Use More Than One Vantage for Critical Hosts

Two probes from the same Prometheus network can share the same failed router, firewall rule, or DNS resolver. Stronger evidence comes from:

- probe agents in separate failure domains;
- a cloud or hypervisor health signal;
- an out-of-band management controller;
- a service heartbeat observed elsewhere; or
- a second Prometheus in another network segment.

Label each with `vantage` and define the host-down policy explicitly. “All two approved vantages failed” is stronger than “one ICMP request failed.”

Do not combine values until missing telemetry has been handled. If one vantage's `probe_success` series is absent, that is unknown, not failure. Scrape each Blackbox Exporter's own `/metrics` endpoint, monitor that target's `up` series, and preserve coverage.

## Handle Targets That Leave Service Discovery

When a target is removed from service discovery, Prometheus stops scraping it and its `up` series becomes stale. Neither `up == 0` expression fires because there is no failed scrape series to return.

Compare active targets with an independent expected-host inventory:

```promql
expected_node_target == 1
unless on (host)
up{job="node"}
```

For faster and more precise target-membership checks, reconcile the authoritative inventory with `/api/v1/targets?state=active`. Plan intentional decommissioning as an inventory state change before removing the scrape target.

## Use a Focused Runbook

For a scrape failure:

1. Check the Prometheus target `lastError` and last scrape time.
2. Confirm the target remains active in service discovery.
3. Check host reachability from the Prometheus network.
4. Check whether TCP 9100 accepts connections.
5. Fetch `/metrics` using the same scheme, CA, client certificate, and authentication as Prometheus.
6. Check Node Exporter process, listener address, resource usage, and logs.
7. Review firewall, routing, DNS, TLS expiry, and recent configuration changes.
8. Check Prometheus sample, label, body-size, and timeout limits.
9. Use an independent infrastructure signal before declaring the machine down.

The operational goal is not to label the incident perfectly from one metric. It is to preserve enough independent evidence that responders choose the right path quickly.

## Official Documentation

- [Prometheus automatically generated `up` metric](https://prometheus.io/docs/concepts/jobs_instances/#automatically-generated-labels-and-time-series)
- [Prometheus Targets HTTP API and `lastError`](https://prometheus.io/docs/prometheus/latest/querying/api/#targets)
- [Prometheus Blackbox Exporter](https://github.com/prometheus/blackbox_exporter)
- [Prometheus multi-target exporter guide](https://prometheus.io/docs/guides/multi-target-exporter/)
- [Prometheus logical/set operators and vector matching](https://prometheus.io/docs/prometheus/latest/querying/operators/#logical-set-binary-operators)
- [Prometheus alerting best practices](https://prometheus.io/docs/practices/alerting/)
- [Prometheus alerting rule `for` behavior](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- [Alertmanager inhibition rules](https://prometheus.io/docs/alerting/latest/configuration/#inhibit_rule)
