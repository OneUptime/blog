# Validation Summary: How to Access Secrets from Secret Manager in Cloud Build Steps

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Build
- Google Cloud Secret Manager
- Google Cloud CLI (`gcloud`)
- Cloud Build YAML configuration
- Docker authentication
- npm registry authentication
- Sigstore Cosign

## Sources Consulted
- Google Cloud Build documentation: Use secrets from Secret Manager - https://cloud.google.com/build/docs/securing-builds/use-secrets
- Google Cloud Build documentation: Build configuration file schema - https://cloud.google.com/build/docs/build-config-file-schema
- Google Cloud Build documentation: Default Cloud Build service account - https://cloud.google.com/build/docs/cloud-build-service-account
- Google Cloud Secret Manager documentation: Add a secret version - https://cloud.google.com/secret-manager/docs/add-secret-version
- Google Cloud SDK documentation: `gcloud secrets create` - https://cloud.google.com/sdk/gcloud/reference/secrets/create
- Google Cloud SDK documentation: `gcloud secrets versions access` - https://cloud.google.com/sdk/gcloud/reference/secrets/versions/access
- Sigstore documentation: Signing containers with Cosign - https://docs.sigstore.dev/cosign/signing/signing_with_containers/

## Issues Found
- The post described Cloud Build `volumes` as a built-in way to mount Secret Manager secrets as files. Cloud Build volumes are generic build-step volumes, while the documented Secret Manager integration uses `availableSecrets` with `secretEnv`; file-based use requires writing/accessing the secret inside a build step. I changed the wording to describe file-based usage as a pattern rather than a Cloud Build Secret Manager mechanism.
- The IAM setup assumed the legacy Cloud Build service account (`PROJECT_NUMBER@cloudbuild.gserviceaccount.com`) is always the Cloud Build service account. Current Cloud Build behavior depends on project and organization settings, and builds may use the Compute Engine default service account or a user-specified service account. I clarified that the service account running the build needs the role and that the command applies to the legacy Cloud Build service account.
- File-writing examples used `echo` for secret material. I changed these to `printf '%s'` to avoid adding an unintended trailing newline to file-based secrets.
- The Cosign example ran `cosign` from a plain `bash` image, which would not normally include the Cosign binary. I changed the example to write the key in one step, run signing with the official Sigstore Cosign container image, and clean up the key file afterward.

## Review Notes
The Cloud Build examples correctly use `availableSecrets.secretManager`, per-step `secretEnv`, and `$$` references in `args`. The examples also correctly use Secret Manager version aliases such as `latest` and specific numeric versions. For future hardening, production examples should consider using user-specified Cloud Build service accounts and Google Cloud KMS-backed Cosign keys instead of storing long-lived signing keys as secrets.
