# Validation Summary: How to Create PagerDuty Services with Terraform

## Status
validated

## Post Type
Tutorial / Guide (Infrastructure-as-Code walkthrough)

## Technologies Covered
- Terraform (HCL)
- PagerDuty Terraform Provider (`PagerDuty/pagerduty` ~> 3.0)
- PagerDuty Services, Service Integrations, Service Event Rules, Service Dependencies
- PagerDuty vendor integrations (Amazon CloudWatch, Datadog, Events API v2)
- PagerDuty escalation policies and priorities (data sources)

## Sources Consulted
- PagerDuty Terraform provider docs: https://registry.terraform.io/providers/PagerDuty/pagerduty/latest/docs
- `pagerduty_service` resource: https://registry.terraform.io/providers/PagerDuty/pagerduty/latest/docs/resources/service
- `pagerduty_service_integration` resource: https://registry.terraform.io/providers/PagerDuty/pagerduty/latest/docs/resources/service_integration
- `pagerduty_service_event_rule` resource: https://registry.terraform.io/providers/PagerDuty/pagerduty/latest/docs/resources/service_event_rule
- `pagerduty_service_dependency` resource: https://registry.terraform.io/providers/PagerDuty/pagerduty/latest/docs/resources/service_dependency
- `pagerduty_vendor`, `pagerduty_priority`, `pagerduty_escalation_policy` data source docs
- PagerDuty provider GitHub releases: https://github.com/PagerDuty/terraform-provider-pagerduty/releases

## Issues Found
No technical issues found. All resource names, attribute names, block structures, and valid values were verified against the official provider documentation:

- `pagerduty_service` attributes (`acknowledgement_timeout` British spelling, `auto_resolve_timeout`, `alert_creation`, `escalation_policy`, `incident_urgency_rule`, `support_hours`) are correct.
- `incident_urgency_rule` with `type = "constant"` and `type = "use_support_hours"` (with nested `during_support_hours` / `outside_support_hours`) is valid.
- `support_hours` schema (`type = "fixed_time_per_day"`, `time_zone`, `start_time`, `end_time`, `days_of_week` 1–7) is valid.
- `pagerduty_service_integration` with `vendor` lookup or `type = "events_api_v2_inbound_integration"` is valid. Vendor name lookup is case-insensitive, so both `"Amazon CloudWatch"` and `"Datadog"` resolve correctly.
- `pagerduty_service_event_rule` schema (`conditions` → `subconditions` → `parameter`, `actions` → `suppress`/`severity`/`priority`) is correct. `summary` and `severity` are valid PD-CEF paths; severity value `"critical"` is valid.
- `pagerduty_service_dependency` `dependency` block with `dependent_service` and `supporting_service` (each with `id` and `type = "service"`) is correct.
- `pagerduty_priority` data source with `name = "P1"` matches the documented example.
- Provider version constraint `~> 3.0` is appropriate; the latest version as of mid-2026 is v3.32.x.

## Review Notes
- **`alert_creation` attribute is marked deprecated** in recent provider versions. The provider docs state: "all services will be migrated to use alerts and incidents." The attribute still works and `"create_alerts_and_incidents"` is the correct value (and is required for the `events_api_v2_inbound_integration` to function). Future revisions of this post may want to drop the attribute once it is fully removed.
- **`pagerduty_service_event_rule` is also deprecated** in favor of `pagerduty_event_orchestration_service` (Event Orchestrations). The resource still functions today but PagerDuty is moving customers to Event Orchestrations. A future revision of this post could swap the Service Event Rules section to use `pagerduty_event_orchestration_service` for forward-compatibility.
- The post correctly marks integration keys as `sensitive = true` in outputs, which is a good security practice.
- The `for_each` pattern shown in the "Multiple Services at Scale" section is idiomatic and works as written.
