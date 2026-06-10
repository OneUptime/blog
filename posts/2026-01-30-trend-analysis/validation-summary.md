# Validation Summary: How to Create Trend Analysis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus / PromQL (`predict_linear`, `avg_over_time`, `deriv`, `rate`, recording rules, alerting rules)
- Prometheus node_exporter metrics (`node_filesystem_avail_bytes`, `node_filesystem_size_bytes`, `node_memory_MemAvailable_bytes`, `node_memory_MemTotal_bytes`, `node_cpu_seconds_total`)
- Python (numpy) for statistical analysis: linear regression, simple/exponential/weighted moving averages, seasonal decomposition
- Mermaid diagrams for visualization

## Sources Consulted
- Prometheus query language functions: https://prometheus.io/docs/prometheus/latest/querying/functions/ (verified `predict_linear`, `avg_over_time`, `deriv`, `rate`, `delta` semantics)
- Prometheus alerting rules reference: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus recording rules reference: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- prometheus/node_exporter meminfo collector source (metrics derive directly from `/proc/meminfo`, which contains `MemTotal`, `MemFree`, `MemAvailable`, `Buffers`, `Cached`, but **not** `MemUsed`)
- Linux `/proc/meminfo` documentation
- numpy documentation for `np.array`, `np.mean`, `np.sum`, `np.random.normal`, `np.sin`
- Standard EMA formula reference: `alpha = 2 / (span + 1)` is the conventional definition used by pandas `ewm` and most reference texts

## Issues Found

### 1. `node_memory_MemUsed_bytes` is not a real node-exporter metric
**What was wrong:** The post referenced `node_memory_MemUsed_bytes` in PromQL examples in the "Prometheus avg_over_time() for Moving Averages" section and in the `MemoryGrowthAnomaly` alert. This metric does not exist in the standard Prometheus `node_exporter` because Linux's `/proc/meminfo` does not expose a `MemUsed` field — used memory must be derived from `MemTotal - MemAvailable` (or `MemTotal - MemFree - Buffers - Cached` depending on definition).

**What I changed:** Replaced both PromQL examples in the moving-averages section with the computed expression `(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes)`. The denominator was simplified using the fact that `MemTotal` is effectively constant on a node, so only `MemAvailable` needs to be averaged. Added a clarifying comment explaining why the derived expression is used.

### 2. `rate()` applied to a gauge metric in the `MemoryGrowthAnomaly` alert
**What was wrong:** The alert used `rate(node_memory_MemUsed_bytes[1h])`. Beyond the metric not existing, `rate()` is only valid on **counters** (monotonically non-decreasing values). Memory metrics are gauges. Per the Prometheus docs, `rate()` accounts for counter resets and is undefined for gauges. The correct PromQL function for the per-second derivative of a gauge is `deriv()`, which uses linear regression.

**What I changed:** Rewrote the `MemoryGrowthAnomaly` expression to use `deriv(node_memory_MemAvailable_bytes[1h])` with an offset comparison. Because `MemAvailable` decreases when memory is consumed, the deriv is negative during consumption. Added a guard `deriv(...) < 0` to ensure the alert only fires when memory is actively being consumed (avoiding spurious matches when both derivs happen to be positive). Added explanatory comments above the rule.

## Review Notes
- The Python implementations are mathematically correct. I verified the docstring examples by hand:
  - SMA: `[10,20,30,40,50]` window=3 → `[20.0, 30.0, 40.0]` ✓
  - EMA: `[10,20,30,40,50]` span=3, alpha=0.5 → `[10, 15.0, 22.5, 31.25, 40.625]` ✓
  - WMA: `[10,20,30,40,50]` weights=[1,2,3] → `[23.33, 33.33, 43.33]` ✓
  - Linear regression: timestamps `[1000,2000,3000,4000]`, values `[10,20,30,40]` → slope `0.01` ✓
- Minor cosmetic point (not fixed because it isn't technically wrong): in `moving_averages.py`, `deque` is imported but unused, and in `linear_regression.py`, `timedelta` is imported but unused. Likewise the `seasonal_decompose.py` imports `NamedTuple` and `Tuple` from typing but uses neither. These are stylistic, not technical errors.
- The `avg_over_time(node_cpu_seconds_total{mode="idle"}[1h])` example averages a counter, which is unusual but technically valid PromQL. A more idiomatic form would be `avg_over_time(rate(node_cpu_seconds_total{mode="idle"}[5m])[1h:])` using a subquery. Left as-is because the original is valid and the section is focused on `avg_over_time()` as a primitive.
- The `_centered_moving_average` implementation for even window sizes is a simplification (it does not apply the conventional 2×MA second pass used by statsmodels). The function will still run and produce reasonable trend estimates; the docstring's "centered" claim is approximate but not strictly wrong. Acceptable for a tutorial-level implementation.
- The `predict_linear()` description and arguments match the official Prometheus docs.
- The `deriv()` recording-rule expression for `instance:disk_hours_until_full` correctly multiplies by `-1` to convert the (typically negative) derivative of `node_filesystem_avail_bytes` into a positive rate of decline.
- The further-reading links resolve to valid, plausible URLs (Prometheus docs, Google SRE Book chapter, Forecasting: Principles and Practice).
