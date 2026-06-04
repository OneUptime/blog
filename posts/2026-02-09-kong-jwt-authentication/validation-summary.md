# Validation Summary: How to Implement Kong JWT Authentication Plugin for API Security

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kong Gateway
- Kong Ingress Controller
- Kong JWT plugin
- Kong Rate Limiting plugin
- Kong Prometheus plugin
- Kubernetes Ingress, Secret, and custom resources
- Helm
- JSON Web Tokens
- Python and PyJWT
- JavaScript Fetch API
- Prometheus/PromQL

## Sources Consulted
- Kong JWT plugin overview and usage: https://developer.konghq.com/plugins/jwt/
- Kong JWT plugin configuration reference: https://developer.konghq.com/plugins/jwt/reference/
- Kong JWT verified claims example: https://developer.konghq.com/plugins/jwt/examples/verified-claim/
- Kong Ingress Controller ingress and credential reference: https://developer.konghq.com/kubernetes-ingress-controller/ingress/
- Kong Ingress Controller custom resources reference: https://developer.konghq.com/kubernetes-ingress-controller/reference/custom-resources/
- Kong Ingress Controller credential label migration: https://developer.konghq.com/kubernetes-ingress-controller/migrate/credential-kongcredtype-label/
- Kong Ingress Controller authentication examples: https://developer.konghq.com/kubernetes-ingress-controller/multiple-auth-methods/
- Kong Rate Limiting plugin configuration reference: https://developer.konghq.com/plugins/rate-limiting/reference/
- Kong Prometheus plugin overview and metrics reference: https://developer.konghq.com/plugins/prometheus/
- Kong Prometheus plugin configuration reference: https://developer.konghq.com/plugins/prometheus/reference/
- RFC 7519, JSON Web Token: https://www.rfc-editor.org/rfc/rfc7519

## Issues Found
- The Helm install command used the older `kong/kong` chart pattern for a KIC setup. Updated it to use the current `kong/ingress` chart with the official Kong Helm repository and `--wait`.
- The JWT credential was linked to the consumer with a second Kubernetes `Secret` using `konghq.com/consumer`, which is not the current KIC credential association model. Updated the consumer to reference the credential through `credentials` and removed the invalid duplicate Secret manifest.
- The RS256 credential omitted `secret`, but Kong's declarative configuration used by KIC requires explicit JWT credential fields. Added a dummy `secret` value for the RS256 example.
- The HS256 example referenced a `web-app` consumer and `web-app-key` that were not created in the tutorial. Changed the example to use a mobile-app HS256 credential and matching JWT issuer key.
- The JWT plugin example set `anonymous: false`, but `anonymous` is a string field for a consumer username or UUID, not a boolean. Replaced it with a commented example and clarified the behavior.
- The `run_on_preflight` comment described optional authentication behavior incorrectly. Updated the comment to describe CORS preflight handling.
- The Python JWT generation snippet used deprecated `datetime.utcnow()` calls and had an unused `sys` import. Replaced it with timezone-aware UTC datetimes and removed the unused import.
- The Kong proxy service name used in tests was inconsistent with the current `kong/ingress` chart. Updated it to `kong-gateway-proxy` and adjusted the jsonpath to handle either IP or hostname load balancer outputs.
- The `maximum_expiration` explanation incorrectly described clock skew. Corrected it to describe maximum token lifetime.
- The multiple JWT credential example retained the old Secret annotation pattern. Removed those annotations and noted that each Secret must be added to the `KongConsumer` credentials list.
- The security best-practice section said Kong should verify `aud`, but Kong's JWT plugin only verifies `exp` and `nbf` through `claims_to_verify`. Updated the guidance to enforce `aud` in the backend or another validation layer.
- The Prometheus example queried `kong_http_status`, which is not the current metric name for status-code request metrics in the latest docs. Updated it to `kong_http_requests_total` and enabled `status_code_metrics`.

## Review Notes
The post is technically relevant and remains a useful Kong JWT authentication tutorial after the corrections. Future improvements could include adding a complete RS256 key generation example and a note that Gateway API is now Kong's preferred Kubernetes routing API, while Kubernetes Ingress remains supported.
