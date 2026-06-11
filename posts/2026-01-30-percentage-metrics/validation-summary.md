# Validation Summary: How to Build Percentage Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js (`os` module: `os.cpus()`, `os.totalmem()`, `os.freemem()`)
- TypeScript
- Linux `df` command (disk utilization parsing)
- OpenTelemetry JS SDK (`@opentelemetry/sdk-metrics`, `@opentelemetry/exporter-metrics-otlp-http`, `@opentelemetry/resources`, `@opentelemetry/semantic-conventions`)
- Prometheus alerting rules (YAML)
- Grafana dashboard JSON (gauge, timeseries, stat panels)
- Mermaid diagrams (flowchart, xychart-beta)
- SRE concepts: utilization, saturation, availability, error rate, SLO "nines"

## Sources Consulted
- Node.js `os` module documentation: https://nodejs.org/api/os.html (verified `cpus()` returns `times: { user, nice, sys, idle, irq }`, plus `totalmem()`/`freemem()` return bytes)
- OpenTelemetry JS SDK metrics docs: https://opentelemetry.io/docs/languages/js/instrumentation/ and https://github.com/open-telemetry/opentelemetry-js (verified `MeterProvider` accepts `readers` in newer versions, `createObservableGauge().addCallback()` API, `OTLPMetricExporter` HTTP path `/v1/metrics`)
- OpenTelemetry Semantic Conventions for system metrics: https://opentelemetry.io/docs/specs/semconv/system/system-metrics/ (verified `system.cpu.utilization`, `system.memory.utilization` names)
- Prometheus alerting rule syntax: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Grafana panel/threshold configuration: https://grafana.com/docs/grafana/latest/panels-visualizations/
- Linux `df` manpage: confirmed `-k` produces 1K-block output with columns `Filesystem 1K-blocks Used Available Use% Mounted on`
- SLA/availability "nines" reference tables (e.g. uptime.is convention using 30.44-day average month)
- Mermaid flowchart and xychart-beta syntax: https://mermaid.js.org/syntax/

## Issues Found

1. **Inconsistent percentage scale between custom code and Prometheus/Grafana examples.**
   - The custom TypeScript code stores percentage values as `0–100` (with OTel `unit: '%'`), and the Prometheus alerts for disk, DB pool, and success rate also use `0–100` thresholds (e.g. `disk_utilization_percent > 85`, `db_pool_saturation > 90`, `http_request_success_rate < 99`).
   - However, the CPU and memory alerts used `> 0.85`, `> 0.95`, `> 0.90`, which implicitly treats those metrics as `0–1` ratios — inconsistent with the rest of the post and with the values produced by the example code.
   - The Grafana panels for CPU and Memory used `avg(system_cpu_utilization) * 100` and `system_memory_utilization * 100`, also treating the metric as `0–1`. Combined with the panel's `max: 100`, this would render a value of 70% as 7000.
   - **Fix:** Aligned both the CPU and memory Prometheus alert thresholds to `0–100` (`> 85`, `> 95`, `> 90`), removed the stray `* 100` in the Grafana CPU and Memory targets, and replaced `humanizePercentage` (which expects a `0–1` ratio) with a plain `{{ $value }}%` template in the CPU alert description so the rendered value stays correct under the `0–100` convention.

## Review Notes

- **OpenTelemetry semantic-conventions / Resource API:** The post uses `SemanticResourceAttributes.SERVICE_NAME` / `SERVICE_VERSION` and `new Resource({...})`. Both are valid in `@opentelemetry/semantic-conventions` `1.x` and `@opentelemetry/resources` `1.x`, which are still widely deployed. In the newer `2.x` line, `SemanticResourceAttributes` is replaced by `ATTR_SERVICE_NAME` / `ATTR_SERVICE_VERSION` exports and `new Resource(...)` is superseded by `resourceFromAttributes(...)`. Code as written will compile and run against current `1.x`; readers on `2.x` will see deprecation warnings. Not changed because both styles are technically correct against their respective SDK majors.
- **OTel semantic convention vs `unit: '%'`:** Per the OTel spec, `system.cpu.utilization` and `system.memory.utilization` are defined as ratios with unit `1` (i.e. `0–1`). The post intentionally redefines them as `0–100` percentages with `unit: '%'` to fit its theme. This is a valid choice for a custom metric but means readers should not assume the values will line up with OTel auto-instrumentation — flagged here as a caveat rather than fixed, since the post is explicit about its convention via the `unit: '%'` field and now the alerts/dashboard match it.
- **Nines table:** Numbers are consistent with the conventional 30.44-day month / 365.25-day year except the `99%` monthly figure (`7.2 hours`), which assumes a 30-day month; using 30.44 days it would be ~`7.3 hours`. Within standard tolerance for these tables; left as-is.
- **`MeterProvider` `readers` option:** Available in current `@opentelemetry/sdk-metrics` releases. Older `0.x` builds required `addMetricReader()` after construction — not a concern for current installs.
- **Mermaid second diagram (`Saturation` flowchart):** The edges `Q --> Resource Pool` and `Resource Pool --> Done` reference a subgraph ID that contains a space. Modern Mermaid versions parse this, but some parsers may not. Cosmetic/rendering concern only; left as-is.
- **`MonitoredThreadPool.executeTask`:** When a task finishes and a queued task is promoted, the code increments `activeCount` but does not actually invoke the next task. As a teaching snippet about saturation metrics this is OK, but readers building a real pool will need to add the dequeue/execute step.
- **Grafana success-rate query:** References a `status` label on `http_request_count`, which the OTel example counter does not emit (it only attaches `http.route`). The Grafana JSON is illustrative of a general Prometheus query and was left unchanged.
