# Validation Summary: How to Create Datadog SLOs with OpenTofu

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- Datadog Terraform provider (DataDog/datadog ~> 3.0)
- Datadog Service Level Objectives (metric-based and monitor-based)
- Datadog Monitors (metric alert, slo alert / burn rate)
- Datadog Dashboards (SLO widgets)
- Datadog APM metrics and query language

## Sources Consulted
- Datadog Terraform provider — `datadog_service_level_objective`: https://registry.terraform.io/providers/DataDog/datadog/latest/docs/resources/service_level_objective
- Datadog Terraform provider — `datadog_monitor`: https://registry.terraform.io/providers/DataDog/datadog/latest/docs/resources/monitor
- Datadog Terraform provider — `datadog_dashboard`: https://registry.terraform.io/providers/DataDog/datadog/latest/docs/resources/dashboard
- Datadog SLO burn rate alerts: https://docs.datadoghq.com/service_management/service_level_objectives/burn_rate/
- Datadog SLO monitor types: https://docs.datadoghq.com/monitors/types/slo/
- Datadog metric query syntax: https://docs.datadoghq.com/dashboards/querying/
- Datadog APM metrics namespace: https://docs.datadoghq.com/tracing/metrics/metrics_namespace/
- Datadog provider source: https://github.com/DataDog/terraform-provider-datadog

## Issues Found

1. **`thresholds` block on `datadog_monitor` resources** — In Datadog provider v3.x the attribute was renamed from `thresholds` to `monitor_thresholds` (renamed in v2.20.0; the old name is no longer valid in v3.x). Updated both `datadog_monitor.api_latency` and `datadog_monitor.slo_burn_rate` to use `monitor_thresholds { ... }`.

2. **Invalid time aggregator `percentile(last_5m)` in latency monitor query** — Datadog's metric query language only accepts `avg`, `sum`, `min`, `max`, `count`, `last` as time aggregations. Percentile (`p95`) is a space aggregation applied via the `p95:` prefix on a distribution metric. Changed `query = "percentile(last_5m):p95:trace.web.request{service:api} > 0.5"` to `query = "avg(last_5m):p95:trace.web.request{service:api} > 0.5"`.

3. **Incorrect dashboard widget block name `slo_widget_definition`** — The Datadog provider exposes the SLO summary widget as `service_level_objective_definition`, not `slo_widget_definition`. Replaced both occurrences inside the `datadog_dashboard.slo_overview` resource.

4. **Incomplete burn rate query on the SLO alert monitor** — A Datadog burn rate alert query requires both a long window and a short window in addition to the SLO time window. Changed `burn_rate("...").over("1h") > 14.4` to `burn_rate("...").over("30d").long_window("1h").short_window("5m") > 14.4`, where `over` is the SLO time window (30d) and the long/short windows are the alert evaluation windows. Also adjusted the inline comment accordingly.

## Review Notes
- The metric SLO `thresholds` block uses `target = 99.9` with `warning = 99.95`, which correctly satisfies Datadog's requirement that warning be greater than target.
- `trace.web.request` is used as a generic placeholder span name. In a real environment this should match the actual APM span (e.g., `trace.express.request`, `trace.rails.request`, `trace.aspnet_core.request`, etc.). Left as-is since the post is illustrative and the original author clearly used `web.request` as a stand-in name.
- The `for_each` example omits a `warning` threshold; this is valid (warning is optional in `datadog_service_level_objective.thresholds`).
- The burn rate threshold `14.4` corresponds to the standard SRE multi-window/multi-burn-rate alerting recipe (2% of a 30-day error budget consumed in 1 hour); the inline comment was preserved with a small clarification.
- The `datadog_service_level_objective.api_availability` resource has both 30d and 7d threshold blocks; this is supported but only the timeframes used in alerts/widgets need to be defined — keeping multiple is fine.
