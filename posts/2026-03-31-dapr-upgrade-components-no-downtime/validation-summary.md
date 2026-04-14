# Validation Summary: How to Upgrade Dapr Components Without Downtime

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar architecture, component hot-reload, operator)
- Kubernetes (Secrets, Component CRDs, kubectl patch, deployments)
- Redis (password rotation, CONFIG SET requirepass)
- Go (Dapr Go SDK client)

## Sources Consulted
- Dapr Preview Features documentation: https://docs.dapr.io/operations/support/support-preview-features/
- Dapr Component Updates (Hot Reload): https://docs.dapr.io/operations/components/component-updates/
- Dapr Component Spec Schema: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr Component Scopes: https://docs.dapr.io/operations/components/component-scopes/
- Dapr Referencing Secrets in Components: https://docs.dapr.io/operations/components/component-secrets/
- Dapr Go SDK client interface: https://pkg.go.dev/github.com/dapr/go-sdk/client
- Dapr v1.13 Release Notes (HotReload introduction): https://github.com/dapr/dapr/releases/tag/v1.13.0
- Redis AUTH command documentation: https://redis.io/docs/latest/commands/auth/
- Redis ACL documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/

## Issues Found

### 1. Secret rotation script had wrong step ordering (critical)
**What was wrong:** The script updated the Kubernetes Secret with the new password (step 1) before updating Redis itself (step 4). This created a window where Dapr sidecars would attempt to authenticate with the new password while Redis still expected the old one, causing connection failures — the opposite of zero-downtime.

**What was changed:** Reordered the steps so that Redis `CONFIG SET requirepass` runs first (existing authenticated connections are unaffected), and only then is the Kubernetes Secret updated with the new password.

### 2. `$OLD_PASSWORD` variable was undefined (bug)
**What was wrong:** The script used `$OLD_PASSWORD` in the `redis-cli` command but never defined or retrieved this variable, so the command would fail.

**What was changed:** Added a line at the top of the script to retrieve the current password from the existing Kubernetes Secret: `OLD_PASSWORD=$(kubectl get secret redis-secret -n production -o jsonpath='{.data.password}' | base64 -d)`.

### 3. Script assumed K8s Secret changes trigger Dapr hot-reload (incorrect)
**What was wrong:** The script implied that updating a Kubernetes Secret would cause Dapr sidecars to automatically reload the component configuration. Dapr's HotReload feature watches Component custom resources, not the underlying Secret resources they reference. Simply changing a Secret would not trigger a sidecar reload.

**What was changed:** Added a step to annotate the Component CR (`kubectl annotate component statestore ...`) after updating the Secret. This forces the Dapr operator to detect a change in the Component resource and push the updated configuration to sidecars. Added a comment explaining why this step is necessary.

## Review Notes
- The HotReload feature was introduced in Dapr v1.13 (March 2024) and remains a preview feature. The post does not mention this preview status, which readers should be aware of.
- The Go SDK `SaveState` call is correct but the code snippet references an undefined `shouldMigrate()` helper function. This is acceptable for a conceptual blog snippet.
- The `scopes` field in the canary Component YAML is correctly placed at the top level (same level as `spec`), matching the Dapr Component CRD schema.
- The `kubectl patch component` commands rely on the Dapr CRDs being installed in the cluster, which is a prerequisite that could be mentioned.
