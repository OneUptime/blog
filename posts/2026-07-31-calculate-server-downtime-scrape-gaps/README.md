# How to Calculate Server Downtime Over a Time Window Without Misreading Short Scrape Gaps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, PromQL, Availability, Downtime, Blackbox Monitoring, SLO

Description: Estimate host unavailability from regularly sampled reachability state while reporting unknown telemetry separately from confirmed downtime.

---

Prometheus stores samples, not a continuous record of a server's power state. A failed Node Exporter scrape proves that one scrape failed. A missing sample proves even less. Multiplying failed scrapes by the scrape interval can estimate an observed outage only when the signal, cadence, and missing-data policy are explicit.

For an honest downtime report, keep three states:

```text
known reachable
known unreachable
unknown because monitoring data is missing
```

Never silently merge the third state into either of the first two.

## Do Not Use Node Exporter `up` as Server Downtime

Prometheus sets `up` to `1` when a target scrape succeeds and `0` when it fails. For a Node Exporter target, failure can mean:

- the server is unavailable;
- the exporter is stopped;
- TCP 9100 is blocked;
- TLS or authentication is wrong;
- the response is invalid or too large; or
- the scrape timed out.

Use an independently defined reachability signal such as a Blackbox Exporter probe. For important systems, combine multiple approved probes or infrastructure health sources. Name the derived state `host_reachable` only after documenting exactly which observations make it true.

## Define the Availability Contract

Before writing PromQL, specify:

- the thing being measured: machine, operating system, endpoint, or service;
- the probe location or locations;
- the successful response condition;
- scrape and rule-evaluation intervals;
- how many consecutive failures qualify as an outage;
- planned-maintenance treatment;
- what missing probe data means; and
- the report's time zone and window boundaries.

A TCP connection to SSH measures different availability from a successful application request. Neither is a universal definition of “server up.”

## Understand the Simple Ratio

For a regularly scraped `probe_success` gauge:

```promql
1 - avg_over_time(
  probe_success{job="host-probe",host="db-01"}[24h]
)
```

This calculates the fraction of **stored probe samples** equal to zero. If there is one evenly spaced sample every 30 seconds, an approximate number of unavailable seconds is:

```promql
24 * 60 * 60 *
(
  1 -
  avg_over_time(
    probe_success{job="host-probe",host="db-01"}[24h]
  )
)
```

Prometheus documents that `avg_over_time()` gives every stored sample equal weight even when samples are not evenly spaced. The result is therefore a sample ratio, not exact time integration. Missing samples are omitted rather than automatically counted as down.

## Report Coverage Beside the Estimate

For a 30-second scrape interval, a 24-hour window has roughly 2,880 expected samples:

```promql
count_over_time(
  probe_success{job="host-probe",host="db-01"}[24h]
)
/
2880
```

Range boundaries, restarts, and scheduling jitter can make the exact count differ slightly. Use this as a coverage diagnostic, not a brittle equality test.

Report:

```text
observed unavailable fraction
observed sample count
expected sample count
coverage fraction
```

If coverage is below the approved threshold, mark the downtime result incomplete. Do not divide only by observed samples and call the uncovered period healthy.

## Materialize a Regular State

For fleet reporting, maintain an inventory metric containing the expected number of selected probe series for each host, then define a reachability recording rule at a fixed interval:

```yaml
groups:
  - name: host-state
    interval: 30s
    rules:
      - record: host:reachable
        expr: |
          max by (host) (
            probe_success{job=~"host-icmp|host-tcp"}
          )
          and on (host)
          (
            count by (host) (
              probe_success{job=~"host-icmp|host-tcp"}
            )
            == on (host)
            expected_host_probe_count{probe_set="host-reachability"}
          )
```

This definition says a host is reachable when at least one selected probe succeeds, but produces no state when the number of observed probes differs from inventory. If your contract requires every probe, replace `max` with `min` but keep the completeness guard. PromQL aggregations operate only on present series: without the guard, a missing probe can make either aggregate misleading.

Estimate failed intervals over 24 hours from the stored recording-rule samples:

```promql
(
  count_over_time(host:reachable[24h])
  -
  sum_over_time(host:reachable[24h])
)
* 30
```

For a 0/1 gauge, subtracting the sum from the sample count makes each stored zero contribute one failed interval. Unlike a subquery over an instant selector, this does not repeat the last non-stale value across missing rule evaluations through Prometheus lookback. Report the number of materialized state samples as coverage:

```promql
count_over_time(
  host:reachable[24h]
)
```

Recording at a fixed cadence improves consistency; it does not turn unknown data into a known state.

## Count Only Qualified Outages When Needed

A single failed probe may be normal packet loss rather than an incident. If the operational definition requires two continuous minutes of failure, encode it in an alert:

```yaml
      - alert: HostUnreachableFromMonitoring
        expr: host:reachable == 0
        for: 2m
        labels:
          severity: critical
```

Prometheus creates and stores an `ALERTS` time series on rule evaluations while an alert is pending or firing. The firing series can support an approximation of qualified outage time:

```promql
count_over_time(
  ALERTS{
    alertname="HostUnreachableFromMonitoring",
    alertstate="firing",
    host="db-01"
  }[24h]
)
* 30
```

The multiplier must match the alert rule group's actual evaluation interval (30 seconds in this example). This measures time the alert was observed firing after the chosen qualification delay; it does not count the pending period. It is not exact incident duration, and Prometheus outages reduce coverage.

For audit-grade incident duration, persist state transitions or Alertmanager/incident events in an event system with explicit timestamps and reconciliation. Sampled metrics only locate each transition between the last successful and first failed observation, so each edge has uncertainty on the order of the observation interval.

## Separate Short Scrape Gaps

Use distinct telemetry:

```promql
# Probe explicitly reported failure
probe_success{job="host-probe"} == 0

# Prometheus could not scrape the probe exporter or probe endpoint
up{job="host-probe"} == 0

# Probe series has not existed for a fixed host in ten minutes
absent_over_time(
  probe_success{job="host-probe",host="db-01"}[10m]
)
```

The first can contribute to known unavailability under the defined contract. The second and third are monitoring unknowns unless another independent source confirms the host was down.

Do not use:

```promql
probe_success or vector(0)
```

That creates a zero without preserving the missing host's labels and makes absent telemetry look like a failed probe.

## Account for Target Removal

If service discovery removes a target, Prometheus marks its series stale and stops producing `up` or `probe_success` samples. A report based only on existing series then omits that host.

Maintain an expected-host inventory with validity intervals. At query time, report results only against hosts expected during the window, and flag expected hosts with no coverage. For historical accuracy, retain inventory changes or materialize an `expected_host` metric; the current inventory cannot reconstruct a host retired halfway through last month.

## Quantify the Error Budget Honestly

With a regular interval `s`, a simple failed-sample estimate is:

```text
estimated observed downtime = failed intervals × s
```

For each outage, the actual start and end fall between observations. The estimate's transition uncertainty is roughly bounded by the surrounding intervals when sampling is regular and complete. Scrape jitter, missing samples, stale lookback, and qualification delays increase that uncertainty.

Publish:

- the reachability definition;
- approximate unavailable seconds;
- unknown seconds or coverage;
- number of qualified outage events;
- scrape and evaluation intervals; and
- exclusions such as planned maintenance.

“0 seconds observed unavailable at 63% coverage” is not 100% availability.

## Official Documentation

- [Prometheus automatically generated `up` series](https://prometheus.io/docs/concepts/jobs_instances/#automatically-generated-labels-and-time-series)
- [Prometheus `avg_over_time()`, `sum_over_time()`, and `count_over_time()`](https://prometheus.io/docs/prometheus/latest/querying/functions/#aggregation_over_time)
- [Prometheus range vector selectors](https://prometheus.io/docs/prometheus/latest/querying/basics/#range-vector-selectors)
- [Prometheus staleness and lookback behavior](https://prometheus.io/docs/prometheus/latest/querying/basics/#staleness)
- [Prometheus alerting rule `for` behavior and `ALERTS` series](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- [Prometheus Blackbox Exporter](https://github.com/prometheus/blackbox_exporter)
- [Prometheus alerting best practices](https://prometheus.io/docs/practices/alerting/)
- [Prometheus recording rules](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
