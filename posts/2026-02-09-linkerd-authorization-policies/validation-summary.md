# Validation Summary: How to Use Linkerd Authorization Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linkerd authorization policy
- Kubernetes custom resources
- Server and ServerAuthorization resources
- AuthorizationPolicy, HTTPRoute, MeshTLSAuthentication
- Linkerd proxy metrics and CLI

## Sources Consulted
- Linkerd Authorization Policy reference: https://linkerd.io/2.19/reference/authorization-policy/
- Linkerd HTTPRoute reference: https://linkerd.io/docs/reference/httproute/
- Linkerd per-route authorization task: https://linkerd.io/2.19/tasks/configuring-per-route-policy/
- Linkerd proxy metrics reference: https://linkerd.io/docs/reference/proxy-metrics/
- Linkerd CLI identity reference: https://linkerd.io/2/reference/cli/identity/
- Linkerd Viz CLI reference: https://linkerd.io/2/reference/cli/viz/

## Issues Found
- Clarified the default policy behavior. Linkerd's cluster default allows traffic, but a Server resource denies traffic to its selected pod port unless the traffic is explicitly authorized or the Server uses a more permissive access policy.
- Fixed the network-based ServerAuthorization example. Linkerd requires `client` to include `meshTLS` or `unauthenticated`; `networks` is only an optional limiter. Added `unauthenticated: true` for non-mesh clients.
- Fixed the namespace authorization example. A ServerAuthorization `serviceAccounts` entry should name a ServiceAccount; to authorize all ServiceAccounts in a namespace, the documented pattern is an identity wildcard such as `*.production.serviceaccount.identity.linkerd.cluster.local`.
- Fixed the route-based authorization example. Inbound HTTPRoutes attached to a Server should not use `backendRefs`, and the original example referenced a MeshTLSAuthentication that was never defined. Split the routes and added the required MeshTLSAuthentication and AuthorizationPolicy resources.
- Fixed the default-deny example. The `config.linkerd.io/default-inbound-policy` annotation is applied to pod specs or namespaces, not Server metadata. Replaced it with the Server `accessPolicy: deny` field.
- Fixed the HTTP method authorization example. ServerAuthorization applies to a Server, not to an HTTPRoute, so it cannot restrict a client to specific methods. Replaced it with an HTTPRoute-targeted AuthorizationPolicy and MeshTLSAuthentication.
- Fixed the Prometheus query command to use the Linkerd Viz Prometheus deployment in the `linkerd-viz` namespace.
- Fixed the PromQL grouping example to use destination pod grouping instead of an undocumented `client_id` label for `inbound_http_authz_deny_total`.
- Fixed the `linkerd identity` command to use a pod selector, as documented by the Linkerd CLI.

## Review Notes
ServerAuthorization is still supported, but Linkerd documentation states that AuthorizationPolicy is the preferred and more flexible API and that ServerAuthorization will be deprecated in a future release.
