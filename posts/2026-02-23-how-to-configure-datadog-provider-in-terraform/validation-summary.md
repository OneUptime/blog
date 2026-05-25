# Validation Summary: How to Configure Datadog Provider in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Datadog Terraform provider
- Datadog monitors
- Datadog dashboards
- Datadog service level objectives
- Datadog downtime schedules
- Datadog Synthetic Monitoring

## Sources Consulted
- Datadog Terraform provider documentation: https://registry.terraform.io/providers/DataDog/datadog/latest/docs
- Datadog Terraform `datadog_monitor` resource documentation: https://registry.terraform.io/providers/DataDog/datadog/latest/docs/resources/monitor
- Datadog Terraform `datadog_dashboard` resource documentation: https://registry.terraform.io/providers/DataDog/datadog/latest/docs/resources/dashboard
- Datadog Terraform `datadog_service_level_objective` resource documentation: https://registry.terraform.io/providers/DataDog/datadog/latest/docs/resources/service_level_objective
- Datadog Terraform `datadog_downtime` resource documentation: https://registry.terraform.io/providers/DataDog/datadog/latest/docs/resources/downtime
- Datadog Terraform `datadog_downtime_schedule` resource documentation: https://registry.terraform.io/providers/DataDog/datadog/latest/docs/resources/downtime_schedule
- Datadog Terraform `datadog_synthetics_test` resource documentation: https://registry.terraform.io/providers/DataDog/datadog/latest/docs/resources/synthetics_test
- Datadog API and Application Keys documentation: https://docs.datadoghq.com/account_management/api-app-keys/
- Datadog Sites documentation: https://docs.datadoghq.com/getting_started/site/
- Datadog Trace Metrics documentation: https://docs.datadoghq.com/tracing/metrics/metrics_namespace/

## Issues Found
- The provider version constraint used `~> 3.46`, which points readers at the older v3 provider series while the current official Datadog Terraform provider documentation is for v4.x. Changed it to `~> 4.0`.
- The dashboard p99 latency widget used a legacy-style duration metric name, `trace.http.request.duration.by.service.99p`. Current Datadog trace metrics documentation recommends latency distribution metrics for percentile latency queries, so the example now uses `p99:trace.http.request{env:production} by {service}`.
- The metric SLO numerator filtered the built-in trace hits metric with `is_duration_ok:true`, but Datadog trace metrics only expose a documented set of tags and arbitrary span tags are not available there. Replaced the example with explicit good and total count metrics: `api.requests.under_500ms` and `api.requests.total`.
- The dashboard example used general tags such as `env:production` and `managed-by:terraform`, but current `datadog_dashboard` documentation states dashboard tags only support team tags of the form `team:`. Narrowed the dashboard tags to `["team:platform"]`.
- The downtime example used `datadog_downtime`, which is deprecated in the current provider documentation. Replaced it with `datadog_downtime_schedule` and updated the schedule fields to the current `recurring_schedule`, `recurrence`, and `monitor_identifier` schema.

## Review Notes
Terraform is not installed in this workspace, so local `terraform validate` could not be run. The snippets were reviewed against the current official Datadog Terraform provider resource schemas and Datadog documentation.
