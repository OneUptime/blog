# Validation Summary: How to Configure OAuth Consent Screen and API Scopes for Least Privilege in GCP

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Platform
- Google Auth Platform OAuth consent screen
- OAuth 2.0 scopes
- Google Cloud Storage
- BigQuery
- Gmail API
- Cloud Logging
- Pub/Sub
- Python Flask
- google-auth-oauthlib
- Terraform Google provider

## Sources Consulted
- Google Workspace: Configure the OAuth consent screen and choose scopes: https://developers.google.com/workspace/guides/configure-oauth-consent
- Google Cloud Console Help: Manage OAuth App Branding: https://support.google.com/cloud/answer/15549049
- Google Cloud Console Help: Manage App Audience: https://support.google.com/cloud/answer/15549945
- Google Cloud Console Help: Manage OAuth Clients: https://support.google.com/cloud/answer/15549257
- Google Cloud SDK: gcloud alpha iap oauth-brands create: https://docs.cloud.google.com/sdk/gcloud/reference/alpha/iap/oauth-brands/create
- Identity-Aware Proxy REST API: projects.brands: https://docs.cloud.google.com/iap/docs/reference/rest/v1/projects.brands
- Terraform Registry: google_iap_brand: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/iap_brand
- Cloud Storage OAuth 2.0 scopes: https://docs.cloud.google.com/storage/docs/oauth-scopes
- Google API OAuth 2.0 scopes: https://developers.google.com/identity/protocols/oauth2/scopes
- Gmail API scopes: https://developers.google.com/workspace/gmail/api/auth/scopes
- Google OAuth 2.0 for Web Server Applications: https://developers.google.com/identity/protocols/oauth2/web-server
- Cloud Logging access control and OAuth scopes: https://cloud.google.com/logging/docs/access-control
- Pub/Sub RPC authorization scopes: https://docs.cloud.google.com/pubsub/docs/reference/rpc/google.pubsub.v1
- BigQuery: Running jobs programmatically: https://cloud.google.com/bigquery/docs/running-jobs

## Issues Found
- The post presented `storage.objects.get` as a narrow OAuth scope. This is an IAM permission, not an OAuth scope, so it was changed to `devstorage.read_only`.
- The post implied OAuth scopes can limit Cloud Storage access to a specific bucket and that `devstorage.read_only` is metadata-only. Cloud Storage OAuth scopes are service-level scopes; bucket/object restriction should be done with IAM. The wording and example comments were corrected.
- The post used `gcloud alpha iap oauth-brands` and `gcloud alpha iap oauth-clients` for general OAuth consent setup. These commands are for IAP OAuth brands/clients and are deprecated because the IAP OAuth Admin APIs were shut down in March 2026. The section was replaced with current Google Auth Platform console guidance.
- The Terraform example used `google_iap_brand` and `google_iap_client` as OAuth consent/client configuration. Those resources are IAP-specific and deprecated with the IAP OAuth Admin API shutdown, so the section now states the current limitation instead of showing non-working configuration.
- The verification section used the deprecated IAP brand listing command. It was removed from the verification checklist.
- The post stated that external sensitive scopes always require review and that sensitive scopes require a third-party security assessment. Gmail and OAuth verification docs distinguish sensitive scope verification from restricted scope verification and document exceptions; security assessment applies to restricted-scope data handling in relevant cases. The wording was corrected.
- The scope reference table listed `logging.write` as the full-access Cloud Logging scope. That scope is for writing log entries, so the table was corrected to `logging.admin`.
- The best-practice guidance said Cloud Monitoring can show which scopes tokens are actually using. I did not find an official Cloud Monitoring feature for that purpose, so the recommendation was changed to review configured scopes, code-requested scopes, and stored tokens.
- The token revocation guidance said user-facing revocation is required for verified apps. I did not verify that as a general Google OAuth verification requirement, so it was narrowed to a best-practice disconnect/delete-token recommendation.

## Review Notes
The Python OAuth example is syntactically valid and uses documented Google OAuth web-server parameters such as `access_type='offline'` and `include_granted_scopes='true'`. The BigQuery example still requires appropriate IAM permissions, including permission to create query jobs in the billing project and read the queried table, because OAuth scopes do not replace IAM.
