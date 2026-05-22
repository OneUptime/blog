# Validation Summary: How to Configure Istio for PCI DSS Compliance

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Istio
- Kubernetes
- Kubernetes NetworkPolicy
- Istio AuthorizationPolicy
- Istio PeerAuthentication
- Istio RequestAuthentication
- Istio DestinationRule
- Istio Telemetry API
- Envoy access logs
- PCI DSS

## Sources Consulted
- Istio AuthorizationPolicy HTTP traffic task: https://istio.io/latest/docs/tasks/security/authorization/authz-http/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio AuthorizationPolicy conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio authentication policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio TLS configuration overview: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio workload minimum TLS version task: https://istio.io/latest/docs/tasks/security/tls-configuration/workload-min-tls-version/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Envoy access logs task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy access log command operators: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage.html
- PCI DSS v4.0 requirements and testing procedures: https://www.pcisecuritystandards.org/document_library/

## Issues Found
- Updated Istio security, networking, and telemetry resource examples from `v1beta1` / `v1alpha1` to the current `v1` APIs where applicable.
- Changed the PCI requirements list from `Requirement 3/4` to `Requirement 4` because Istio mTLS addresses transmission controls, not stored cardholder data protection.
- Softened the claim that Istio mTLS "satisfies" PCI DSS Requirement 4. It helps satisfy in-transit encryption for mesh traffic, but compliance still depends on scope, assessment, and other controls.
- Replaced the TLS verification command. `istioctl authn tls-check` is not present in the current Istio command reference, so the post now uses an `openssl s_client` probe from an injected `istio-proxy` container.
- Corrected the TLS configuration explanation. A `DestinationRule` with `ISTIO_MUTUAL` enables Istio mutual TLS for outbound traffic, but minimum workload TLS version belongs in `meshConfig.meshMTLS.minProtocolVersion`.
- Clarified JWT behavior. `RequestAuthentication` rejects invalid JWTs, but missing JWTs are accepted unless paired with an `AuthorizationPolicy`; the example now includes the required authorization policy.
- Corrected the access logging section. The post claimed a custom format and default JSON fields without defining `accessLogFormat`; it now includes a JSON format with source identity, destination identity, request, response, timing, and request ID fields.

## Review Notes
The examples are technically valid as representative Istio configurations, but production PCI DSS validation still requires environment-specific evidence, log storage hardening, key/certificate lifecycle controls, vulnerability management, and assessor review outside Istio configuration alone.
