# Validation Summary: How to Use Gateway API ReferenceGrant for Cross-Namespace Resource Sharing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Gateway API
- Gateway API ReferenceGrant
- Gateway, HTTPRoute, GRPCRoute, TLSRoute, and TCPRoute resources
- Kubernetes Services and Secrets
- kubectl
- Argo CD Application manifests

## Sources Consulted
- Gateway API ReferenceGrant API specification: https://gateway-api.sigs.k8s.io/reference/api-spec/main/spec/#gateway.networking.k8s.io/v1.ReferenceGrant
- Gateway API security guidance for cross-namespace Route binding and ReferenceGrant: https://gateway-api.sigs.k8s.io/docs/concepts/security/
- Gateway API Route-Gateway binding overview and `allowedRoutes` behavior: https://gateway-api.sigs.k8s.io/concepts/api-overview/
- Gateway API TLS configuration guide: https://gateway-api.sigs.k8s.io/guides/user-guides/tls/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/generated/
- Kubernetes kubectl JSONPath support: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The ReferenceGrant examples used `gateway.networking.k8s.io/v1beta1`. Updated them to `gateway.networking.k8s.io/v1`, which is the current Gateway API version for ReferenceGrant.
- The Gateway cross-namespace access section incorrectly used ReferenceGrant to grant HTTPRoutes access to a Gateway. Updated it to explain and demonstrate that cross-namespace Route-to-Gateway attachment is controlled by the Gateway listener's `allowedRoutes` field.
- The multi-tenancy example incorrectly granted access to the Gateway with ReferenceGrant. Removed Gateway targets from the ReferenceGrant resources and added `allowedRoutes` to the Gateway listener for tenant route attachment.
- The multi-tenancy Gateway used an HTTPS listener without TLS configuration. Changed that example listener to HTTP on port 80 because the example focuses on HTTPRoute attachment and backend sharing, not TLS termination.
- The introductory and revocation text was too broad about ReferenceGrant covering all cross-namespace access. Narrowed the wording to backend and certificate references, and clarified that revocation affects backend resource references in the example.

## Review Notes
The post is technically relevant and salvageable. The command examples use standard kubectl forms and documented JSONPath syntax, but `kubectl` was not installed in the local environment, so command verification was performed against official Kubernetes documentation rather than local `--help` output.
