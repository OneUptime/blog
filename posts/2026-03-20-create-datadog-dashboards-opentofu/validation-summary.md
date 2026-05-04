# Validation Summary: How to Create Datadog Dashboards with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform
- Datadog (dashboards, widgets, monitors)
- Datadog Terraform provider (`DataDog/datadog` ~> 3.0)
- HCL configuration language

## Sources Consulted
- [Datadog Terraform provider — datadog_dashboard resource docs (Terraform Registry)](https://registry.terraform.io/providers/DataDog/datadog/latest/docs/resources/dashboard)
- [DataDog/terraform-provider-datadog — dashboard.md (master)](https://raw.githubusercontent.com/DataDog/terraform-provider-datadog/master/docs/resources/dashboard.md)
- [DataDog/terraform-provider-datadog — examples/resources/datadog_dashboard/resource.tf](https://github.com/DataDog/terraform-provider-datadog/blob/master/examples/resources/datadog_dashboard/resource.tf)
- [Datadog Dashboards — Monitor Summary Widget docs](https://docs.datadoghq.com/dashboards/widgets/monitor_summary/)

## Issues Found
1. **Wrong widget block name for monitor summary widget.** The post used `monitor_summary_definition`, which does not exist in the Datadog Terraform provider schema. The correct block name for the Monitor Summary widget in the provider is `manage_status_definition`. Renamed the block accordingly; the inner fields (`title`, `query`, `summary_type`, `sort`) are valid as-is.
2. **`conditional_formats` was nested at the wrong level inside `query_value_definition`.** The provider schema places `conditional_formats` as a child block of `request`, not as a sibling of `request` directly under `query_value_definition`. As written, the example would have failed plan/apply with an "unsupported block" error. Moved both `conditional_formats` blocks inside the `request` block.

## Review Notes
- Provider version pin `~> 3.0` is current and appropriate at the time of review (the DataDog/datadog provider is on the 3.x major series).
- The `timeseries_definition` blocks (with `request`, `style { palette / line_type / line_width }`, and `yaxis`) match the documented schema.
- `template_variable` schema (`name`, `prefix`, `default`) is correct, and the use of `$env` / `$service` template-variable substitutions in the dashboard title and queries is supported.
- Tag filter syntax `tag:env:production` for the Manage Status widget query matches Datadog's documented monitor search syntax.
- `app.datadoghq.com` is the US1 site; readers on EU, US3, US5, AP1, or gov sites would need to adjust the dashboard URL host accordingly. Worth noting in a future revision but not technically incorrect for the default site.
- The security note about not hardcoding API/APP keys is good practice and aligns with Datadog's own provider guidance.
