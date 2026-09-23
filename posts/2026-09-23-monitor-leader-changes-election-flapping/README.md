# How to Monitor Leader Changes and Diagnose Election Flapping

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Patroni, PostgreSQL, Prometheus, Monitoring

Description: Correlate Patroni role changes with election history, coordination failures, and client impact without treating sampled metrics as a complete event log.

---

Repeated leader changes can turn a brief infrastructure problem into recurring application outages. The diagnosis needs three timelines: authority changes, the conditions that triggered them, and the interruptions experienced by clients.

This example uses Patroni's Prometheus endpoint. Adapt the metric names and semantics for another election implementation instead of assuming every leader gauge behaves identically.

## Scrape members individually

Scrape every Patroni member's `/metrics` endpoint directly. A single load-balanced scrape address can hide a failed node and mix multiple members' histories. Add stable environment and cluster labels so two clusters with the same Patroni scope are not aggregated together.

Patroni documents metrics such as `patroni_primary`, `patroni_postgres_running`, `patroni_postmaster_start_time`, `patroni_timeline`, and `patroni_dcs_last_seen` in its [REST API reference](https://patroni.readthedocs.io/en/latest/rest_api.html). Inspect the actual endpoint and deployed version before installing rules.

Count observed primary roles:

```promql
sum by (environment, cluster, scope) (
  patroni_primary{job="patroni"}
)
```

The expected value is one for an ordinary active cluster. A deliberately configured standby cluster has a different role model and must use its own expectations. Duplicate scrape paths also distort this sum; deduplicate collection before interpreting it.

## Separate no primary from no telemetry

A role-count alert can catch observed values different from one:

```promql
sum by (environment, cluster, scope) (
  patroni_primary{job="patroni"}
) != 1
```

If every source series disappears, this expression returns no series, not a zero. Pair it with target availability and expected-member inventory. For a specific expected target, `up == 0` catches scrape failures; an inventory comparison or an explicit `absent_over_time` rule is needed when service discovery removes the target entirely.

For a known cluster:

```promql
absent_over_time(
  patroni_primary{job="patroni",cluster="payments-prod"}[2m]
)
```

[Prometheus documents absence and change functions](https://prometheus.io/docs/prometheus/latest/querying/functions/) with these distinct semantics. Set alert durations from the scrape interval and recovery objective. A sustained count above one needs immediate investigation, but a sampled gauge alone does not prove two nodes accepted conflicting writes.

## Detect churn without inventing an event count

Use observed changes as a diagnostic signal:

```promql
sum by (environment, cluster, scope) (
  changes(patroni_primary{job="patroni"}[15m])
)
```

A normal handover can produce a transition to zero on the old primary and a transition to one on the new primary. However, a scrape gap, process restart, replacement label set, or rapid transition between scrapes changes what is visible. Do not divide by two and present the result as the exact number of elections.

Keep event history alongside metrics:

```bash
patronictl -c /etc/patroni/patroni.yml history payments-prod
patronictl -c /etc/patroni/patroni.yml list payments-prod --extended
```

The [patronictl history command](https://patroni.readthedocs.io/en/latest/patronictl.html#patronictl-history) exposes recorded failover and switchover history. Retention, DCS availability, and log preservation determine how much evidence remains. Capture planned maintenance markers so intentional switchovers can be separated from unexpected churn.

## Correlate each transition with a cause

For each event, align clocks and gather DCS request failures, Patroni HA-loop delays, PostgreSQL restarts, replica lag, host pressure, and load-balancer changes. Read the logs on the previous leader and the replacement rather than only the currently healthy node.

| Observation | Next check |
| --- | --- |
| DCS access fails before demotion | Network path, quorum, latency, authentication |
| Postmaster start time changes | Crash logs, OOM events, operator restart activity |
| Patroni loop stalls | CPU starvation, storage waits, process pauses |
| Candidates repeatedly rejected | Lag threshold, timeline, tags, synchronization policy |
| Only client routes oscillate | Proxy checks, DNS caching, pooled sessions |

A cluster can have one stable database primary while a bad proxy configuration makes clients alternate between good and bad endpoints. Diagnose the authority and routing layers separately.

## Change the responsible control, then repeat the drill

Patroni's [dynamic configuration](https://patroni.readthedocs.io/en/latest/dynamic_configuration.html) requires `loop_wait + 2 * retry_timeout <= ttl` and documents the minimum values. Increasing the TTL can absorb transient delays but also delays some failure detection. It cannot repair a broken DCS quorum, missing fencing, or a repeatedly crashing database.

Use a representative staging drill to verify the proposed change. Measure completed client operations, interruption duration, stale-session failures, and replica recovery in addition to role transitions. A quieter leadership graph is useful only if the system still meets its recovery and data-integrity requirements.
