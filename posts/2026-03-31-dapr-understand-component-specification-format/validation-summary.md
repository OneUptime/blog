# Validation Summary: How to Understand Dapr Component Specification Format

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Component YAML specification
- Kubernetes (kubectl, namespaces, secrets)
- Redis (as example state store component)
- Azure Cosmos DB (as example component)

## Sources Consulted
- Dapr Component Schema Reference: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr Component Scopes: https://docs.dapr.io/operations/components/component-scopes/
- Dapr Component Secrets: https://docs.dapr.io/operations/components/component-secrets/
- Dapr Self-Hosted Mode: https://docs.dapr.io/operations/hosting/self-hosted/self-hosted-overview/

## Issues Found

### Issue 1: `scopes` incorrectly nested under `spec`
- **What was wrong:** The YAML example in the "Scoping Components to Applications" section placed the `scopes` array indented under `spec`, making it appear as a child of `spec`.
- **What was changed:** Moved `scopes` to the top level of the YAML document (same level as `apiVersion`, `kind`, `metadata`, and `spec`). Updated the descriptive text to say "top-level `scopes` array".
- **Why:** Per the official Dapr component schema, `scopes` is a top-level field, not nested under `spec`.

### Issue 2: `auth` incorrectly nested under `spec`
- **What was wrong:** The YAML example in the "Component Auth Policies" section placed the `auth` field indented under `spec`. The example also showed only a partial component (starting at `spec:` rather than a full document).
- **What was changed:** Rewrote the example as a complete component YAML with `auth` placed at the top level (between `metadata` and `spec`). Updated the descriptive text to clarify that `auth` is a top-level field that specifies which secret store resolves `secretKeyRef` references.
- **Why:** Per the official Dapr component schema, `auth` is a top-level field, not nested under `spec`.

## Review Notes
- The post correctly notes that `spec.metadata` values are always strings, which is an important detail often missed by newcomers.
- The `secretKeyRef` explanation is accurate and matches official documentation.
- The self-hosted default components path (`~/.dapr/components/`) is correct for Linux/macOS; Windows uses `%UserProfile%\.dapr\components\` but this omission is acceptable given the post's scope.
- The `apiVersion: dapr.io/v1alpha1` is current and correct for Dapr component resources.
