# Validation Summary: How to Create Datadog Dashboards with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Datadog Terraform Provider
- Datadog Dashboards
- Datadog Dashboard Lists
- Datadog dashboard template variables
- Datadog metric queries and dashboard functions

## Sources Consulted
- Datadog Terraform provider documentation: https://docs.datadoghq.com/integrations/terraform/
- DataDog Terraform provider `datadog_dashboard` resource documentation: https://registry.terraform.io/providers/DataDog/datadog/latest/docs/resources/dashboard
- DataDog Terraform provider `datadog_dashboard_list` resource documentation: https://registry.terraform.io/providers/DataDog/datadog/latest/docs/resources/dashboard_list
- DataDog Terraform provider generated docs source: https://github.com/DataDog/terraform-provider-datadog/blob/master/docs/resources/dashboard.md
- Datadog template variables documentation: https://docs.datadoghq.com/dashboards/template_variables/
- Datadog trace metrics documentation: https://docs.datadoghq.com/tracing/metrics/metrics_namespace/
- Datadog count function documentation: https://docs.datadoghq.com/dashboards/functions/count/
- Terraform language syntax documentation: https://developer.hashicorp.com/terraform/language/syntax/configuration

## Issues Found
- The provider version constraint used `~> 3.0`, while the current Datadog provider major version is 4.x. Updated it to `~> 4.0`.
- The variable declarations used semicolon-separated inline attributes, which is not valid Terraform native syntax. Expanded them into standard multi-line variable blocks.
- The P95 latency example used the legacy `trace.<SPAN_NAME>.duration...95p` style metric. Updated it to use the current APM latency distribution metric with `p95:trace.web.request{env:production} by {service}`.
- The "Active Hosts" query summed CPU user time rather than counting active host series. Updated it to `count_not_null(avg:system.cpu.user{*} by {host})`.
- The dashboard `tags` example included `env:production`, but the `datadog_dashboard` resource only supports team tags of the form `team:<name>`. Removed the unsupported dashboard tag.
- The template variable examples used the deprecated `default` argument. Updated them to use `defaults`.

## Review Notes
Terraform was not installed in the workspace, so local `terraform validate` could not be run. The examples were checked against the official Datadog provider generated schema and Datadog documentation.
