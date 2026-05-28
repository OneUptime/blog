# Validation Summary: How to Configure Rate Limiting Rules to Prevent Brute-Force Attacks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Armor
- Google Cloud CLI
- Cloud Logging
- Terraform Google provider
- HTTP rate limiting and brute-force mitigation

## Sources Consulted
- Google Cloud Armor rate limiting overview: https://docs.cloud.google.com/armor/docs/rate-limiting-overview
- Google Cloud Armor rate limiting configuration guide: https://docs.cloud.google.com/armor/docs/configure-rate-limiting
- Google Cloud CLI reference for `gcloud compute security-policies rules create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/security-policies/rules/create
- Compute Engine SecurityPolicies REST API reference: https://docs.cloud.google.com/compute/docs/reference/rest/v1/securityPolicies
- Google Cloud Armor request logging guide: https://cloud.google.com/armor/docs/request-logging
- Terraform Google provider `google_compute_security_policy` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_security_policy

## Issues Found
- The post said Cloud Armor rate limiting windows were only 60 or 120 seconds. Google Cloud Armor supports multiple interval values, including 10, 30, 60, 120, 180, 240, 300, 600, 900, 1200, 1800, 2700, and 3600 seconds, so the wording was changed to use 60 seconds as an example instead of an exclusive list.
- The global rate limit command used `0.0.0.0/0`. Google Cloud's own examples document `*` as the match-all source range for Cloud Armor rules, so the command was changed to `--src-ip-ranges="*"`.
- The rate-based ban example implied a separate 10 requests/minute throttle rule and a 50 requests/minute ban rule would both apply as an escalation chain. Cloud Armor evaluates rules by priority, with lower numbers evaluated first, so that wording was inaccurate. The ban example was adjusted to use a single `rate-based-ban` rule with a 10 requests/minute rate threshold and a 50 requests/minute ban threshold, plus a note to avoid overlapping it with a separate `/login` throttle rule.
- The Terraform rate-based ban example had the same threshold mismatch as the CLI example. The `rate_limit_threshold.count` was changed from 50 to 10 to match the corrected escalation explanation, and the standalone throttle rule was scoped to `/api/auth/login` so it does not shadow or duplicate the `/login` ban rule.

## Review Notes
The `gcloud` and Terraform binaries were not installed in the local environment, so command validation was performed against official Google Cloud CLI, Cloud Armor, Compute Engine REST API, request logging, and Terraform provider documentation.
