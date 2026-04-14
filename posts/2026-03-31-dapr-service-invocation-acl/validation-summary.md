# Validation Summary: How to Use Dapr Service Invocation with Access Control Lists

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Service Invocation API
- Dapr Access Control Lists (ACLs)
- Dapr Configuration resource (CRD)
- Mutual TLS (mTLS) with Dapr Sentry
- Kubernetes annotations for Dapr

## Sources Consulted
- Dapr Access Control Lists documentation: https://docs.dapr.io/operations/configuration/invoke-allowlist/
- Dapr mTLS documentation: https://docs.dapr.io/operations/security/mtls/
- Dapr Service Invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr Configuration spec documentation: https://docs.dapr.io/operations/configuration/configuration-overview/

## Issues Found
No technical issues found.

## Review Notes
- The `name: "*"` wildcard in the admin-service operations matches a single path segment. Full access for admin-service is actually ensured by the per-app `defaultAction: allow`, which catches any multi-segment paths not matched by the wildcard. The combination is functionally correct as described, though readers should understand the per-app `defaultAction` is doing the heavy lifting.
- The `httpVerb` field only applies to HTTP service invocation; gRPC invocations ignore this field. The post focuses on HTTP which is appropriate but worth noting for readers using gRPC.
- Dapr ACL policy evaluation precedence is: (1) specific operation action, (2) per-app defaultAction, (3) global defaultAction. The post's examples correctly leverage this hierarchy.
- The documentation URL for ACLs is the singular form (`invoke-allowlist/`) rather than plural; external links were not included in the post so this is not an issue.
