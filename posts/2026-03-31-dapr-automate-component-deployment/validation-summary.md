# Validation Summary: How to Automate Dapr Component Deployment

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Component CRD, pub/sub, state stores, secret stores)
- Kubernetes (kubectl, custom resources)
- Kustomize (overlays, JSON Patch)
- Helm (charts, templates, values)
- GitHub Actions (CI/CD integration)
- Bash scripting

## Sources Consulted
- Dapr Component schema reference: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr Redis Pub/Sub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis/
- Dapr Component CRD source (dapr/dapr `pkg/apis/components/v1alpha1/types.go`)
- Kustomize patches reference: https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/patches/

## Issues Found
1. **`scopes` field incorrectly nested under `spec` in Helm template**: The Dapr Component CRD defines `scopes` as a top-level field (sibling to `spec`), not nested within `spec`. The Helm chart template had `scopes` indented under `spec`, which would cause the scopes to be ignored or rejected. Fixed by moving `scopes` and its Helm range loop to the top level of the resource.

## Review Notes
- The deploy script checks `.status.conditions[?(@.type=="Ready")].status` on Dapr Component resources. The Dapr Component CRD does not have a `.status` field or conditions subresource — this jsonpath will always return empty, causing every component to show "Unknown" status. The script handles this gracefully via `2>/dev/null || echo "Unknown"`, so it won't break, but the status check is misleading. A more accurate validation would simply confirm the component exists (which the `kubectl get component` call already does implicitly).
- The Kustomize patch target specifies only `kind: Component` and `name: pubsub` without `group` or `version`. While this works, adding `group: dapr.io` and `version: v1alpha1` would be more explicit and avoid any potential ambiguity with Kustomize's own `Component` kind.
