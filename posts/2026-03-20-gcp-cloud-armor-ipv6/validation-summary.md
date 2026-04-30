# Validation Summary: How to Configure GCP Cloud Armor with IPv6 Rules

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Armor
- Google Cloud Load Balancing
- IPv6
- `gcloud` CLI
- Terraform
- Cloud Logging
- Cloud Monitoring
- CEL (Common Expression Language)

## Sources Consulted
- Google Cloud Armor security policy overview: https://cloud.google.com/armor/docs/security-policy-overview
- Configure Cloud Armor security policies: https://cloud.google.com/armor/docs/configure-security-policies
- Configure rate limiting: https://cloud.google.com/armor/docs/configure-rate-limiting
- Cloud Armor rules language reference: https://cloud.google.com/armor/docs/rules-language-reference
- Use request logging: https://cloud.google.com/armor/docs/request-logging
- Monitoring Cloud Armor security policies: https://cloud.google.com/armor/docs/monitoring
- `gcloud compute security-policies create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/security-policies/create
- `gcloud compute security-policies rules create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/security-policies/rules/create
- `gcloud compute security-policies rules update` reference: https://cloud.google.com/sdk/gcloud/reference/compute/security-policies/rules/update
- `gcloud logging read` reference: https://cloud.google.com/sdk/gcloud/reference/logging/read
- Cloud Logging query language: https://cloud.google.com/logging/docs/view/logging-query-language
- Terraform `google_compute_security_policy` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_security_policy
- Terraform `google_compute_backend_service` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_backend_service
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849
- RFC 5737, IPv4 Address Blocks Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc5737

## Issues Found
- The sample IPv6 prefixes `2001:db8:trusted::/48`, `2001:db8:bad::/48`, and `2001:db8:blocked::/32` were not valid IPv6 literals. I replaced them with valid documentation prefixes under `2001:db8::/32`, and I replaced the private IPv4 example `192.168.1.0/24` with the documentation block `198.51.100.0/24`.
- The `throttle` example incorrectly included `--ban-duration-sec`, which is for rate-based ban rules rather than plain throttling. I removed that flag and corrected the wording so the example now accurately rate-limits IPv6 clients per source IP.
- The post tried to create the default rule at priority `2147483647`, but Cloud Armor always includes that rule already and it must be updated instead. I changed `rules create 2147483647` to `rules update 2147483647`.
- The geo-based CEL example used an `allow` rule ahead of later deny and throttle rules. Because Cloud Armor stops at the highest-priority match, that structure could bypass later controls. I changed it to a deny rule for non-US IPv6 traffic so the stated allow-only-US behavior works with the rest of the sample policy.
- The logging example used the wrong field path (`jsonPayload.jsonPayload.remoteIp`) and an invalid filter expression. I changed it to `jsonPayload.securityPolicyRequestData.remoteIpInfo.ipAddress` with a valid Cloud Logging substring filter for IPv6 addresses.
- The monitoring section referenced `gcloud monitoring metrics list`, which is not a current `gcloud monitoring` command, and it pointed to unrelated metric names. I replaced that with the documented Cloud Monitoring dashboard, resource type, metrics, and filter dimensions for Cloud Armor.
- The introduction and conclusion used older "Global HTTP(S) Load Balancer" wording. I updated them to current Google Cloud load balancer terminology while keeping the scope of the article the same.
- The Terraform backend service attachment now uses the policy `self_link`, which matches the provider’s documented URI-style attachment pattern.

## Review Notes
- `gcloud compute security-policies create` still defaults to a backend security policy when `--type` is omitted, so that command remains valid after the review.
- Cloud Armor’s built-in Monitoring dashboard exposes request counts and filter dimensions like `blocked` and `backend_target_name`, but not an IP-version dimension. For IPv6-only operational views, log filtering or log-based metrics are the better fit.
- Live CLI execution was not possible in this environment because `gcloud` and `terraform` are not installed, so command validation was documentation-based.
