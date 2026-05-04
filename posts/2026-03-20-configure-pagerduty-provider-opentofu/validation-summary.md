# Validation Summary: How to Configure Pagerduty Provider with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- PagerDuty Terraform provider (`PagerDuty/pagerduty`)
- PagerDuty REST API authentication (API tokens)

## Sources Consulted
- PagerDuty Terraform provider docs on the Terraform Registry: https://registry.terraform.io/providers/PagerDuty/pagerduty/latest/docs
- PagerDuty provider authentication reference: https://registry.terraform.io/providers/PagerDuty/pagerduty/latest/docs#authentication
- `pagerduty_user` resource: https://registry.terraform.io/providers/PagerDuty/pagerduty/latest/docs/resources/user
- `pagerduty_escalation_policy` resource: https://registry.terraform.io/providers/PagerDuty/pagerduty/latest/docs/resources/escalation_policy
- OpenTofu `required_providers` reference: https://opentofu.org/docs/language/providers/requirements/
- PagerDuty API Access Keys docs: https://support.pagerduty.com/main/docs/api-access-keys

## Issues Found
The post had been left as a generic provider template rather than being filled in for PagerDuty. Every code block referenced unresolved placeholders (`provider_name`, `provider-namespace/provider-name`, `PROVIDER_API_KEY`, `PROVIDER_API_SECRET`, `provider_example_resource`) that would not work as written. I replaced them with the real PagerDuty provider configuration:

- **Provider source/version**: Set `source = "PagerDuty/pagerduty"` (the official PagerDuty-published provider on the Terraform Registry) and pinned to `~> 3.0`, the current major.
- **Authentication**: Replaced `PROVIDER_API_KEY` / `PROVIDER_API_SECRET` with the single `PAGERDUTY_TOKEN` environment variable that the provider actually reads, and noted where the token is generated in the PagerDuty UI. The provider block now declares `provider "pagerduty"` with an inline `token` alternative reflecting the actual provider argument name.
- **Example resource**: Replaced the fake `provider_example_resource` with a realistic and minimal `pagerduty_user` plus `pagerduty_escalation_policy` example using documented argument names (`num_loops`, `rule`, `escalation_delay_in_minutes`, `target { type = "user_reference" }`).
- **Output**: Updated the output to reference the new escalation policy resource so the example is internally consistent.

## Review Notes
- Pinning to `~> 3.0` reflects the current PagerDuty provider major; if the provider releases a 4.x and breaking changes land, this version constraint should be revisited.
- The example uses a hard-coded email (`engineer@example.com`); in production users would typically pass this via a variable, but this is a stylistic improvement rather than a correctness issue.
- The post does not cover importing existing PagerDuty resources or managing teams/services/schedules, which would be natural follow-ups but are out of scope for this introductory guide.
