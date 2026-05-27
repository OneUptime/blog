# Validation Summary: How to Set Up IAP Brand and Authorized Domains for External Users in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Identity-Aware Proxy (IAP)
- Google Auth Platform / OAuth consent screen
- OAuth 2.0 custom clients
- Google Search Console domain verification
- Google Cloud CLI
- Terraform Google provider
- IAM roles for IAP access

## Sources Consulted
- Google Cloud IAP: Use custom OAuth clients with IAP - https://docs.cloud.google.com/iap/docs/custom-oauth-configuration
- Google Cloud IAP: Enable IAP using a Google-managed OAuth client - https://docs.cloud.google.com/iap/docs/managed-oauth-client
- Google Cloud IAP: Migrate from the IAP OAuth Admin API - https://docs.cloud.google.com/iap/docs/deprecations/migrate-oauth-client
- Google Cloud SDK: gcloud iap oauth-brands create - https://cloud.google.com/sdk/gcloud/reference/iap/oauth-brands/create
- Google Cloud SDK: gcloud iap oauth-clients create - https://cloud.google.com/sdk/gcloud/reference/iap/oauth-clients/create
- Google Cloud SDK: gcloud iap web add-iam-policy-binding - https://docs.cloud.google.com/sdk/gcloud/reference/iap/web/add-iam-policy-binding
- Google Cloud SDK: gcloud compute backend-services update - https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/update
- Google for Developers: OAuth brand verification and authorized domains - https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification
- Google for Developers: OAuth 2.0 policy compliance - https://developers.google.com/identity/protocols/oauth2/production-readiness/policy-compliance
- Google Cloud Console Help: Manage App Audience - https://support.google.com/cloud/answer/15549945
- Terraform Registry: google_iap_brand - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/iap_brand
- Terraform Registry: google_compute_backend_service - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_backend_service

## Issues Found
- The post used `gcloud iap oauth-brands create`, `gcloud iap oauth-brands list`, and `gcloud iap oauth-clients create`. These commands depend on the deprecated IAP OAuth Admin API, which is no longer usable after the March 19, 2026 shutdown. I replaced those examples with the current Google Cloud Console / IAP Custom OAuth flow.
- The post showed `gcloud domains verify company.com`, which is not a valid command for OAuth authorized-domain verification. I changed the instructions to use Google Search Console and DNS TXT verification.
- The authorized-domain instructions said to add the application subdomain. Google requires the top private domain for OAuth consent screen URLs, so I corrected the example to add `company.com` for `partner-portal.company.com`.
- The testing-mode wording said tokens expire after 7 days. Google's app-audience documentation describes expiring user authorizations, and refresh tokens if requested, so I changed the wording to "User authorizations expire after 7 days."
- The app verification section treated all verification as sensitive-scope verification. I clarified the distinction between sensitive-scope verification and OAuth brand verification for custom branding.
- The Terraform example used `google_iap_brand` and `google_iap_client`, which rely on the deprecated IAP OAuth Admin API. I replaced them with guidance to create the OAuth brand/client in the console and pass the resulting client credentials into the backend service IAP block.

## Review Notes
The remaining `gcloud compute backend-services update --iap=enabled,oauth2-client-id=...,oauth2-client-secret=...` and `gcloud iap web add-iam-policy-binding` examples match current Google Cloud CLI documentation for global backend services. For regional backend services, the commands need `--region=REGION_NAME` instead of `--global` or the implicit global IAP IAM resource.
