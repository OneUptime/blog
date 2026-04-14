# Validation Summary: How to Use Dapr with GCP Secret Manager

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (secrets building block)
- Google Cloud Secret Manager
- Google Cloud CLI (`gcloud`)
- Go (Dapr Go SDK)
- Kubernetes (Dapr component and configuration resources)
- Redis (referenced as example state store)

## Sources Consulted
- Dapr GCP Secret Manager component reference: https://docs.dapr.io/reference/components-reference/supported-secret-stores/gcp-secret-manager/
- Dapr Secrets API reference: https://docs.dapr.io/reference/api/secrets_api/
- Dapr secret scoping configuration: https://docs.dapr.io/operations/configuration/secret-scope/
- Dapr component secret references: https://docs.dapr.io/operations/components/component-secrets/
- GCP Secret Manager documentation: https://cloud.google.com/secret-manager/docs/create-secret

## Issues Found
1. **Incorrect metadata field name `projectId`** (line 49): The blog used camelCase `projectId` but the official Dapr docs specify snake_case `project_id`. Changed to `project_id`.
2. **Incorrect version query parameter `metadata.version`** (line 62): The blog used `?metadata.version=2` but the official Dapr Secrets API documents the parameter as `metadata.version_id`. Changed to `?metadata.version_id=2`.

## Review Notes
- The gcloud commands for creating secrets and adding versions are correct and current.
- The Dapr component YAML structure, secret scoping configuration, and `secretKeyRef` / `auth.secretStore` usage all match official documentation.
- The Go SDK usage is correct — `client.GetSecret` signature and return type are accurate.
- The bulk secrets endpoint `/v1.0/secrets/{store-name}/bulk` is correct.
