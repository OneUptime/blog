# Validation Summary: How to Create a Cloud Armor Security Policy and Attach It to a GCP Load Balancer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Armor
- Google Cloud external HTTP(S) load balancing / backend services
- Google Cloud CLI (`gcloud`)
- Cloud Logging
- Terraform Google provider

## Sources Consulted
- Google Cloud Armor security policy overview: https://docs.cloud.google.com/armor/docs/security-policy-overview
- Google Cloud Armor configure security policies guide: https://docs.cloud.google.com/armor/docs/configure-security-policies
- Google Cloud Armor custom rules language reference: https://docs.cloud.google.com/armor/docs/rules-language-reference
- Google Cloud CLI reference for `gcloud compute security-policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/security-policies/create
- Google Cloud CLI reference for `gcloud compute security-policies rules create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/security-policies/rules/create
- Google Cloud CLI reference for `gcloud compute security-policies update`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/security-policies/update
- Google Cloud CLI reference for `gcloud compute backend-services update`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-services/update
- Compute Engine REST API `securityPolicies.insert`: https://docs.cloud.google.com/compute/docs/reference/rest/v1/securityPolicies/insert
- Terraform Google provider `google_compute_security_policy`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_security_policy
- Terraform Google provider `google_compute_backend_service`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_backend_service

## Issues Found
- The prerequisites referred to the `compute.securityAdmin` role and did not mention the separate permission needed to attach a security policy to a backend service. Updated this to `roles/compute.securityAdmin` for policy management and `roles/compute.networkAdmin` or equivalent permissions for backend service attachment.
- The prerequisites referred to a Cloud Armor API being enabled by default with Compute Engine. Cloud Armor security policies are managed through Compute Engine APIs, so this was corrected to require the Compute Engine API.
- The custom `user-agent` expressions indexed `request.headers['user-agent']` without checking that the header exists. Updated both the `gcloud` and Terraform examples to use `has(request.headers['user-agent']) && ...`, matching Google Cloud Armor guidance for map lookups.
- The logging step was titled "Enable Logging" but only read logs and set verbose WAF log detail. Added the documented `gcloud compute backend-services update --enable-logging --logging-sample-rate=1.0` command because HTTP(S) request logging must be enabled on the backend service for Cloud Armor request logs.
- The detach command used `--no-security-policy`, which is not the documented form for removing a backend security policy from a backend service. Replaced it with `--security-policy=""`.

## Review Notes
The local environment did not have `gcloud` installed, so command validation was performed against the current official Google Cloud CLI reference and Cloud Armor documentation instead of local `--help` output.
