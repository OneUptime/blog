# Validation Summary: How to Integrate Terraform with PagerDuty for Alerting

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Terraform
- PagerDuty Terraform provider
- PagerDuty Events API v2
- PagerDuty event orchestrations
- PagerDuty maintenance windows
- GitHub Actions
- curl

## Sources Consulted
- PagerDuty Terraform provider documentation: https://registry.terraform.io/providers/PagerDuty/pagerduty/latest/docs
- PagerDuty Terraform provider service resource documentation: https://registry.terraform.io/providers/PagerDuty/pagerduty/latest/docs/resources/service
- PagerDuty Terraform provider service integration documentation: https://registry.terraform.io/providers/PagerDuty/pagerduty/latest/docs/resources/service_integration
- PagerDuty Terraform provider escalation policy documentation: https://registry.terraform.io/providers/PagerDuty/pagerduty/latest/docs/resources/escalation_policy
- PagerDuty Terraform provider schedule documentation: https://registry.terraform.io/providers/PagerDuty/pagerduty/latest/docs/resources/schedule
- PagerDuty Terraform provider event orchestration router documentation: https://registry.terraform.io/providers/PagerDuty/pagerduty/latest/docs/resources/event_orchestration_router
- PagerDuty Terraform provider maintenance window documentation: https://registry.terraform.io/providers/PagerDuty/pagerduty/latest/docs/resources/maintenance_window
- Terraform local-exec provisioner documentation: https://developer.hashicorp.com/terraform/language/resources/provisioners/local-exec
- Terraform timestamp function documentation: https://developer.hashicorp.com/terraform/language/functions/timestamp
- PagerDuty Event Management documentation: https://support.pagerduty.com/main/docs/event-management
- PagerDuty Alerts documentation: https://support.pagerduty.com/pd-support/docs/alerts
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions

## Issues Found
- The post stated Terraform 1.0 or later, but the current PagerDuty provider documentation lists Terraform 1.1 or later. Updated the prerequisite and `required_version` constraint to `>= 1.1`.
- The provider source used `PagerDuty/pagerduty`; updated it to the canonical documented source address, `pagerduty/pagerduty`.
- The `null_resource` example used `when = destroy` and claimed it would run on failure. Terraform destroy-time provisioners run during resource destruction, not after a failed apply, and destroy provisioners have stricter reference rules. Reworked the example to describe CI/CD as the right place for apply-failure alerting and kept the Terraform example to a condition-driven alert.
- The Events API v2 curl example included a PagerDuty REST API authorization header. Events API v2 routing is done with the integration key in `routing_key`, so the REST API token header was removed from the event example.
- The Events API v2 examples did not consistently use a `dedup_key`. Added a `dedup_key` to trigger events and made the GitHub Actions resolve event use the same key, because PagerDuty requires matching deduplication keys for resolve events to close the original alert.
- The maintenance window example used `timestamp()` directly in resource attributes. Terraform documents that this causes diffs on every run, so the example now accepts explicit RFC 3339 start and end time variables.
- The `null_resource` example required the HashiCorp null provider but did not declare it. Added the `hashicorp/null` provider to the provider setup snippet.

## Review Notes
- The PagerDuty provider currently documents `alert_creation` as deprecated on services, while the service integration documentation still notes that `events_api_v2_inbound_integration` requires `alert_creation = "create_alerts_and_incidents"`. The example keeps that setting for compatibility with the documented Events API v2 integration requirement.
