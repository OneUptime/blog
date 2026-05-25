# Validation Summary: How to Create Cloudflare Access Policies with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Cloudflare Terraform provider
- Cloudflare Access / Zero Trust
- Cloudflare Access applications, policies, groups, and service tokens

## Sources Consulted
- Cloudflare Terraform provider v4.52.5 `cloudflare_access_application` resource documentation: https://registry.terraform.io/providers/cloudflare/cloudflare/4.52.5/docs/resources/access_application
- Cloudflare Terraform provider v4.52.5 `cloudflare_access_policy` resource documentation: https://registry.terraform.io/providers/cloudflare/cloudflare/4.52.5/docs/resources/access_policy
- Cloudflare Terraform provider v4.52.5 `cloudflare_access_group` resource documentation: https://registry.terraform.io/providers/cloudflare/cloudflare/4.52.5/docs/resources/access_group
- Cloudflare Terraform provider v4.52.5 `cloudflare_access_service_token` resource documentation: https://registry.terraform.io/providers/cloudflare/cloudflare/4.52.5/docs/resources/access_service_token
- Cloudflare Access policy documentation: https://developers.cloudflare.com/cloudflare-one/access-controls/policies/
- Cloudflare Access service token documentation: https://developers.cloudflare.com/cloudflare-one/access-controls/service-credentials/service-tokens/

## Issues Found
- The admin policy examples implied that one `allow` policy for the company email domain and another `allow` policy for the admin group would combine to require both conditions. Cloudflare Access combines `include` and `require` conditions inside the same policy, and policy evaluation can stop after a matching Allow policy. I combined the admin email-domain include and admin group requirement into a single policy.
- The engineering access group used `group = [var.idp_engineering_group_id]`, but the provider's `group` selector expects the ID of a previously created Cloudflare Access group, not an arbitrary identity provider group ID. I replaced the placeholder with a concrete `engineering_emails` list for the reusable Access group.
- The service token section only output the token client ID, but Cloudflare service-token authentication requires both a Client ID and Client Secret. I renamed the output to `service_token_client_id` and added a sensitive `service_token_client_secret` output.
- The office IP policy was named as a requirement even though it is a separate Allow policy. I renamed it to "Allow office IPs" and adjusted its precedence after the admin policy.

## Review Notes
- The post pins the Cloudflare provider to `~> 4.0`, so the legacy `cloudflare_access_*` resource names are valid for the documented provider family. Cloudflare provider v5 uses newer `cloudflare_zero_trust_*` resources, so a future update could modernize the examples for v5.
- Terraform is not installed in the review environment, so I could not run `terraform validate`. The snippets were checked against the official provider schema documentation instead.
