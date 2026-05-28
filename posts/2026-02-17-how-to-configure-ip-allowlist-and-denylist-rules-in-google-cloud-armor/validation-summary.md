# Validation Summary: How to Configure IP Allowlist and Denylist Rules in Google Cloud Armor

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Armor
- Google Cloud CLI (`gcloud`)
- Cloud Logging
- Terraform Google provider
- Python subprocess scripting

## Sources Consulted
- Google Cloud CLI reference for `gcloud compute security-policies rules create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/security-policies/rules/create
- Google Cloud Armor security policy configuration documentation: https://docs.cloud.google.com/armor/docs/configure-security-policies
- Google Cloud Armor Threat Intelligence and named IP address list documentation: https://docs.cloud.google.com/armor/docs/threat-intelligence
- Google Cloud Armor request logging documentation: https://cloud.google.com/armor/docs/request-logging
- Google Cloud CLI reference for `gcloud compute backend-services update`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-services/update
- Terraform Google provider `google_compute_security_policy` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_security_policy

## Issues Found
- The large IP list section used deprecated named IP address list syntax and included invalid `sourceiplist-public-cloud-*` names. Updated the section to use current Google Cloud Armor Enterprise Threat Intelligence feed syntax with `evaluateThreatIntelligence(...)` and corrected the feed names.
- The maintenance mode example used `deny-503`, but Cloud Armor security policy rules support `deny-403`, `deny-404`, and `deny-502` for deny responses. Changed the example to `deny-403`.
- The maintenance mode example created a deny-all rule at priority `50` while saying the team allow rule at priority `100` would still apply. Because lower numeric priority evaluates first in Cloud Armor, that would block the allow rule. Changed the maintenance rule priority to `10000` and updated the delete command accordingly.
- The Python programmatic update example claimed it removed existing rules in the priority range, but the code only updates or creates batch rules. Adjusted the comment to avoid implying stale rules are automatically deleted.

## Review Notes
Cloud Armor load balancer logging must be enabled for complete request logs, and verbose logging is needed for the most detailed matched-field information. The post's log query is plausible, but production users should confirm their load balancer logging and Cloud Armor log level settings.
