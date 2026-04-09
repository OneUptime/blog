# Validation Summary: How to Monitor Capacity Trends in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- Prometheus (metrics collection and alerting)
- Grafana (dashboard visualization)
- PromQL (Prometheus query language)
- kubectl (Kubernetes CLI)
- jq (JSON processor)

## Sources Consulted
- Ceph MGR Prometheus module documentation — metric names and types (gauge vs counter)
- Prometheus documentation on `rate()` vs `deriv()` — `rate()` is for counters, `deriv()` is for gauges
- Prometheus alerting template documentation — `humanizeDuration` expects values in seconds
- Ceph CLI documentation — `ceph df`, `ceph df detail`, `ceph osd df tree` commands
- Ceph JSON output format for `ceph df detail --format json` — `percent_used` field returns a 0.0-1.0 ratio

## Issues Found

### 1. `rate()` used on a gauge metric (Step 3, line 72)
- **What was wrong:** `rate(ceph_cluster_total_used_bytes[24h]) * 86400` used `rate()` on `ceph_cluster_total_used_bytes`, which is a gauge (it can decrease when data is deleted). `rate()` is designed for counters and misinterprets gauge decreases as counter resets.
- **What was changed:** Replaced `rate()` with `deriv()`, which performs linear regression on gauge values and correctly handles both increases and decreases.
- **Why:** Using `rate()` on a gauge produces incorrect results. The post already correctly uses `deriv()` in other queries (Steps 3, 4, and 5), making this inconsistent as well.

### 2. `humanizeDuration` applied to a value in days (Step 5, line 134)
- **What was wrong:** The alert annotation used `{{ $value | humanizeDuration }}`, but the expression returns a value in days (due to the `* 86400` in the denominator). `humanizeDuration` expects seconds, so a value of 25 (days) would display as "25s" instead of "25 days".
- **What was changed:** Replaced `{{ $value | humanizeDuration }}` with `{{ $value | printf "%.0f" }} days`.
- **Why:** The expression is designed to return days (for readable threshold comparisons like `< 30`), so the template must format accordingly.

### 3. `percent_used` ratio not converted to percentage (Step 6, line 157)
- **What was wrong:** The jq expression formatted `.stats.percent_used` directly with a "%" suffix, but `ceph df detail --format json` returns `percent_used` as a 0.0-1.0 ratio (e.g., 0.45 for 45% used). This would display "0.45%" instead of "45%".
- **What was changed:** Added `* 100` to convert the ratio to a percentage before formatting.
- **Why:** The raw JSON value is a ratio, not a percentage, despite the field name.

## Review Notes
- The Summary section mentions `predict_linear` as an alternative to `deriv`, but no example in the post uses `predict_linear`. This is not incorrect (it is a valid alternative), but readers may expect to see an example. Could be enhanced in a future update.
- The Grafana dashboard JSON is a simplified illustration — it omits required fields like `datasource`, `id`, and `gridPos` that would be needed in a real Grafana dashboard JSON model. This is acceptable for a tutorial but could confuse readers trying to import it directly.
- All five Ceph Prometheus metrics listed in the Key Capacity Metrics table are real and correctly described.
- All Ceph CLI commands are correct and current.
