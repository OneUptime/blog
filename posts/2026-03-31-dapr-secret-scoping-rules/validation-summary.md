# Validation Summary: How to Restrict Secret Access Using Dapr Scoping Rules

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Secret Store API
- Dapr Component Scoping
- Dapr Configuration API (secret-level scoping)
- HashiCorp Vault (as example secret store)
- Kubernetes (Deployments, annotations, kubectl)

## Sources Consulted
- Dapr Component Scopes documentation: https://docs.dapr.io/operations/components/component-scopes/
- Dapr Secret Scoping documentation: https://docs.dapr.io/operations/configuration/secret-scope/
- Dapr Configuration Overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr Secrets API reference: https://docs.dapr.io/reference/api/secrets_api/
- Dapr Annotations reference (for `dapr.io/config` annotation)

## Issues Found

### 1. `scopes` field incorrectly nested under `spec` in Component YAML
- **What was wrong**: The component YAML showed `scopes` indented under `spec`, making it a child of `spec`.
- **What was changed**: Moved `scopes` to the top level of the Component resource, at the same indentation level as `spec` and `metadata`.
- **Why**: Per official Dapr documentation, `scopes` is a top-level field in the Component schema, not a sub-field of `spec`.

### 2. Incorrect claim about 403 Forbidden for non-scoped apps
- **What was wrong**: The post stated that non-scoped apps "will receive a `403 Forbidden` when trying to call the secrets API for this component."
- **What was changed**: Updated to explain that the component is simply not loaded for non-scoped apps, making the secret store invisible to that service.
- **Why**: Component scoping works by preventing the component from loading for apps not in the scopes list. The app does not receive a 403 — the component does not exist from that app's perspective.

### 3. Incorrect claim about `allowedSecrets`/`deniedSecrets` as component metadata
- **What was wrong**: The post stated secret-level scoping could be done "via the secret store component's `allowedSecrets` and `deniedSecrets` metadata."
- **What was changed**: Updated to clarify that these fields exist only in the Dapr Configuration resource, not as component metadata.
- **Why**: Per official Dapr documentation, `allowedSecrets` and `deniedSecrets` are fields within the `spec.secrets.scopes` section of a Configuration resource, not component metadata fields.

## Review Notes
- The error response format shown (`ERR_PERMISSION_DENIED` with `||`-separated identifiers) is consistent with Dapr's error code reference, though the exact message string format is not formally documented and may vary across Dapr versions.
- The Secrets API endpoint format (`/v1.0/secrets/<store-name>/<key>`) is correct.
- The `dapr.io/config` annotation for applying configuration to a deployment is correct.
- The Configuration resource YAML structure (`spec.secrets.scopes` with `storeName`, `defaultAccess`, `allowedSecrets`, `deniedSecrets`) is accurate.
- The advice to prefer `defaultAccess: deny` with an explicit allow list is sound security guidance.
