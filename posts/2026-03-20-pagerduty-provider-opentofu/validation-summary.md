# Validation Summary: How to Configure the PagerDuty Provider in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- PagerDuty (REST API and Terraform provider)
- HCL
- OpenTofu CLI

## Sources Consulted
- OpenTofu provider requirements documentation: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu provider configuration documentation: https://opentofu.org/docs/language/providers/configuration/
- OpenTofu CLI commands (`init`, `validate`, `plan`, `apply`): https://opentofu.org/docs/cli/commands/
- PagerDuty Terraform provider registry: https://registry.terraform.io/providers/PagerDuty/pagerduty/latest/docs
- PagerDuty Terraform provider source: https://github.com/PagerDuty/terraform-provider-pagerduty
- PagerDuty `pagerduty_team` resource docs
- PagerDuty `pagerduty_user` resource docs (and `teams` deprecation notice)
- PagerDuty `pagerduty_team_membership` resource docs
- PagerDuty `pagerduty_escalation_policy` resource docs
- PagerDuty `pagerduty_schedule` resource docs
- PagerDuty `pagerduty_service` resource docs
- PagerDuty REST API rate limiting: https://developer.pagerduty.com/docs/rest-api-rate-limits

## Issues Found
- The original post used a placeholder `hashicorp/example` provider with `example_*` resources that have no relationship to PagerDuty. I replaced them with the real `PagerDuty/pagerduty` provider (`~> 3.0`) and valid `pagerduty_team`, `pagerduty_user`, `pagerduty_team_membership`, `pagerduty_escalation_policy`, `pagerduty_schedule`, and `pagerduty_service` resources.
- The original authentication section used fictitious `PROVIDER_API_KEY`, `PROVIDER_TOKEN`, and `PROVIDER_ORG` environment variables. I replaced them with the real `PAGERDUTY_TOKEN` and `PAGERDUTY_SERVICE_REGION` variables that the provider actually reads.
- The original advanced configuration referenced alerts with severity/threshold fields and backup policies that do not exist in the PagerDuty provider. I replaced that section with a `pagerduty_schedule` (rotation layer) and a `pagerduty_service` configured against the escalation policy, which matches the post's stated goal of managing services, escalation policies, and schedules.
- The original troubleshooting advice suggested adding `depends_on` to avoid rate limiting. That is not the right tool for PagerDuty rate limits and would not generally help. I replaced it with concrete guidance about the PagerDuty REST API's per-token limits, the `Retry-After` response header, and using `-parallelism` on `tofu apply` to reduce concurrent requests.
- The original outputs and conclusion referred only to a generic project. I corrected them to reference actual PagerDuty resources and added a security note about API tokens and provider state.
- The escalation policy example uses a repeated `target { ... }` block (not a `targets = [...]` list) which is the working syntax for the PagerDuty provider.
- I avoided `service_region = "us"` because the provider documents `eu` as the only explicit override; the US region is selected by leaving the value unset.

## Review Notes
- I did not include `alert_creation` on `pagerduty_service`. The provider's current docs mark this attribute as deprecated because all services are migrating to alerts-and-incidents; omitting it lets the provider apply the current default and avoids documenting a deprecated argument.
- The `pagerduty_user.teams` argument is also deprecated; the post uses `pagerduty_team_membership` as the official replacement.
- `pagerduty_escalation_policy.teams` accepts only a single team in the current provider; the example uses one team accordingly.
- The provider was on the 3.x line at review time. Pinning to `~> 3.0` is a reasonable, durable constraint; readers who need a stricter pin can tighten this to `~> 3.32` or similar based on the version selected by `tofu init`.
