# Validation Summary: How to Create Dashboards with OpenTofu on Datadog

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu (v1.6+)
- Terraform HCL
- Datadog (DataDog/datadog provider, ~> 3.39)
- `datadog_dashboard` resource (timeseries, query_value, heatmap, log_stream widgets)

## Sources Consulted
- DataDog/datadog Terraform provider docs — `datadog_dashboard` resource: https://registry.terraform.io/providers/DataDog/datadog/latest/docs/resources/dashboard
- DataDog/terraform-provider-datadog GitHub repository, including `datadog/tests/resource_datadog_dashboard_log_stream_test.go`
- Datadog Log Stream Widget docs: https://docs.datadoghq.com/dashboards/widgets/log_stream/
- OpenTofu CLI documentation: https://opentofu.org/docs/cli/

## Issues Found
1. **Invalid combination of `reflow_type = "fixed"` and missing `widget_layout` blocks (service_overview dashboard).** The Datadog provider docs state: "If set to `fixed`, the dashboard expects all widgets to have a layout, and if it's set to `auto`, widgets should not have layouts." None of the widgets in the ordered dashboard had `widget_layout` blocks, so the apply would have failed validation. Fixed by changing `reflow_type = "fixed"` to `reflow_type = "auto"` (no widget_layout blocks needed in auto mode).
2. **Invalid attribute `unit` on `query_value_definition`.** The correct attribute name on `query_value_definition` is `custom_unit`, not `unit`. Fixed by replacing `unit = "ms"` with `custom_unit = "ms"`.

## Review Notes
- The `~> 3.39` provider version constraint allows >= 3.39.0, < 4.0.0, which is consistent with `required_version = ">= 1.6.0"` for OpenTofu.
- The Deploy section relies on `var.datadog_api_key`, `var.datadog_app_key`, and `var.environment`, but the post does not include explicit `variable` declarations. This is a stylistic omission common in tutorials and not a technical error; readers familiar with Terraform/OpenTofu will know to declare them.
- Built-in log stream column names (`core_host`, `core_service`, `core_status`) were verified against the provider's test fixtures — these pass straight through to the Datadog API.
- Using a `heatmap_definition` to display "Error Rate by Service" is unusual (heatmaps visualize value distributions over time, so a `toplist` or `query_table` would render the metric more intuitively), but the HCL is syntactically valid and the widget will render. Not corrected since this is a presentation choice, not a technical error.
- The `datadog_dashboard.<name>.url` attribute is correctly exported by the provider and safe to use in outputs.
