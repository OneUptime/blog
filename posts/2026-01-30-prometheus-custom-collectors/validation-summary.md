# Validation Summary: How to Build Prometheus Custom Collectors

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus (custom collectors via the `Collector` interface)
- Go (`prometheus/client_golang` library)
- Go `database/sql` package (specifically `DB.Stats()`)
- `promhttp` HTTP exposition handler

## Sources Consulted
- Prometheus Go client library docs: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus
  - `Collector` interface: `Describe(chan<- *Desc)` and `Collect(chan<- Metric)`
  - `NewDesc(fqName, help string, variableLabels []string, constLabels Labels) *Desc`
  - `MustNewConstMetric(desc *Desc, valueType ValueType, value float64, labelValues ...string) Metric`
  - `Labels` type alias for `map[string]string`
  - `GaugeValue`, `CounterValue` constants
- Go `database/sql` docs: https://pkg.go.dev/database/sql#DBStats
  - Fields verified: `OpenConnections` (int), `InUse` (int), `Idle` (int), `WaitCount` (int64), `WaitDuration` (time.Duration)
- `promhttp` docs: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus/promhttp#Handler
- Prometheus configuration docs: https://prometheus.io/docs/prometheus/latest/configuration/configuration/ (default `scrape_timeout` is 10s; configurable up to `scrape_interval`)

## Issues Found
No technical issues found.

The post accurately describes:
- The `Collector` interface and the contract between `Describe` and `Collect`.
- The `NewDesc` signature with the correct parameter order (name, help, variable labels, constant labels).
- The `MustNewConstMetric` signature including variadic label values appended after the value argument.
- The `sql.DBStats` field names and types — every field referenced (`OpenConnections`, `InUse`, `Idle`, `WaitCount`, `WaitDuration`) exists exactly as written, and `WaitDuration.Seconds()` is the correct way to convert the `time.Duration` to float seconds for a counter.
- The use of `GaugeValue` for instantaneous counts and `CounterValue` for cumulative metrics like `WaitCount` and `WaitDuration`.
- The `_total` suffix on counter metric names (`db_connections_wait_total`, `db_connections_wait_duration_seconds_total`) follows Prometheus naming conventions.
- Registration via `prometheus.MustRegister` and exposition via `promhttp.Handler()`.
- The collector pattern semantics (on-demand fetch at scrape time vs. event-driven state in `promauto`-style metrics).

## Review Notes
- The `main()` example omits driver import (`github.com/lib/pq` or similar) and standard library imports (`log`, `net/http`, `promhttp`). This is reasonable abbreviation for a tutorial code snippet, not an error.
- The "10–30 seconds" scrape timeout range is a reasonable guideline. The Prometheus default `scrape_timeout` is 10s, but operators often raise it for slower exporters, so the stated range is a fair characterization of common practice.
- The post correctly notes that variable labels passed to `NewDesc` must be matched 1:1 by trailing label values in `MustNewConstMetric` calls — the queue and business-metrics examples both demonstrate this correctly.
- The example does not call `prometheus.DescribeByCollect` (a common shortcut), but the manual `Describe` implementation shown is the canonical approach and is correct.
- Minor stylistic-only note (not an error): the `BusinessMetricsCollector` struct declares `activeUsers *prometheus.Desc` but the collector never emits a metric for it. This is illustrative truncation and does not affect technical accuracy.
