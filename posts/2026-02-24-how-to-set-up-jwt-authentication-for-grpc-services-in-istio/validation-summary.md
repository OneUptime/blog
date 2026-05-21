# Validation Summary: How to Set Up JWT Authentication for gRPC Services in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio RequestAuthentication
- Istio AuthorizationPolicy
- Envoy JWT authentication filter
- gRPC over HTTP/2
- JWT bearer authentication
- Kubernetes
- grpcurl
- Go gRPC metadata
- Python gRPC metadata

## Sources Consulted
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio AuthorizationPolicy conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio authentication policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Envoy JWT authentication filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/jwt_authn_filter.html
- gRPC metadata guide: https://grpc.io/docs/guides/metadata/
- gRPC over HTTP/2 protocol document: https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-HTTP2.md
- gRPC HTTP to gRPC status mapping: https://github.com/grpc/grpc/blob/master/doc/http-grpc-status-mapping.md
- gRPC status codes guide: https://grpc.io/docs/guides/status-codes/
- gRPC health checking guide: https://grpc.io/docs/guides/health-checking/
- gRPC reflection guide: https://grpc.io/docs/guides/reflection/
- grpcurl README: https://github.com/fullstorydev/grpcurl

## Issues Found
- The original text said unauthenticated gRPC calls receive `PERMISSION_DENIED` because Istio translates HTTP errors to gRPC status codes. This was too broad: a missing JWT denied by AuthorizationPolicy maps from HTTP 403 to `PERMISSION_DENIED`, while an invalid JWT rejected by the JWT authentication filter can surface as `UNAUTHENTICATED`. Updated the wording to distinguish missing JWTs from invalid JWTs.
- The Go example for reading `outputPayloadToHeader` used `base64.StdEncoding`. Envoy documents the forwarded JWT payload header as `base64url_encoded(jwt_payload_in_JSON)`, so the example should use URL-safe decoding. Updated the comment and code to use `base64.RawURLEncoding.DecodeString`.

## Review Notes
The AuthorizationPolicy examples use ALLOW policy semantics correctly: when ALLOW policies exist for a workload, a request is allowed if any ALLOW policy matches. The gRPC path examples match the official `/<service>/<method>` HTTP/2 path format, and Istio documents gRPC AuthorizationPolicy paths as fully qualified names in the form `/package.service/method`.
