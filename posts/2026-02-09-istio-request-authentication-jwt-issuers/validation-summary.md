# Validation Summary: How to Configure Istio Request Authentication with Multiple JWT Issuers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio RequestAuthentication
- Istio AuthorizationPolicy
- Istio Telemetry and Prometheus metrics
- JWT and JWKS
- Kubernetes Deployments and Services
- kubectl and istioctl

## Sources Consulted
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Authorization Policy Conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio JWT authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-jwt/
- Istio Standard Metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Customizing Metrics task: https://istio.io/latest/docs/tasks/observability/metrics/customize-metrics/
- JSON Web Token RFC 7519: https://www.rfc-editor.org/rfc/rfc7519

## Issues Found
- Updated Istio security resources from `security.istio.io/v1beta1` to the current `security.istio.io/v1` API version shown in current Istio documentation.
- Corrected the issuer priority section. Istio documents that requests with multiple JWTs at different locations are not supported and the output principal is undefined, so the post no longer claims that `jwtRules` order is a priority mechanism.
- Corrected Prometheus examples that implied JWT issuer or request principal labels are available in standard `istio_requests_total` metrics. The examples now use standard labels, with a note that issuer-level metrics require custom Telemetry tags.
- Corrected the JWT payload decoding command to handle JWT base64url encoding and padding before calling `base64 -d`.
- Clarified the `outputPayloadToHeader` example: it forwards the verified JWT payload to a header, while AuthorizationPolicy conditions use claims for authorization.

## Review Notes
The sample issuer URLs are illustrative placeholders and must be replaced with real issuer and JWKS URLs in a working deployment. The `kubectl` and `istioctl` binaries were not installed in the local environment, so CLI behavior was verified against official documentation rather than local command execution.
