# Validation Summary: How to Invoke Services Across Different Namespaces in Dapr

## Status
validated

## Post Type
Tutorial / How-To Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes (namespaces, NetworkPolicy)
- Dapr Go SDK (`github.com/dapr/go-sdk/client`)
- Dapr Service Invocation API (HTTP)
- Dapr Component Scoping
- Dapr CLI (`dapr init -k`)

## Sources Consulted
- Dapr Service Invocation API Reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr Service Invocation Overview: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/service-invocation-overview/
- Dapr How-To: Invoke Services: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/howto-invoke-discover-services/
- Dapr CLI Reference (dapr init): https://docs.dapr.io/reference/cli/dapr-init/
- Dapr Go SDK API Reference: https://pkg.go.dev/github.com/dapr/go-sdk/client
- Kubernetes NetworkPolicy Documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found

### 1. Incorrect cross-namespace app ID format (Critical)
- **What was wrong:** The post used `{app-id}.{namespace}.svc.cluster.local` as the cross-namespace invocation format throughout (format template, curl example, Go SDK example, and summary). The `.svc.cluster.local` suffix is a Kubernetes DNS convention, not part of Dapr's name resolution. Dapr uses its own name resolution mechanism, not Kubernetes DNS.
- **What was changed:** Replaced all instances of `{app-id}.{namespace}.svc.cluster.local` with `{app-id}.{namespace}`, matching the official Dapr documentation (e.g., `order-service.production` instead of `order-service.production.svc.cluster.local`).
- **Why:** The Dapr API reference explicitly shows the format as `{appId}.{namespace}` with examples like `checkout.production` and `mathService.testing`. Using the `.svc.cluster.local` suffix would cause invocation failures.

### 2. Incorrect code fence language for format template
- **What was wrong:** The format template `{app-id}.{namespace}` was in a code block tagged as `json`, but it is not JSON.
- **What was changed:** Changed the code fence language from `json` to `text`.
- **Why:** The content is a plain text template, not valid JSON.

### 3. Misleading claim about separate Dapr control planes (Significant)
- **What was wrong:** The post stated "Services in each namespace can still invoke each other using the fully qualified name syntax" when discussing separate Dapr control planes per namespace. This is incorrect — separate control planes mean separate operators, sentry services, and placement services, so sidecars managed by one control plane cannot discover services managed by another.
- **What was changed:** Replaced the incorrect claim with a note that services managed by separate control planes cannot discover each other by default, and clarified this approach is for isolation, not cross-namespace invocation. Updated the summary accordingly.
- **Why:** This would mislead readers into deploying separate control planes expecting cross-namespace invocation to work, when it would actually break it.

## Review Notes
- The Go SDK `InvokeMethod` signature `(ctx, appID, methodName, verb string) ([]byte, error)` was verified as correct against the current SDK documentation.
- The NetworkPolicy YAML is syntactically correct and follows Kubernetes best practices.
- The Dapr Component YAML with `scopes` at the root level (same level as `spec`) is correct per Dapr's component schema.
- The `dapr init -k --namespace` command syntax was verified as correct; it installs the Dapr control plane to the specified namespace (default is `dapr-system`).
