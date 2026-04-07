# How to Track Pool Uptime and Downtime (MTBF, MTTR) in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Monitoring, Metric, Storage

Description: Learn how to track Ceph pool uptime, downtime, MTBF, and MTTR using Prometheus metrics and alerting to measure storage reliability over time.

---

## Why MTBF and MTTR Matter for Ceph Pools

Mean Time Between Failures (MTBF) and Mean Time To Recovery (MTTR) are standard reliability metrics used to evaluate storage systems. In Ceph, a pool becomes unavailable when its placement groups (PGs) are in a degraded or inactive state. Tracking these metrics lets you understand how often pools fail and how quickly they recover.

## Identifying Pool Health Events with Prometheus

Ceph exposes pool and PG health via Prometheus through the built-in Ceph MGR module. The key metrics to watch are:

```text
ceph_health_status          # 0=OK, 1=WARN, 2=ERR
ceph_pg_active
ceph_pg_degraded
ceph_pg_peering
ceph_pool_degraded_ratio
```

Enable the Prometheus module if it is not already active:

```bash
ceph mgr module enable prometheus
```

Query pool-level degradation:

```bash
curl -s http://localhost:9283/metrics | grep ceph_pool_degraded
```

## Recording Downtime Events

Use Prometheus recording rules to track when a pool enters a degraded state. Add the following to your Prometheus rules file:

```yaml
groups:
  - name: ceph_pool_availability
    rules:
      - record: ceph_pool_is_degraded
        expr: ceph_pool_degraded_ratio > 0

      - record: ceph_pool_downtime_total_seconds
        expr: avg_over_time(ceph_pool_is_degraded[1h]) * 3600
```

This records the total seconds a pool has been degraded over rolling windows.

## Calculating MTBF and MTTR

With event data stored in Prometheus, you can derive MTBF and MTTR using PromQL. First, track state transitions using `changes()`:

```text
# Number of state transitions in the last 7 days (each incident has 2 transitions)
changes(ceph_pool_is_degraded[7d])

# MTTR: average recovery duration per incident (approximate)
avg_over_time(ceph_pool_is_degraded[7d]) * 7 * 24 * 3600
  / (changes(ceph_pool_is_degraded[7d]) / 2)
```

For a more precise calculation, use Prometheus alertmanager to record alert start and end times:

```yaml
- alert: CephPoolDegraded
  expr: ceph_pool_degraded_ratio > 0
  for: 2m
  labels:
    severity: warning
  annotations:
    summary: "Pool {{ $labels.name }} is degraded"
```

Alertmanager timestamps can be exported to a database to compute exact MTBF and MTTR values.

## Visualizing with Grafana

Import the Ceph dashboard (ID 2842) into Grafana, then add a custom panel using the recording rule defined earlier:

```text
avg_over_time(ceph_pool_is_degraded[1h]) * 60
```

This shows minutes of pool degradation within the last hour. Add threshold lines at 5 minutes (warning) and 30 minutes (critical) to quickly see SLA compliance.

## Automating Reports

Use a Python script to fetch Prometheus data and compute weekly MTBF/MTTR reports:

```python
import requests

PROMETHEUS = "http://localhost:9090"

def get_pool_failures(pool_name: str, duration: str = "7d") -> dict:
    query = f'changes(ceph_pool_is_degraded{{name="{pool_name}"}}[{duration}])'
    resp = requests.get(f"{PROMETHEUS}/api/v1/query", params={"query": query})
    data = resp.json()["data"]["result"]
    failures = float(data[0]["value"][1]) if data else 0

    downtime_query = f'avg_over_time(ceph_pool_is_degraded{{name="{pool_name}"}}[{duration}]) * {7 * 24 * 60}'
    resp2 = requests.get(f"{PROMETHEUS}/api/v1/query", params={"query": downtime_query})
    data2 = resp2.json()["data"]["result"]
    downtime_minutes = float(data2[0]["value"][1]) if data2 else 0

    total_minutes = 7 * 24 * 60
    mtbf = (total_minutes - downtime_minutes) / failures if failures > 0 else total_minutes
    mttr = downtime_minutes / failures if failures > 0 else 0

    return {"failures": failures, "mtbf_minutes": mtbf, "mttr_minutes": mttr}
```

## Summary

Tracking MTBF and MTTR for Ceph pools requires combining Prometheus metrics, recording rules, and alerting. By recording pool degradation events and computing average recovery durations, you gain measurable reliability benchmarks. Pair this with Grafana dashboards and automated reports to establish ongoing SLAs for your Ceph storage clusters.
