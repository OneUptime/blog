# Validation Summary: How to Create GCP Monitoring Uptime Checks in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- Google Cloud Platform (GCP)
- Google Cloud Monitoring (uptime checks, alerting policies, notification channels)
- `hashicorp/google` Terraform provider (~> 5.0)

## Sources Consulted
- Terraform Registry: `google_monitoring_uptime_check_config` resource documentation (https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/monitoring_uptime_check_config)
- Terraform Registry: `google_monitoring_alert_policy` resource documentation
- Terraform Registry: `google_monitoring_notification_channel` resource documentation
- Google Cloud Monitoring API documentation for uptime checks (UptimeCheckConfig, supported regions, monitored resource `uptime_url`, accepted matchers)
- Google Cloud Monitoring filter language docs (metric.label."check_id" syntax)

## Issues Found
No technical issues found.

All resource names, argument names, nested blocks, and exported attributes match the current `hashicorp/google` provider (v5.x):

- `google_monitoring_uptime_check_config` correctly uses `display_name`, `timeout`, `period`, `selected_regions`, `http_check`, `tcp_check`, and `monitored_resource`.
- `http_check` arguments (`path`, `port`, `use_ssl`, `validate_ssl`, `request_method`, `headers`, `accepted_response_status_codes`, `content_matchers`) are valid.
- `accepted_response_status_codes` correctly supports either `status_class` (e.g., `STATUS_CLASS_2XX`) or `status_value` (numeric).
- `content_matchers` uses the valid `CONTAINS_STRING` matcher.
- `selected_regions` values `USA`, `EUROPE`, `ASIA_PACIFIC`, `SOUTH_AMERICA` are all valid GCP uptime check regions.
- `monitored_resource` with type `uptime_url` and labels `project_id`/`host` is correct for HTTP/HTTPS/TCP uptime checks.
- The exported attribute `uptime_check_id` is referenced correctly in the alert policy filter.
- The alert policy aggregation (`ALIGN_NEXT_OLDER` + `REDUCE_COUNT_FALSE`) matches the canonical example documented for uptime check alerting.
- `google_monitoring_notification_channel` with `type = "email"` and `email_address` label is the correct configuration for email channels.
- Allowed `period` values (60s, 300s) and the supported check periods are accurate.

## Review Notes
- TCP uptime check uses only `selected_regions = ["USA"]`. GCP allows this since each broad region (USA) contains multiple subregions (`USA_OREGON`, `USA_IOWA`, `USA_VIRGINIA`), but in practice many teams select 3+ broad regions to satisfy multi-region best practices. This is a stylistic choice, not a correctness issue.
- The alert policy uses `comparison = "COMPARISON_GT"` with `threshold_value = 1`. Combined with `REDUCE_COUNT_FALSE`, this fires when more than one series is failing. Teams sometimes use `threshold_value = 0` for stricter alerting; both are valid.
- The link to the related "GCP Monitoring notification channels" post points to an internal OneUptime blog URL that is plausible given the post-naming convention.
