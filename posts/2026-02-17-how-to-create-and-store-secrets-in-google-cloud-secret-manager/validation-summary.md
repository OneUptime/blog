# Validation Summary: How to Create and Store Secrets in Google Cloud Secret Manager

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Secret Manager
- Google Cloud CLI (`gcloud`)
- Google Cloud IAM
- Cloud Audit Logs
- Customer-managed encryption keys (CMEK)
- Python Secret Manager client library
- Node.js Secret Manager client library
- Go Secret Manager client library

## Sources Consulted
- Google Cloud Secret Manager overview: https://docs.cloud.google.com/secret-manager/docs/overview
- Google Cloud Secret Manager create secrets guide: https://docs.cloud.google.com/secret-manager/docs/creating-and-accessing-secrets
- Google Cloud Secret Manager access secret version guide: https://docs.cloud.google.com/secret-manager/docs/access-secret-version
- Google Cloud Secret Manager client libraries: https://docs.cloud.google.com/secret-manager/docs/reference/libraries
- Google Cloud SDK `gcloud secrets create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/secrets/create
- Google Cloud SDK `gcloud secrets versions add` reference: https://cloud.google.com/sdk/gcloud/reference/secrets/versions/add
- Google Cloud Secret Manager annotations guide: https://docs.cloud.google.com/secret-manager/docs/creating-and-managing-annotations
- Google Cloud Secret Manager audit logging: https://docs.cloud.google.com/secret-manager/docs/audit-logging
- Google Cloud Secret Manager encryption: https://docs.cloud.google.com/secret-manager/docs/encryption
- Google Cloud Secret Manager delayed destruction: https://docs.cloud.google.com/secret-manager/docs/delay-destruction-of-secret-versions

## Issues Found
- The section heading "Adding Labels and Annotations" was misleading because the section only covered labels. Google Cloud treats labels and annotations as distinct metadata features with separate CLI flags, so the heading was changed to "Adding Labels."
- The best-practices section said to use the client library's built-in protections to avoid logging secrets. The official client library examples warn users not to print payloads, but the libraries do not prevent application code from logging decoded secret values. The sentence was changed to advise avoiding response payload logging directly.

## Review Notes
- The `gcloud` commands for creating secrets, adding versions, accessing versions, labels, replication policies, disabling versions, and destroying versions are consistent with current Google Cloud CLI documentation.
- The Python, Node.js, and Go client library snippets use current Secret Manager client APIs for accessing secret versions.
- For binary secrets, the Google Cloud documentation recommends using `--out-file` or base64 decoding raw payload output when accessing values with `gcloud`, because default CLI text output is UTF-8 formatted. The post examples focus on text-like secrets such as passwords, API keys, certificates, and JSON files.
