# Validation Summary: How to Access Secret Manager Secrets from Cloud Run as Environment Variables

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Run
- Google Secret Manager
- Google Cloud CLI (`gcloud`)
- Terraform Google provider
- Python environment variables and file I/O
- Node.js environment variables

## Sources Consulted
- Google Cloud Run documentation: Configure secrets for services - https://docs.cloud.google.com/run/docs/configuring/services/secrets
- Google Cloud Run documentation: Service identity - https://docs.cloud.google.com/run/docs/securing/service-identity
- Google Cloud SDK reference: `gcloud run deploy` - https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy
- Google Cloud SDK reference: `gcloud run services update` - https://docs.cloud.google.com/sdk/gcloud/reference/run/services/update
- Google Cloud SDK reference: `gcloud secrets create` - https://docs.cloud.google.com/sdk/gcloud/reference/secrets/create
- Secret Manager REST reference: `SecretPayload` size limit - https://docs.cloud.google.com/secret-manager/docs/reference/rest/v1/SecretPayload
- Terraform Registry: `google_cloud_run_v2_service` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_v2_service

## Issues Found
- The post treated environment-variable secrets and mounted secret volumes as if both were fetched only at instance startup. Updated the explanation to state that environment-variable secrets are resolved at instance startup, while mounted secret volumes are fetched when read.
- The rotation section said all existing instances must be replaced after adding a new secret version. Updated this to apply specifically to secrets exposed as environment variables, and clarified that mounted volumes are better suited for rotation.
- The example for picking up a rotated `latest` environment-variable secret used `gcloud run services update` without a configuration change. Replaced it with a redeploy command that creates a new revision with the same secret references.
- The Terraform example referenced three secrets but only granted the Cloud Run service account access to one of them. Added IAM member resources for the Stripe API key and TLS certificate secrets.
- The `latest` guidance implied it was usually best for automated rotation in environment variables. Updated it to align with Google guidance: use automated redeployment for environment variables, or use mounted volumes with `latest` when file-based consumption works.

## Review Notes
The post is technically sound after the fixes. Google recommends pinning secret versions for environment variables because they are resolved at instance startup; mounted secret volumes are the better fit when applications can consume rotated secrets from files.
