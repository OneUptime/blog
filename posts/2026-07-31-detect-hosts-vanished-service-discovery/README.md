# How to Detect Hosts That Vanished from Service Discovery Before Their `up` Series Goes Stale

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Service Discovery, PromQL, Node Exporter, Target Monitoring, Alerting

Description: Compare authoritative target inventory with fresh `up` timestamps and the Prometheus Targets API to detect silent discovery removals.

---

An `up == 0` alert only works while Prometheus still has an active target to scrape. If service discovery removes a host, Prometheus does not keep attempting that scrape and setting `up` to zero. The old `up` series is marked stale and disappears from instant queries.

This creates a blind spot:

```text
target endpoint fails -> active target remains -> up becomes 0
target vanishes from discovery -> no scrape attempt -> up stops
```

Detect the second case by comparing Prometheus's active target set with an independently maintained desired target set.

## Do Not Derive Expectations from `up`

These expressions cannot enumerate vanished hosts:

```promql
up{job="node"} == 0
absent(up{job="node"})
absent_over_time(up{job="node"}[10m])
```

The first sees only active targets whose scrapes fail. The `absent` forms can say that an entire selection is empty, but they cannot invent one result for each missing host and its labels.

An expected set must come from elsewhere:

- a configuration-management database;
- cloud or virtualization inventory;
- Kubernetes Node objects;
- an approved static or file-based inventory;
- the source that generates service discovery; or
- a small inventory exporter scraped through an independent path.

The expectation must survive the failure being detected. Exporting it from the same disappearing target is not independent.

## Define a Desired-Target Metric

An inventory exporter can expose:

```text
expected_scrape_target{environment="prod",scrape_job="node",host="db-01",instance="10.20.0.17:9100"} 1
expected_scrape_target{environment="prod",scrape_job="node",host="db-02",instance="10.20.0.18:9100"} 1
```

Use stable identity labels. An `instance` address can change, so keep a durable `host` or node UID too. Include an environment or Prometheus ownership label where addresses can collide.

The basic comparison is:

```promql
expected_scrape_target{scrape_job="node"} == 1
unless on (environment, instance)
up{job="node"}
```

This fires after the old `up` series is no longer returned. It is sufficient for many fleets, but a stale or lookback-visible last sample can delay the comparison.

## Detect the Lack of Fresh Scrapes

`timestamp(up)` returns the timestamp of the last selected `up` sample. Active targets get a fresh `up` sample on every attempted scrape, even when the value is zero. A removed target stops getting fresh timestamps.

For a 30-second scrape interval:

```promql
expected_scrape_target{scrape_job="node"} == 1
unless on (environment, instance)
(
  time() - timestamp(up{job="node"}) < 90
)
```

The right-hand side contains targets with an `up` sample newer than 90 seconds. The `unless` returns expected targets without that fresh evidence. This can identify an aging last sample before a default lookback would otherwise stop returning it, and it works once a stale marker removes the series too.

Choose the freshness threshold from:

```text
scrape interval
+ scrape scheduling jitter
+ service-discovery refresh behavior
+ rule evaluation interval
```

Keep it above at least two intended scrape opportunities unless a faster detection objective and false-positive budget justify otherwise.

## Add a Rule Without Confusing It With Target Failure

```yaml
groups:
  - name: discovery-integrity
    rules:
      - alert: ExpectedNodeTargetMissingFromScrapePool
        expr: |
          expected_scrape_target{scrape_job="node"} == 1
          unless on (environment, instance)
          (
            time() - timestamp(up{job="node"}) < 90
          )
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Expected node target {{ $labels.host }} is not being scraped"
          description: "{{ $labels.instance }} has no fresh up sample in the node scrape pool."

      - alert: NodeTargetScrapeFailed
        expr: up{job="node"} == 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Node target {{ $labels.instance }} is active but failing"
```

The first alert preserves labels from the inventory metric. The second preserves labels from the active target. Route them to different runbook branches.

If the inventory metric itself is missing, neither comparison can work. Alert on the inventory exporter, its scrape, and an expected minimum inventory freshness or revision.

## Reconcile the Targets API for Immediate State

Prometheus exposes current discovery state at:

```text
GET /api/v1/targets
GET /api/v1/targets?state=active
GET /api/v1/targets?state=dropped
```

The response includes:

- active and dropped targets;
- labels after relabeling;
- original discovered labels;
- scrape pool;
- last scrape and error;
- health; and
- effective scrape interval and timeout.

An external reconciler can compare the authoritative inventory with `activeTargets` immediately after a discovery refresh. This is the most direct way to answer “is this identity currently in the scrape pool?” PromQL observes the effects through `up` samples and therefore has interval-related latency.

Protect the Prometheus API according to its security model and avoid polling it so aggressively that the monitor becomes a load source. Dropped targets may be bounded by `keep_dropped_targets`; absence from the dropped list does not prove a target was never discovered.

## Monitor the Discovery Mechanism

Target disappearance can be caused by:

- the source deleting an object;
- a selector or label changing;
- relabeling newly dropping the target;
- credentials losing access to part of the inventory;
- an HTTP SD endpoint returning an incomplete but valid list;
- a configuration reload changing the scrape job; or
- an operator intentionally draining the host.

Prometheus HTTP service discovery exposes `prometheus_sd_http_failures_total` for failed refreshes. A successful but incomplete response does not increment a failure counter, so identity reconciliation remains necessary.

File-based service discovery watches files for changes. HTTP service discovery polls at its configured refresh interval. Other mechanisms have their own refresh behavior. The fastest possible detection starts only after Prometheus or the external reconciler has received the changed target list.

## Handle Kubernetes Desired State

For a Kubernetes Node Exporter DaemonSet, the desired population is normally one exporter Pod for every eligible Node. Compare:

- eligible Kubernetes Node identities;
- DaemonSet desired, current, ready, and unavailable state;
- EndpointSlice endpoints selected for the exporter Service; and
- active Prometheus targets after relabeling.

Each layer answers a different question. A Node can be expected while no DaemonSet Pod exists; a Pod can exist while its endpoint is not ready; an endpoint can exist but be dropped by relabeling.

Use immutable Node UID or a stable node name as the join key when possible. IP-only joins can misattribute a recycled address.

## Make Decommissioning Two-Phase

Intentional retirement should not look like monitoring loss:

1. mark the target `maintenance` or `retiring` in authoritative inventory;
2. stop requiring it in `expected_scrape_target`;
3. verify alerts and workload dependencies are drained;
4. remove it from service discovery; and
5. retire the host identity after the audit window.

Keep status and validity timestamps in inventory. Simply deleting a row removes the evidence needed to explain why a target vanished.

## Test the Whole Detection Path

In a staging scrape pool:

1. stop Node Exporter but leave discovery unchanged; only the scrape-failed rule should fire;
2. restore it and remove the target from discovery; the missing-from-pool rule should fire;
3. change a relabel input so the target is dropped; inspect both active and dropped API results;
4. make the inventory exporter unavailable; the inventory-health alert should fire;
5. retire a host through the approved state transition; no unexpected-target alert should fire; and
6. measure total latency from source change through discovery refresh, scrape freshness threshold, rule interval, and `for`.

The target list itself is production state. Monitor its membership, not just the endpoints that remain in it.

## Official Documentation

- [Prometheus staleness behavior](https://prometheus.io/docs/prometheus/latest/querying/basics/#staleness)
- [Prometheus automatically generated `up` series](https://prometheus.io/docs/concepts/jobs_instances/#automatically-generated-labels-and-time-series)
- [Prometheus `timestamp()` function](https://prometheus.io/docs/prometheus/latest/querying/functions/#timestamp)
- [Prometheus logical/set operators and `unless`](https://prometheus.io/docs/prometheus/latest/querying/operators/#logical-set-binary-operators)
- [Prometheus Targets HTTP API](https://prometheus.io/docs/prometheus/latest/querying/api/#targets)
- [Prometheus HTTP service discovery](https://prometheus.io/docs/prometheus/latest/http_sd/)
- [Prometheus file-based service discovery guide](https://prometheus.io/docs/guides/file-sd/)
- [Kubernetes DaemonSet behavior](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/)
- [Kubernetes EndpointSlice conditions](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/#conditions)
