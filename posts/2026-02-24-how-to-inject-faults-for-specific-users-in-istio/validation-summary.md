# Validation Summary: How to Inject Faults for Specific Users in Istio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio VirtualService
- Istio HTTP fault injection
- Istio RequestAuthentication
- Kubernetes kubectl
- HTTP header matching
- JWT claim-to-header copying

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio fault injection task: https://istio.io/latest/docs/tasks/traffic-management/fault-injection/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio JWT claim based routing task: https://istio.io/latest/docs/tasks/security/authentication/jwt-route/
- Istio distributed tracing overview: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The Istio manifests used `networking.istio.io/v1beta1` and `security.istio.io/v1beta1`. Official current Istio examples and API reference pages use `networking.istio.io/v1` and `security.istio.io/v1`, so the examples were updated to the current API versions.
- A comment described a VirtualService example as an Envoy filter that extracts a JWT. The YAML was a VirtualService matching an existing header, so the comment was corrected.
- The JWT section said RequestAuthentication can extract claims into headers. The wording was tightened to say it copies successfully verified JWT claims into headers, matching the RequestAuthentication behavior.
- The tracing propagation sentence implied all user context headers are likely already propagated because tracing is enabled. It was corrected to distinguish standard trace context headers from custom user identity headers.
- The end-to-end test comment said a request may be delayed or aborted. Istio treats delay and abort faults independently when both are configured, so the comment now says the request may be delayed, aborted, or both.

## Review Notes
The VirtualService header match examples use lowercase hyphenated header names and valid `exact`, `prefix`, and `regex` match forms. The fault injection snippets use valid delay, abort, percentage, and route fields. The kubectl apply, exec against a deployment resource, and delete commands are valid.
