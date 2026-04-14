# Validation Summary: How to Use Dapr with Kubernetes Namespaces

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar architecture, service invocation, access control, component scoping)
- Kubernetes (namespaces, Deployments, annotations)
- Go (Dapr Go SDK)
- Redis (as Dapr state store)

## Sources Consulted
- Dapr service invocation overview: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/service-invocation-overview/
- Dapr cross-namespace invocation: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/howto-invoke-discover-services/
- Dapr annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr access control / invoke allowlists: https://docs.dapr.io/operations/configuration/invoke-allowlists/
- Dapr Go SDK client: https://docs.dapr.io/developing-applications/sdks/go/go-client/
- Dapr component scoping: https://docs.dapr.io/operations/components/component-scopes/

## Issues Found

1. **Removed fabricated `dapr.io/namespace` annotation.** The Deployment YAML included `dapr.io/namespace: "team-a"` as a pod annotation. This is not a valid Dapr annotation. Dapr determines the namespace from the Kubernetes namespace the pod is deployed in (set via `metadata.namespace` on the Deployment), not from a custom annotation. The line was removed.

2. **Fixed incorrect description of cross-namespace syntax.** The text described the cross-namespace invocation format as a "namespace query parameter," but it is actually dot-notation appended to the app ID in the URL path (`appId.namespace`). Updated the description to correctly say "use the `appId.namespace` format in the invocation URL."

## Review Notes
- The cross-namespace service invocation syntax (`appId.namespace`), access control policy schema, component namespace scoping, sidecar injector cluster-wide behavior, and Go SDK `InvokeMethod` signature were all verified as correct.
- The Deployment YAML is intentionally abbreviated (missing `spec.replicas`, `spec.selector`, container spec, etc.) which is acceptable for a blog post focusing on Dapr annotations.
