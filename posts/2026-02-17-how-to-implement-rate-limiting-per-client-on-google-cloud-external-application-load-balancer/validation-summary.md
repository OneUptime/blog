# Validation Summary: Use Rate Limiting per Client on Google Cloud External Application Load Balancer

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Armor
- Google Cloud external Application Load Balancer
- Google Cloud CLI (`gcloud`)
- Cloud Logging
- Cloud Monitoring alerting policies
- Terraform Google provider

## Sources Consulted
- Google Cloud Armor rate limiting overview: https://docs.cloud.google.com/armor/docs/rate-limiting-overview
- Google Cloud Armor configure rate limiting: https://docs.cloud.google.com/armor/docs/configure-rate-limiting
- Google Cloud Armor configure security policies: https://docs.cloud.google.com/armor/docs/configure-security-policies
- Google Cloud Armor request logging: https://docs.cloud.google.com/armor/docs/request-logging
- Google Cloud SDK reference for `gcloud compute security-policies rules create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/security-policies/rules/create
- Google Cloud SDK reference for `gcloud compute backend-services update`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-services/update
- Google Cloud custom error response overview: https://docs.cloud.google.com/load-balancing/docs/https/custom-error-response
- Google Cloud configure custom error responses: https://docs.cloud.google.com/load-balancing/docs/https/configure-custom-error-responses
- Google Cloud SDK reference for `gcloud compute url-maps export`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/url-maps/export
- Google Cloud SDK reference for `gcloud compute url-maps import`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/url-maps/import
- Google Cloud SDK reference for `gcloud monitoring policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud Load Balancing metrics: https://cloud.google.com/load-balancing/docs/metrics
- Terraform Google provider `google_compute_security_policy`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_security_policy

## Issues Found
- The post said combinations of rate limiting keys were supported but did not name the correct CLI mechanism. I clarified that combinations use `--enforce-on-key-configs`, matching Cloud Armor documentation.
- The endpoint-specific examples reused priority `900`, which would conflict if applied to the same security policy. I changed the general API rule priority to `901` and updated the explanation.
- The custom response body example used `gcloud compute security-policies update --json-custom-content-types`, which configures Cloud Armor request body JSON parsing, not custom error responses. I replaced it with a URL map `defaultCustomErrorResponsePolicy` example and `gcloud compute url-maps export/import` commands.
- The custom response header flag was written as `--custom-response-headers`, but the documented backend service update flag is singular: `--custom-response-header`. I corrected the command.
- The logging section stated that Cloud Armor logs every rate limiting decision. Cloud Armor logs are part of load balancer request logs and depend on backend service logging and sampling. I added that caveat.
- The Cloud Monitoring alert example omitted required threshold fields. I added `--duration=60s` and `--if="> 100"` so the command is a complete basic alert policy example.

## Review Notes
The Terraform snippet matches the current Google provider schema for `rate_limit_options`, `throttle`, `rate_based_ban`, `deny(429)`, `deny(403)`, and `enforce_on_key = "IP"`. The examples assume a global external Application Load Balancer and global backend services; regional deployments would need regional flags and resource variants.
