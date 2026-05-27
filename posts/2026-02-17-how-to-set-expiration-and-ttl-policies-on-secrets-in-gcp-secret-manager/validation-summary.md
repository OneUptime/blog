# Validation Summary: How to Set Expiration and TTL Policies on Secrets in GCP Secret Manager

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Secret Manager
- Google Cloud CLI
- Terraform Google provider
- Pub/Sub notifications
- Python Cloud Functions / Functions Framework

## Sources Consulted
- Google Cloud Secret Manager: Set an expiration date for a secret: https://docs.cloud.google.com/secret-manager/docs/creating-and-managing-expiring-secrets
- Google Cloud SDK reference: gcloud secrets create: https://docs.cloud.google.com/sdk/gcloud/reference/secrets/create
- Google Cloud SDK reference: gcloud secrets update: https://docs.cloud.google.com/sdk/gcloud/reference/secrets/update
- Google Cloud SDK reference: gcloud secrets versions destroy: https://docs.cloud.google.com/sdk/gcloud/reference/secrets/versions/destroy
- Google Cloud Secret Manager: Set up notifications on a secret: https://docs.cloud.google.com/secret-manager/docs/event-notifications
- Google Cloud Secret Manager: Delay destruction of secret versions: https://docs.cloud.google.com/secret-manager/docs/delay-destruction-of-secret-versions
- Google Cloud Python client reference: SecretVersion: https://docs.cloud.google.com/python/docs/reference/secretmanager/latest/google.cloud.secretmanager_v1.types.SecretVersion
- Terraform Google provider: google_secret_manager_secret: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/secret_manager_secret

## Issues Found
- The command for removing expiration used `--remove-expire-time`, but the current Google Cloud CLI flag is `--remove-expiration`. Updated the command.
- The post claimed Secret Manager supports expiration on individual secret versions. Secret Manager supports delayed destruction of versions after a destroy request, not automatic per-version expiration. Rewrote that section to use `--version-destroy-ttl` and `gcloud secrets versions destroy`.
- The notification section claimed Pub/Sub sends `SECRET_EXPIRE` events before expiration. Secret Manager Pub/Sub notifications use `SECRET_DELETE` with `deleteType=EXPIRATION` when expiration deletes the secret, while pre-expiration warning signals are written as expiration logs. Updated the text and Python example accordingly.
- The best-practices section said labels provide context when the secret expires. Because the secret is deleted at expiration, changed this to say labels provide context before expiration.

## Review Notes
The main secret-level expiration and TTL commands, RFC 3339 timestamp format, duration format, Terraform `expire_time` and `ttl` fields, and automatic deletion behavior are consistent with official documentation. Local `gcloud` validation was not possible because the `gcloud` executable is not installed in this environment, so command validation used the official Cloud SDK reference.
