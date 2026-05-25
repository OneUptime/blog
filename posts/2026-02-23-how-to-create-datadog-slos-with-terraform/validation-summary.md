# Validation Summary: How to Create Datadog SLOs with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Datadog Terraform provider
- Datadog Service Level Objectives
- Datadog monitors
- Datadog SLO error budget alerts
- Datadog SLO burn rate alerts

## Sources Consulted
- Datadog Terraform provider `datadog_service_level_objective` resource documentation: https://registry.terraform.io/providers/DataDog/datadog/latest/docs/resources/service_level_objective
- Datadog Terraform provider `datadog_monitor` resource documentation: https://registry.terraform.io/providers/DataDog/datadog/latest/docs/resources/monitor
- Datadog metric-based SLO documentation: https://docs.datadoghq.com/service_level_objectives/metric/
- Datadog monitor-based SLO documentation: https://docs.datadoghq.com/service_level_objectives/monitor/
- Datadog error budget alerts documentation: https://docs.datadoghq.com/service_level_objectives/error_budget/
- Datadog burn rate alerts documentation: https://docs.datadoghq.com/service_level_objectives/burn_rate/
- Terraform Datadog provider registry page: https://registry.terraform.io/providers/DataDog/datadog

## Issues Found
- The provider constraint used `~> 3.0`, which pins readers to the older 3.x provider line while the current Datadog provider line is 4.x. Updated it to `~> 4.0`.
- The inline Terraform variable declarations used semicolons inside block bodies, which is not valid Terraform HCL syntax. Expanded them into standard multi-line variable blocks.
- The latency metric-based SLO used an unsupported derived APM metric name and a subtraction expression in the legacy `query` numerator. Replaced it with direct custom good-events and total-events count metrics, matching Datadog's metric SLO model.
- The error-rate SLO and multiple-service SLO examples used subtraction expressions in the legacy `query` numerator. Replaced them with direct custom successful-request and total-request count metrics.

## Review Notes
Terraform was not installed in the local environment, so I could not run `terraform fmt` or `terraform validate`. The examples were reviewed manually against the current official provider schema and Datadog SLO documentation.
