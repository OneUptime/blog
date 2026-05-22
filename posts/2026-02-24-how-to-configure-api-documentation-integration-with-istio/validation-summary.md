# Validation Summary: How to Configure API Documentation Integration with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService
- Istio AuthorizationPolicy
- Istio RequestAuthentication
- Kubernetes Deployments, Services, and ConfigMaps
- Swagger UI
- Redoc
- OpenAPI
- nginx
- CORS
- Prometheus HTTP API and Istio metrics
- kubectl

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio ingress access control task: https://istio.io/latest/docs/tasks/security/authorization/authz-ingress/
- Swagger UI installation documentation: https://swagger.io/docs/open-source-tools/swagger-ui/usage/installation/
- Swagger UI configuration documentation: https://swagger.io/docs/open-source-tools/swagger-ui/usage/configuration/
- Redoc Docker image documentation: https://hub.docker.com/r/redocly/redoc/
- IANA Link Relation Types registry: https://www.iana.org/assignments/link-relations/
- RFC 8631, Link Relation Types for Web Services: https://www.rfc-editor.org/rfc/rfc8631.html
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/

## Issues Found
- The internal-IP `AuthorizationPolicy` used the default `ALLOW` action. On an ingress gateway, an `ALLOW` policy that only permits documentation paths can unintentionally deny unrelated API traffic for the selected gateway workload. Changed the example to an `action: DENY` policy that denies documentation paths only when the source is outside the internal ranges.
- The internal-IP example used `ipBlocks`, which is not the right field for common HTTP/HTTPS ingress setups that derive the original client IP from `X-Forwarded-For` or PROXY protocol. Changed it to `notRemoteIpBlocks` and added a note that `notIpBlocks` is appropriate when the ingress preserves packet source addresses with `externalTrafficPolicy: Local`.
- The JWT `AuthorizationPolicy` had the same default-`ALLOW` issue and did not state that JWT identities require a `RequestAuthentication` policy. Changed it to a docs-path-only `DENY` policy using `notRequestPrincipals` and claim `notValues`, and added the RequestAuthentication precondition.
- The Prometheus curl example embedded a PromQL selector directly in the URL. Changed it to use `curl -G --data-urlencode` against `/api/v1/query`, matching Prometheus HTTP API usage and avoiding URL parsing problems with braces and quotes.

## Review Notes
The remaining Kubernetes and Istio snippets use current stable API groups and fields. The examples use `latest` container image tags for simplicity; pinning image versions would be better for production repeatability but is not a technical correctness error in this tutorial context.
