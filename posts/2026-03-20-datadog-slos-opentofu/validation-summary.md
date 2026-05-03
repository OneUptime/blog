# Validation Summary: How to Create SLOs with OpenTofu on Datadog

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC)
- Datadog Service Level Objectives (SLOs)
- Datadog Terraform/OpenTofu provider (`DataDog/datadog`)
- Datadog monitors (metric alert and SLO alert types)
- Burn rate alerting

## Sources Consulted
- [Datadog provider — datadog_service_level_objective resource (Terraform Registry)](https://registry.terraform.io/providers/DataDog/datadog/latest/docs/resources/service_level_objective)
- [terraform-provider-datadog source for service_level_objective.html.markdown](https://github.com/hashicorp/terraform-provider-datadog/blob/master/website/docs/r/service_level_objective.html.markdown)
- [Datadog Burn Rate Alerts documentation](https://docs.datadoghq.com/service_level_objectives/burn_rate/)
- [Datadog SLO Alerts (monitor type)](https://docs.datadoghq.com/monitors/types/slo/)
- [DataDog/terraform-provider-datadog releases](https://github.com/DataDog/terraform-provider-datadog/releases)
- [DataDog/terraform-provider-datadog issue #1093 (burn rate threshold range)](https://github.com/DataDog/terraform-provider-datadog/issues/1093)

## Issues Found

### 1. Non-existent `datadog_slo_alert` resource (critical fix)
The "SLO Alert (Error Budget Burn Rate)" section used a `datadog_slo_alert` resource, which does not exist in the Datadog Terraform/OpenTofu provider. SLO burn rate alerts in Datadog are created using the standard `datadog_monitor` resource with `type = "slo alert"` and a `burn_rate(...)` query that references the SLO ID and embeds the long/short window and SLO timeframe.

The original block also used invalid arguments (`slo_id`, `slo_timeframe`, repeated `thresholds { timeframe / value }` blocks) that have no equivalent in the actual provider.

I replaced the entire resource with the correct `datadog_monitor` form:

```hcl
resource "datadog_monitor" "burn_rate_high" {
  type  = "slo alert"
  query = "burn_rate(\"${datadog_service_level_objective.api_availability.id}\").over(\"30d\").long_window(\"1h\").short_window(\"5m\") > 14.4"

  monitor_thresholds {
    critical = 14.4
  }
  ...
}
```

This matches the documented Datadog burn rate alert query format and uses `monitor_thresholds.critical` for the threshold, which is the supported pattern for `datadog_monitor`.

I also collapsed the two redundant `thresholds` blocks into the single `long_window`/`short_window` pair embedded in the query, which is how Datadog actually models a multi-window burn rate alert.

## Review Notes

- The metric SLO query negation syntax `!http.status_class:5xx` is valid Datadog query language (the `!` prefix is the documented exclusion operator).
- For a 99.9% SLO target, the maximum allowable burn rate threshold is `1 / (1 - 0.999) = 1000`, so the value `14.4` used in the post (the standard Google SRE "fast burn" recommendation for a 30-day SLO with 1h long window / 5m short window) is well within range. Note: for lower SLO targets (e.g., 90%), the max would be 10, so this same threshold would not be valid — readers should pick a burn rate appropriate to their target.
- Provider version constraint `~> 3.39` allows any 3.x ≥ 3.39. The latest provider release at the time of review is in the 4.x series (4.6.0, released 2026-04-23) which contains breaking changes; users adopting this post should be aware they may want to bump to `~> 4.0` and re-verify compatibility, but the pinned 3.x range is still functional and the resource shapes shown are unchanged in 4.x for SLOs.
- The `thresholds` block on `datadog_service_level_objective` correctly requires `warning` to be greater than `target` (e.g., target 99.9 / warning 99.95) — the post follows this rule.
- For monitor-based SLOs, the provider truncates `target`/`warning` to one decimal place server-side (a known long-standing quirk — see issue #780). Not changed, but worth flagging for readers using highly precise targets.
