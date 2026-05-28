# Validation Summary: How to Enable Identity-Aware Proxy to Secure a Web App Behind a GCP Load

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Identity-Aware Proxy
- Google Cloud external Application Load Balancer
- Google Cloud CLI
- Google Cloud IAM
- Terraform Google provider
- Python Flask
- Google Auth Python library

## Sources Consulted
- Google Cloud IAP: Enable IAP for Compute Engine: https://docs.cloud.google.com/iap/docs/enabling-compute-howto
- Google Cloud IAP: Use custom OAuth clients with IAP: https://docs.cloud.google.com/iap/docs/custom-oauth-configuration
- Google Cloud IAP: Migrate from the IAP OAuth Admin API: https://docs.cloud.google.com/iap/docs/deprecations/migrate-oauth-client
- Google Cloud IAP: Getting the user's identity: https://docs.cloud.google.com/iap/docs/identity-howto
- Google Cloud IAP: Securing your app with signed headers: https://docs.cloud.google.com/iap/docs/signed-headers-howto
- Google Cloud SDK: gcloud iap web add-iam-policy-binding: https://docs.cloud.google.com/sdk/gcloud/reference/iap/web/add-iam-policy-binding
- Google Cloud Load Balancing: Health checks overview: https://cloud.google.com/load-balancing/docs/health-check-concepts
- Terraform Google provider: google_compute_backend_service: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_backend_service

## Issues Found
- The post said an OAuth consent screen is always required and that GCP creates an OAuth client automatically on first enablement. Updated this to reflect the current default Google-managed OAuth client behavior and clarified when custom OAuth branding is needed.
- The Terraform example used `google_iap_brand` and `google_iap_client`. Updated it to use the current `google_compute_backend_service` `iap { enabled = true }` pattern because the IAP OAuth Admin API used for creating IAP clients is deprecated and past its shutdown date.
- The troubleshooting section said IAP intercepts health checks. Updated it to clarify that IAP does not process health checks and that failures usually come from application-level authentication or JWT validation on the health check path.
- The firewall guidance described the listed IP ranges too broadly. Updated it to clarify that `130.211.0.0/22` and `35.191.0.0/16` apply to global external Application Load Balancers with instance group or zonal NEG backends, and that other backend/load balancer types can use different source ranges.
- The summary still referred to configuring an OAuth consent screen as a default step. Updated it to say OAuth branding is only needed for custom OAuth clients.

## Review Notes
The Google Cloud CLI is not installed in the local environment, so command validation was performed against the official Google Cloud SDK reference instead of local `gcloud --help`. The local Python environment also does not include `google-auth`, so the Python snippets were reviewed against Google's official sample rather than import-tested locally.
