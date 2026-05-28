# Validation Summary: Configure Workforce Identity Federation for SSO-Based Access to GCP Console

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud IAM
- Workforce Identity Federation
- Workload Identity Federation
- OIDC
- SAML 2.0
- Google Cloud CLI (`gcloud`)
- Cloud Audit Logs / Security Token Service logs
- Terraform IAM bindings
- Okta
- Microsoft Entra ID

## Sources Consulted
- Google Cloud IAM: Configure Workforce Identity Federation: https://docs.cloud.google.com/iam/docs/configuring-workforce-identity-federation
- Google Cloud IAM: Workforce Identity Federation overview: https://docs.cloud.google.com/iam/docs/workforce-identity-federation
- Google Cloud IAM: Set up user access to the console (federated): https://docs.cloud.google.com/iam/docs/workforce-console-sso
- Google Cloud IAM: Sign in to the gcloud CLI with your federated identity: https://docs.cloud.google.com/iam/docs/workforce-log-in-gcloud
- Google Cloud SDK reference: `gcloud iam workforce-pools create`: https://docs.cloud.google.com/sdk/gcloud/reference/iam/workforce-pools/create
- Google Cloud SDK reference: `gcloud iam workforce-pools providers create-oidc`: https://docs.cloud.google.com/sdk/gcloud/reference/iam/workforce-pools/providers/create-oidc
- Google Cloud SDK reference: `gcloud iam workforce-pools subjects delete`: https://docs.cloud.google.com/sdk/gcloud/reference/iam/workforce-pools/subjects/delete
- Google Cloud IAM REST reference: `locations.workforcePools.subjects.delete`: https://docs.cloud.google.com/iam/docs/reference/rest/v1/locations.workforcePools.subjects/delete
- Google Cloud IAM: Security Token Service audit logging: https://docs.cloud.google.com/iam/docs/audit-logging/audit-logging-sts
- Google Cloud IAM: Example logs for Workforce Identity Federation: https://docs.cloud.google.com/iam/docs/audit-logging/examples-workforce-identity
- Google Cloud IAM quotas and limits: https://docs.cloud.google.com/iam/quotas

## Issues Found
- The workforce pool `--session-duration` example used `8h`. Google Cloud documentation describes this value as seconds with an `s` suffix, so it was changed to `28800s`.
- The OIDC provider example used the uppercase enum value `MERGE_USER_INFO_OVER_ID_TOKEN_CLAIMS`. The current `gcloud` reference requires `merge-user-info-over-id-token-claims`, so the command was corrected. The `groups` additional scope was also added so the mapped `assertion.groups` claim is requested for OIDC SSO.
- The Azure AD naming was updated to Microsoft Entra ID to match current Microsoft and Google documentation.
- The SAML attribute mapping used `assertion.nameId` and direct top-level claim map access. Google Cloud's SAML mapping syntax uses `assertion.subject` for NameID and `assertion.attributes[...]` for SAML attributes, so the SAML mapping was corrected.
- The console access URL used unsupported `wip` and `wipt` query parameters. Google Cloud documents the SSO link as `https://auth.cloud.google/signin/locations/global/workforcePools/WORKFORCE_POOL_ID/providers/WORKFORCE_PROVIDER_ID?continueUrl=https://console.cloud.google/`, so the URL was updated.
- The session management section used a non-existent `gcloud iam workforce-pools providers delete-sessions` command. It was replaced with `gcloud iam workforce-pools subjects delete`, and the explanation was corrected to state that token exchanges with the same mapped `google.subject` fail for 30 days after subject deletion.
- The audit log query used a non-existent `google.iam.v1.WorkforcePool.CreateSession` method and `principalEmail`. Google Cloud documents STS web sign-in logs under `sts.googleapis.com` with method `google.identity.sts.SecurityTokenService.WebSignIn`, so the query and output field were corrected.

## Review Notes
The Terraform IAM member format and workforce principal identifier examples match the documented principal and principalSet formats. The post correctly notes the current limits of 100 workforce identity pools per organization and 200 providers per pool.
