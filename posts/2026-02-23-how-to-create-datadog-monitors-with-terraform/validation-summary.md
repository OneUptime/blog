# Validation Summary: How to Create Datadog Monitors with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Datadog Terraform provider
- Datadog monitors
- Datadog monitor queries
- Datadog downtime schedules

## Sources Consulted
- Datadog Terraform integration documentation: https://docs.datadoghq.com/integrations/terraform/
- Datadog monitor API documentation: https://docs.datadoghq.com/api/latest/monitors/
- Datadog Terraform provider `datadog_monitor` resource documentation: https://registry.terraform.io/providers/DataDog/datadog/latest/docs/resources/monitor
- Datadog Terraform provider `datadog_downtime` resource documentation: https://registry.terraform.io/providers/DataDog/datadog/latest/docs/resources/downtime
- Datadog Terraform provider `datadog_downtime_schedule` resource documentation: https://registry.terraform.io/providers/DataDog/datadog/latest/docs/resources/downtime_schedule
- Datadog trace metrics documentation: https://docs.datadoghq.com/tracing/metrics/metrics_namespace/
- Datadog metric monitor documentation: https://docs.datadoghq.com/monitors/types/metric/
- Datadog anomaly monitor documentation: https://docs.datadoghq.com/monitors/types/anomaly/

## Issues Found
- The provider version constraint used `~> 3.0`, while the current Datadog provider documentation is on the v4 provider line. Updated the example to `~> 4.0`.
- The APM latency monitor used a legacy duration percentile metric name. Updated it to use the current latency distribution metric with a percentile monitor query.
- The process monitor query used service-check syntax with `count_by_status()`. Updated it to the documented live process monitor query syntax using `processes(...).over(...).rollup('count').last(...) < 1`.
- The downtime example used the deprecated `datadog_downtime` resource. Replaced it with the current `datadog_downtime_schedule` resource and its `recurring_schedule` syntax.

## Review Notes
Terraform is not installed in the local workspace, so local `terraform fmt` or provider-backed validation could not be run. The snippets were reviewed against the current official Datadog provider and API documentation.
