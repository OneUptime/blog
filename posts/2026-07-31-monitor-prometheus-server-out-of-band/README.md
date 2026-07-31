# How to Monitor the Monitoring Server So Prometheus Failure Cannot Silence Host-Down Alerts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, High Availability, Alertmanager, Blackbox Exporter, Monitoring, Reliability

Description: Detect Prometheus and alert-pipeline failure from an independent path so a dead monitoring server cannot silently suppress host-down notifications.

---

A Prometheus server cannot evaluate its own alert rules while it is stopped. A self-scrape can tell you that Prometheus was healthy before it failed, but the `up{job="prometheus"}` alert stored on that same server will never fire after the process dies.

Monitoring must cross a failure boundary. At least one independent component must observe that Prometheus or its alert stream has stopped.

## Separate the Failure Paths

A resilient design has distinct responsibilities:

```text
Prometheus A ─┐
              ├─> Alertmanager cluster ─> notification provider
Prometheus B ─┘

External probe ─> independent alert path
Dead-man signal ─> external heartbeat receiver
```

The components need different enough failure domains to survive the incidents you care about:

- separate hosts or Kubernetes nodes;
- separate zones for critical environments;
- independent persistent volumes;
- no single reverse proxy or load balancer in every path;
- independent DNS and network path where practical;
- more than one notification destination for severe failures.

Two Pods on the same node and disk are two processes, not two failure domains.

## Run Redundant Prometheus Rule Evaluators

Prometheus's official FAQ recommends running identical Prometheus servers for high availability. Both scrape the same targets and evaluate the same rules. Configure distinct external replica labels if the data is sent to a system that can deduplicate replicas.

Each Prometheus should send alerts to every Alertmanager instance:

```yaml
alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager-1.example.net:9093
            - alertmanager-2.example.net:9093
            - alertmanager-3.example.net:9093
```

The Alertmanager HA documentation explicitly says to send alerts to all Alertmanager instances, not through a load balancer. Alertmanager clusters deduplicate notifications and prefer duplicate delivery over silence during a partition.

Alertmanager HA does not replace redundant Prometheus servers. Alertmanager routes alerts it receives; it does not scrape hosts or evaluate PromQL when the only Prometheus is dead.

## Have Each Prometheus Observe the Other

Prometheus B can scrape Prometheus A:

```yaml
scrape_configs:
  - job_name: prometheus-peer
    static_configs:
      - targets:
          - prometheus-a.example.net:9090
          - prometheus-b.example.net:9090
```

Then alert:

```yaml
- alert: PrometheusPeerDown
  expr: up{job="prometheus-peer"} == 0
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "Prometheus {{ $labels.instance }} is unreachable"
```

Do not have each server page on its own failed self-scrape only. Ensure the peer's alert is evaluated and routed from a surviving server.

Also monitor:

```promql
prometheus_config_last_reload_successful == 0
```

```promql
increase(prometheus_rule_evaluation_failures_total[10m]) > 0
```

```promql
increase(prometheus_rule_group_iterations_missed_total[10m]) > 0
```

```promql
rate(prometheus_notifications_errors_total[10m]) > 0
```

Verify metric names against the running Prometheus version's `/metrics` endpoint before shipping rules.

## Probe from Outside the Monitoring Stack

Run blackbox_exporter or another probe in a separate environment. Probe a meaningful endpoint:

- `/-/healthy` checks process health;
- `/-/ready` checks whether Prometheus is ready to serve traffic;
- a protected query endpoint can test the full HTTP and query path.

The multi-target exporter pattern exposes `probe_success`:

```promql
probe_success{
  job="blackbox-prometheus",
  instance="https://prometheus.example.net/-/ready"
} == 0
```

Place the prober and the Prometheus evaluating this expression outside the target's failure domain. If the same Prometheus under test scrapes the probe result, the design returns to self-monitoring.

For a private Prometheus, use a routed management network, VPN, or approved proxy. Do not expose its administrative API publicly merely to make probing easy.

## Add a Dead-Man Signal

A dead-man alert is always firing while the evaluation and delivery pipeline works:

```yaml
- alert: PrometheusDeadManSwitch
  expr: vector(1)
  labels:
    severity: heartbeat
  annotations:
    summary: "Prometheus alert pipeline heartbeat"
```

Route it to an external service that expects repeated notifications and alerts when they stop. The receiver must distinguish replicas, environment, and Prometheus identity.

This checks more of the pipeline:

1. rule evaluation;
2. Prometheus-to-Alertmanager delivery;
3. Alertmanager routing;
4. notification transport;
5. external receiver.

Set the receiver timeout longer than the normal repeat interval plus delivery jitter, but shorter than the monitoring outage objective.

Test silences and inhibition carefully. A broad silence that suppresses the heartbeat can make maintenance indistinguishable from failure. Give the heartbeat a dedicated route and policy.

## Monitor Target Discovery, Not Only Scrapes

Host-down alerts usually depend on:

```promql
up{job="node"} == 0
```

If a broken service-discovery integration removes a host entirely, its `up` series goes stale and the expression no longer returns that host.

Compare observed targets with an independent inventory:

```promql
count by (cluster) (up{job="node"})
```

versus an expected count or expected-host metric. Alert on:

- sudden target-count loss;
- a cluster missing from discovery;
- discovery refresh errors;
- expected identities absent from the observed set.

This protects against “the monitoring server is alive but blind.”

## Protect the Notification Layer

Run Alertmanager in its supported HA cluster mode. Monitor:

- cluster membership;
- failed peers;
- notification errors;
- queue and integration behavior;
- configuration reload success;
- reachability of every receiver.

Configure Prometheus servers to reach all Alertmanager instances directly. Use a tested secondary receiver for monitoring-stack failure, particularly if the primary provider shares identity, network, or cloud dependencies with production.

## Federation Is a View, Not Automatic HA

Prometheus federation lets one server scrape selected series from another. Hierarchical federation is useful for global views and cross-datacenter aggregation.

If an upstream federator is the only place that evaluates alerts, its failure can still silence them. Keep critical host and service alerts close to the targets on redundant local Prometheus servers, then federate aggregates for overview.

## Test Failure, Not Just Configuration

Run controlled exercises:

1. stop one Prometheus process;
2. isolate its network;
3. fail its storage;
4. stop one Alertmanager;
5. partition Alertmanager peers;
6. break the primary notification integration;
7. remove a host from service discovery without stopping it;
8. stop the dead-man signal;
9. verify notification source, timing, deduplication, and recovery.

Capture the measured detection and delivery time for each case.

## Minimum Production Pattern

For important host-down alerts:

- two Prometheus servers in different failure domains;
- both scrape targets and evaluate critical rules;
- both send to all members of an Alertmanager HA cluster;
- an external probe observes each Prometheus;
- a dead-man signal reaches an independent heartbeat receiver;
- expected-target inventory detects discovery loss;
- failure drills run regularly.

The objective is not an immortal monitoring server. It is a monitoring system whose failure becomes visible through another, independently delivered signal.

## Official Documentation

- [Prometheus FAQ: High availability](https://prometheus.io/docs/introduction/faq/#can-prometheus-be-made-highly-available)
- [Alertmanager: High availability](https://prometheus.io/docs/alerting/latest/high_availability/)
- [Prometheus: Multi-target exporter pattern](https://prometheus.io/docs/guides/multi-target-exporter/)
- [Prometheus: Federation](https://prometheus.io/docs/prometheus/latest/federation/)
- [Prometheus: Alerting rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
