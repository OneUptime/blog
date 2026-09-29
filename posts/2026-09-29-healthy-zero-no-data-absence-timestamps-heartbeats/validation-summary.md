# Validation Summary: How to Distinguish Healthy Zero from Missing or Frozen Prometheus Metrics

## Status
validated

## Post Type
Technical guide containing four PromQL examples and operational monitoring guidance.

## Technologies Covered
- Prometheus instrumentation, scraping, and staleness
- PromQL absence, presence, timestamp, aggregation, and set operations
- Prometheus alerting rules and pending durations
- Prometheus Pushgateway and cached exporters
- Heartbeats, source freshness, and expected-target inventory

## Sources Consulted
- [Prometheus query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/): absence and presence functions, rate behavior, and timestamp functions.
- [Prometheus query operators](https://prometheus.io/docs/prometheus/latest/querying/operators/): comparison filtering, operator precedence, aggregation, and `unless on` matching.
- [Prometheus querying basics](https://prometheus.io/docs/prometheus/latest/querying/basics/): selectors, range syntax, lookback, and staleness.
- [Prometheus instrumentation guidance](https://prometheus.io/docs/practices/instrumentation/): default zero values, label cardinality, event timestamps, batch success metrics, and heartbeats.
- [Prometheus scrape configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/): `honor_timestamps` and `track_timestamps_staleness`.
- [Prometheus alerting rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/): active, pending, and firing states and the `for` clause.
- [Official Pushgateway README](https://github.com/prometheus/pushgateway#about-timestamps): retained metrics and scrape timestamps versus push time.
- [Prometheus PromQL implementation](https://raw.githubusercontent.com/prometheus/prometheus/main/promql/functions.go): rate handling when history is insufficient, including the start-timestamp exception in current development code.
- [Author profile](https://github.com/nawazdhandala): verified the linked GitHub profile and redirect.

## Issues Found
No technical issues found.

## Review Notes
- All four PromQL examples were checked against official syntax and semantics. No terminal commands or complete configuration snippets appear in the post. The README required no changes.
- The fixed-target absence expression returns an indicator only when its selected range has no samples; repeated zero values remain present. It checks the selected metric family collectively, rather than independently detecting every missing outcome label.
- The fleet expression correctly filters expected inventory values to 1 and removes identities with observed presence. Comparison binds before `unless`. Aggregating by `(cluster, instance)` matches the stated identity contract; those labels must identify targets consistently across both inputs. Detecting individual missing outcomes would require a correspondingly finer inventory.
- Both age expressions yield seconds relative to the query evaluation time. Sample timestamps and source-success timestamp values answer different freshness questions. A source timestamp gauge must contain Unix time in seconds.
- Instant selectors can stop returning series after staleness or lookback expiry, so sample age is not an indefinitely available outage timer. The post appropriately combines age checks with absence checks and distinguishes retained range history from current scrape health.
- Initialization, bounded labels, and heartbeat progress tied to the monitored work agree with instrumentation guidance. A future-valued heartbeat can produce a negative age, so an upper-age test alone cannot establish validity.
- Startup wording is appropriately conditional: a new counter may lack sufficient history. Ordinary rate calculation needs multiple observations; current development code also supports a single sample with suitable start-timestamp information. The post makes no incompatible universal sample-count claim.
- A ten-minute absence window followed by `for: 10m` typically fires roughly twenty minutes after the last sample, with evaluation scheduling affecting the exact transition. An already empty history can enter pending immediately; controlled testing remains appropriate.
- Independent expected state, explicit scaled-to-zero policy, and detection of inventory failure are sound operational requirements. The custom inventory and source timestamp metrics must be supplied by the deployment.
- The linked documentation and author URL resolve to the intended resources. No deprecated functions or incompatible version-specific assertions were identified.
- This was a documentation and source-code review; the queries were not executed against a live Prometheus instance, and the proposed failure scenarios were not run.
