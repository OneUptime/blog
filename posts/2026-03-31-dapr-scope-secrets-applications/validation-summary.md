# Validation Summary: How to Scope Secrets to Specific Applications in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Secret Store API
- Dapr Configuration resources
- Dapr Component scoping
- Kubernetes secret stores
- HashiCorp Vault secret store

## Sources Consulted
- Dapr Secret Scoping documentation: https://docs.dapr.io/operations/configuration/secret-scope/
- Dapr Component Schema reference: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr Secrets API reference: https://docs.dapr.io/reference/api/secrets_api/

## Issues Found

### Issue 1: `allowedSecrets`, `deniedSecrets`, and `defaultAccess` incorrectly placed in Component YAML
**What was wrong:** The original post placed `allowedSecrets` directly inside the Component YAML `spec` block (in the "Namespace-Level Scoping" and "Per-Environment Scoping" sections). In the "Combining defaultAccess with deniedSecrets" section, `defaultAccess` and `deniedSecrets` were incorrectly placed as component `metadata` name/value pairs.

**What was changed:** All secret scoping settings (`allowedSecrets`, `deniedSecrets`, `defaultAccess`) were moved into separate **Configuration** resources under `spec.secrets.scopes`, which is the correct Dapr resource type for secret-level access control. Each affected section now shows the Configuration resource alongside the Component resource.

**Why:** Per the official Dapr documentation, secret scoping is configured through a `kind: Configuration` resource, not the `kind: Component` resource. The Configuration is applied to the Dapr sidecar via the `dapr.io/config` annotation.

### Issue 2: `scopes` field incorrectly nested inside `spec`
**What was wrong:** In every Component YAML example, the `scopes` field was placed inside the `spec` block (indented under `spec`).

**What was changed:** Moved `scopes` to the top level of the Component resource (at the same indentation level as `spec`).

**Why:** Per the official Dapr Component schema, `scopes` is a top-level field in the Component manifest, not a child of `spec`.

### Issue 3: `auth` field incorrectly nested inside `spec`
**What was wrong:** The first Component YAML example had `auth.secretStore` nested inside `spec`.

**What was changed:** Removed the `auth` block entirely from the first example, as `secretstores.kubernetes` does not require an `auth` reference (it uses the Dapr sidecar's service account to access Kubernetes secrets natively), and the component had no `secretKeyRef` fields that would need it.

**Why:** Per the official Dapr Component schema, `auth` is a top-level field (not inside `spec`), and it is only needed when component metadata uses `secretKeyRef` to pull values from another secret store.

### Issue 4: Introductory description of scoping settings was misleading
**What was wrong:** The "Secret Scoping Options" section stated "Dapr secret store components support three scoping settings," implying these settings are part of the Component resource.

**What was changed:** Updated to clarify that secret-level access control is configured through a **Configuration** resource under `spec.secrets.scopes`.

**Why:** Accurate framing prevents readers from looking for these settings in the wrong resource type.

## Review Notes
- The Secrets API endpoint format (`/v1.0/secrets/{store}/{key}`) is correct and verified against official docs.
- The HTTP 403 status code for denied secret access is correct per the API reference.
- The exact JSON error response body (`ERR_SECRET_GET` error code) shown in the testing section is illustrative — the actual error code may vary by Dapr version, but the 403 behavior is accurate.
- The post would benefit from mentioning the `dapr.io/config` annotation more prominently, as this is how the Configuration resource is associated with a specific application's sidecar.
