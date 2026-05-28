# Validation Summary: How to Create DNS Response Policies to Override Query Results

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud DNS
- DNS response policies
- Google Cloud CLI (`gcloud`)
- Terraform Google provider
- VPC networking
- DNS query logging

## Sources Consulted
- Google Cloud DNS: Manage response policies and rules: https://docs.cloud.google.com/dns/docs/zones/manage-response-policies
- Google Cloud DNS: Name resolution order: https://docs.cloud.google.com/dns/docs/vpc-name-res-order
- Google Cloud CLI: `gcloud dns response-policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/dns/response-policies/create
- Google Cloud CLI: `gcloud dns response-policies rules create`: https://docs.cloud.google.com/sdk/gcloud/reference/dns/response-policies/rules/create
- Google Cloud CLI: `gcloud dns response-policies rules list`: https://cloud.google.com/sdk/gcloud/reference/dns/response-policies/rules/list
- Google Cloud CLI: `gcloud dns policies create`: https://cloud.google.com/sdk/gcloud/reference/dns/policies/create
- Google Cloud DNS API: `responsePolicyRules` resource: https://docs.cloud.google.com/dns/docs/reference/rest/v1beta2/responsePolicyRules
- Terraform Registry: `google_dns_response_policy_rule`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/dns_response_policy_rule
- Terraform Registry: `google_dns_response_policy`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/dns_response_policy

## Issues Found
- The post used the non-current `gcloud` flag `--local-data-rrsets`. Changed the examples and explanation to use the documented `--local-data=name=...,type=...,ttl=...,rrdatas=...` syntax.
- The multiple-record example used a semicolon-delimited single flag. Changed it to repeated `--local-data` flags, which is the documented way to specify multiple local data RRsets.
- The post described `behaviorUnspecified` as returning `NXDOMAIN` for blocked domains. Official docs only document `bypassResponsePolicy` as a meaningful behavior, and local data is the supported override mechanism. Changed the blocking example to a sinkhole A record (`0.0.0.0`) and updated the Terraform example to match.
- The post said response policies are evaluated in priority order. Changed this to longest-suffix matching, matching Cloud DNS documentation.
- The rule listing command used `--response-policy`; the current CLI takes the response policy as a positional argument. Updated the command.
- The cleanup section said to delete rules and then delete the policy. Cloud DNS response policies also must be detached from networks before deletion, so an update step with `--networks=""` was added.
- The troubleshooting section implied private zones take precedence over response policy local data and mentioned disabling response policies. Updated the notes to reflect that matching local data takes precedence over private zones and that a more specific bypass rule can allow normal resolution.

## Review Notes
The post is technically relevant and current after the fixes. The `gcloud` CLI was not installed in the local environment, so CLI verification was performed against official Google Cloud CLI documentation rather than local `--help` output.
