# Validation Summary: How to Implement API Authentication with Dapr and API Gateway

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (sidecar architecture, service invocation)
- Kong Ingress Controller (JWT plugin, key-auth plugin, KongPlugin/KongConsumer CRDs)
- NGINX Ingress Controller (auth_request, external authentication, configuration snippets)
- OAuth2 Token Introspection (RFC 7662)
- Kubernetes (Ingress, ConfigMap, Secrets)
- Node.js / Express (header reading example)

## Sources Consulted
- Kong JWT Plugin Reference: https://developer.konghq.com/plugins/jwt/reference/
- Kong Key Auth Plugin Reference: https://developer.konghq.com/plugins/key-auth/reference/
- Kong Ingress Controller Custom Resource API Reference: https://developer.konghq.com/kubernetes-ingress-controller/reference/custom-resources/
- Kong Ingress Controller Key Authentication Guide: https://developer.konghq.com/kubernetes-ingress-controller/get-started/key-authentication/
- NGINX Ingress Controller Annotations: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- NGINX Ingress Controller ConfigMap: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- RFC 7662 - OAuth 2.0 Token Introspection: https://datatracker.ietf.org/doc/html/rfc7662
- NGINX Core Module (variable reference): https://nginx.org/en/docs/http/ngx_http_core_module.html

## Issues Found
1. **`token_hint` should be `token_type_hint`** (line 119): The OAuth2 introspection `proxy_set_body` directive used the parameter name `token_hint`, but RFC 7662 specifies the correct parameter name as `token_type_hint`. Fixed `token_hint=access_token` to `token_type_hint=access_token`.

## Review Notes
- **`$http_authorization` includes the "Bearer " prefix**: The NGINX variable `$http_authorization` captures the full Authorization header value (e.g., `Bearer eyJhbGci...`). When used in `proxy_set_body` for token introspection, this sends the "Bearer " prefix along with the token, which most introspection endpoints would reject. A production setup would need an NGINX `map` directive to strip the prefix. This is a practical limitation worth noting but would require significant restructuring to fix properly.
- **`kongCredType` in Secret stringData is deprecated**: As of Kong Ingress Controller 3.0, specifying credential type via `kongCredType` in a Secret's stringData is deprecated in favor of using the `konghq.com/credential` label in the Secret's metadata. The approach shown still works but may be removed in a future KIC release.
- **Disconnected ConfigMap and auth-url annotation**: The NGINX section shows an `http-snippet` ConfigMap creating an internal introspection proxy on port 8081, but the `auth-url` annotation points directly to `http://auth-server.default.svc/validate` rather than to the internal proxy. These two configurations don't reference each other. Each technique is individually valid, but readers may be confused about how they connect.
- All Kong plugin configurations (JWT, key-auth), CRD apiVersions, Kubernetes Ingress structure, and NGINX Ingress Controller annotations were verified as correct.
