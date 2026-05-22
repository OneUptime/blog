# Validation Summary: How to Integrate Terraform with Monitoring Platforms

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Terraform
- Datadog Terraform provider
- Datadog monitors, AWS integration metrics, APM metrics, and synthetic tests
- Grafana Terraform provider and dashboard JSON
- PagerDuty Terraform provider, schedules, escalation policies, services, and service integrations
- AWS EC2, RDS, and Application Load Balancer CloudWatch metrics

## Sources Consulted
- Terraform Registry: DataDog/datadog provider overview and resources: https://registry.terraform.io/providers/DataDog/datadog/latest/docs
- Terraform Registry: `datadog_monitor`: https://registry.terraform.io/providers/DataDog/datadog/latest/docs/resources/monitor
- Terraform Registry: `datadog_synthetics_test`: https://registry.terraform.io/providers/DataDog/datadog/latest/docs/resources/synthetics_test
- Terraform Registry: `datadog_integration_pagerduty_service_object`: https://registry.terraform.io/providers/DataDog/datadog/latest/docs/resources/integration_pagerduty_service_object
- Datadog Terraform integration docs: https://docs.datadoghq.com/integrations/terraform/
- Datadog EC2 integration metric docs: https://docs.datadoghq.com/integrations/amazon-ec2/
- Datadog disk-space monitor guide: https://docs.datadoghq.com/monitors/guide/monitoring-available-disk-space/
- Datadog trace metrics docs: https://docs.datadoghq.com/tracing/metrics/metrics_namespace/
- Terraform Registry: grafana/grafana provider `grafana_dashboard`: https://registry.terraform.io/providers/grafana/grafana/latest/docs/resources/dashboard
- Grafana Terraform dashboard docs: https://grafana.com/docs/grafana/latest/as-code/infrastructure-as-code/terraform/dashboards-github-action/
- Terraform Registry: PagerDuty/pagerduty provider: https://registry.terraform.io/providers/PagerDuty/pagerduty/latest/docs
- Terraform Registry: `pagerduty_service`: https://registry.terraform.io/providers/PagerDuty/pagerduty/latest/docs/resources/service
- Terraform Registry: `pagerduty_service_integration`: https://registry.terraform.io/providers/PagerDuty/pagerduty/latest/docs/resources/service_integration
- PagerDuty services and integrations docs: https://support.pagerduty.com/main/docs/services-and-integrations
- PagerDuty Datadog integration guide: https://www.pagerduty.com/docs/guides/datadog-integration-guide/

## Issues Found
- The provider block only declared Datadog and AWS. Because Grafana and PagerDuty are non-HashiCorp providers, Terraform should declare their provider sources explicitly. I added `grafana/grafana` and `PagerDuty/pagerduty` to `required_providers`.
- The Datadog EC2 CPU monitor used the tag key `instance-id`. Datadog's EC2 integration documents the EC2 instance dimension as an `instance_id` tag, so I changed the query filter to `instance_id:${aws_instance.app.id}`.
- The disk-space monitor compared `system.disk.free`, a byte metric, directly to percentage thresholds. Datadog's disk-space guide calculates free percentage as `system.disk.free / system.disk.total * 100`, so I updated the query to use that formula.
- The PagerDuty-to-Datadog integration passed `pagerduty_service.web_application.id` as the Datadog PagerDuty `service_key`. Datadog requires the PagerDuty integration/routing key, not the PagerDuty service ID. I added a Datadog vendor lookup, a `pagerduty_service_integration`, and wired `pagerduty_service_integration.datadog.integration_key` into the Datadog integration resource.
- The Datadog provider version constraint was pinned to the older 3.x line. I updated the example to the current 4.x major line.

## Review Notes
- Terraform CLI is not installed in this environment, so I could not run `terraform validate`.
- The Grafana dashboard JSON is illustrative and depends on the installed CloudWatch data source configuration. In newer Grafana installations, `timeseries` panels are usually preferred over legacy `graph` panels, but the example remains conceptually valid as dashboard JSON managed by Terraform.
- The Datadog APM latency example uses Datadog's trace duration percentile metric style. Datadog documents newer latency distribution metrics as preferred for latency analysis, but the existing metric style is still maintained for compatibility.
