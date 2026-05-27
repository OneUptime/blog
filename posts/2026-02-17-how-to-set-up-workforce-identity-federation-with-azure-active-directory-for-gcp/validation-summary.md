# Validation Summary: How to Set Up Workforce Identity Federation with Azure Active Directory for GCP

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Workforce Identity Federation
- Google Cloud IAM
- Google Cloud CLI
- Microsoft Entra ID / Azure AD
- OpenID Connect
- Terraform Google provider
- Cloud Audit Logs and BigQuery

## Sources Consulted
- Google Cloud: Configure Workforce Identity Federation with Microsoft Entra ID and sign in users: https://docs.cloud.google.com/iam/docs/workforce-sign-in-microsoft-entra-id
- Google Cloud: Set up user access to the console (federated): https://docs.cloud.google.com/iam/docs/workforce-console-sso
- Google Cloud: Sign in to the gcloud CLI with your federated identity: https://docs.cloud.google.com/iam/docs/workforce-log-in-gcloud
- Google Cloud SDK: gcloud iam workforce-pools providers create-oidc: https://cloud.google.com/sdk/gcloud/reference/iam/workforce-pools/providers/create-oidc
- Google Cloud SDK: gcloud iam workforce-pools create-login-config: https://cloud.google.com/sdk/gcloud/reference/iam/workforce-pools/create-login-config
- Google Cloud SDK: gcloud iam workforce-pools create-cred-config: https://cloud.google.com/sdk/gcloud/reference/iam/workforce-pools/create-cred-config
- Google Cloud: Security Token Service audit logging: https://cloud.google.com/iam/docs/audit-logging/audit-logging-sts
- Google Cloud: Example logs for Workforce Identity Federation: https://docs.cloud.google.com/iam/docs/audit-logging/examples-workforce-identity
- Terraform Registry: google_iam_workforce_pool_provider: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/iam_workforce_pool_provider
- Microsoft Learn: Configure group claims for applications by using Microsoft Entra ID: https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-fed-group-claims

## Issues Found
- The Azure AD group-claims setup told readers to emit groups as role claims while the Google provider mapping read `assertion.groups`. Changed the instruction to leave groups in the default `groups` claim.
- The OIDC attribute mapping used `assertion.sub` and `assertion.name`. Updated it to Google Cloud's recommended Microsoft Entra OIDC mapping: `assertion.oid`, `assertion.groups`, and `assertion.preferred_username`.
- The console access URL used an unsupported `console.cloud.google/workforce?provider=...` form. Replaced it with the documented `https://auth.cloud.google/signin/...?...continueUrl=https://console.cloud.google/` URL.
- The Terraform client secret block used an invalid shape. Updated it to `client_secret { value { plain_text = ... } }` per the Google Terraform provider schema.
- The gcloud CLI login command used a nonexistent `--workforce-pool-provider` flag. Replaced it with `gcloud iam workforce-pools create-login-config` followed by `gcloud auth login --login-config=...`.
- The programmatic credential config command omitted the required credential source and used a project ID where the command expects a workforce pool user project number. Added a file credential source and changed the example to a numeric project value.
- The audit log examples used `principalEmail` and only filtered `ExchangeToken`. Updated them to use `principalSubject` and include web sign-in and OAuth token exchange methods.
- Clarified that group membership changes affect Google Cloud access on the next token exchange or sign-in, not necessarily instantly for existing sessions.

## Review Notes
The post still uses the Azure AD name for reader familiarity, but Microsoft documentation now uses Microsoft Entra ID. For large tenants, group claim limits can require Google Cloud's scalable Microsoft Entra group configuration rather than direct token group claims.
