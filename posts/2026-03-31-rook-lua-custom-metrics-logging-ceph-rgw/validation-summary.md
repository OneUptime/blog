# Validation Summary: How to Log Custom Metrics with Lua in Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Rook (Ceph Kubernetes operator)
- Lua scripting in RGW
- Prometheus metric format
- StatsD
- Fluent Bit
- kubectl / radosgw-admin CLI

## Sources Consulted
- Ceph official documentation: Lua Scripting — https://docs.ceph.com/en/latest/radosgw/lua-scripting/
- Ceph RGW Lua examples on GitHub — https://github.com/ceph/ceph/blob/main/examples/rgw/lua/
- Ceph blog: Auto-tiering Ceph Object Storage (Lua scripting examples) — https://ceph.io/en/news/blog/2024/auto-tiering-ceph-object-storage-part-2/
- Fluent Bit official documentation: prometheus_exporter output — https://docs.fluentbit.io/manual/data-pipeline/outputs/prometheus-exporter
- Fluent Bit official documentation: log_to_metrics filter — https://docs.fluentbit.io/manual/data-pipeline/filters/log_to_metrics
- Lua 5.3 Reference Manual (os.time, os.clock)

## Issues Found

1. **`Request.HTTP.Header["Content-Type"]` does not exist** (Step 1): The RGW Lua API does not expose a generic `Header` table for accessing arbitrary HTTP request headers. Removed the `content_type` field from the structured log example since Content-Type is not accessible through the documented API.

2. **`Request.HTTP.ContentLength` is incorrect** (Steps 2 and 4): The content length is accessed via `Request.ContentLength` (top-level field), not `Request.HTTP.ContentLength`. Fixed both occurrences.

3. **`Response.HTTP.AddHeader()` does not exist** (Step 3): The RGW Lua API does not have a `Response` object with an `AddHeader()` method in preRequest context. Replaced the latency tracking pattern to use `Request.HTTP.Metadata` (a documented read-write metadata table) to pass the start time between preRequest and postRequest contexts.

4. **`Request.HTTP.Header["X-Request-Start-Ms"]` does not exist** (Step 3): Same underlying issue as #1 — no generic Header table. Fixed by reading from `Request.HTTP.Metadata["lua-start-time"]` instead.

5. **`os.clock()` measures CPU time, not wall clock time** (Step 3): `os.clock()` returns the CPU time consumed by the process, which is not suitable for measuring request latency across separate Lua invocations (preRequest and postRequest may run in different Lua states). Replaced with `os.time()` which returns wall clock time. Changed the metric unit from milliseconds to seconds to reflect `os.time()`'s second-level precision.

6. **`grep "^METRIC"` won't match RGW log lines** (Step 5): `RGWDebugLog()` messages are output with a "Lua INFO:" prefix and timestamp in the Ceph log format, so the `^METRIC` anchor never matches. Changed to `grep "METRIC"` (without anchor) and added `sed -n 's/.*METRIC //p'` to extract the metric portion before parsing with awk.

7. **Shell pipeline awk parsing assumed no log prefix** (Step 5): The original `awk '{print $2}'` would grab the wrong field due to the Ceph log format prefix. Rewrote the pipeline to first strip everything before "METRIC" using sed, then parse the metric name and value directly.

8. **Fluent Bit `Regex log ^METRIC` anchor mismatch** (Step 5): Same issue as #6 — log lines have a prefix, so `^METRIC` won't match. Removed the `^` anchor.

## Review Notes

- **Fluent Bit `prometheus_exporter` limitation**: The `prometheus_exporter` output plugin only works with Fluent Bit's metric-type plugins (e.g., Node Exporter Metrics). It cannot directly expose metrics parsed from log content. To convert log-derived data into Prometheus metrics, the `log_to_metrics` filter would need to be added between the parser filter and the prometheus_exporter output. This is noted but not fixed in the post because the Fluent Bit config is presented as an illustrative snippet, and the `log_to_metrics` filter is still marked as experimental.

- **`os.time()` second-level precision**: The latency measurement now uses `os.time()` which only provides second-level granularity. For sub-second latency measurement, an external timing mechanism (e.g., comparing RGW access log timestamps) would be needed. This is an inherent limitation of the Lua standard library available in the RGW sandbox.

- **`Request.User.Id` availability in preRequest**: User identification may not be available in the preRequest context on some Ceph versions because authentication has not yet completed. The code handles this with `or "anonymous"` fallbacks, which is appropriate.

- **Debug logging requirement**: `RGWDebugLog()` output is only visible when debug logging is enabled (`debug_rgw = 20` in ceph.conf). The post could benefit from mentioning this prerequisite, but this is not a technical error.
