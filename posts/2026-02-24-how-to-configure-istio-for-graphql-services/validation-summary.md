# Validation Summary: How to Configure Istio for GraphQL Services

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio VirtualService, Gateway, DestinationRule, AuthorizationPolicy, and EnvoyFilter
- Kubernetes Deployments, Services, namespaces, labels, and readiness probes
- GraphQL APIs and subscriptions over WebSocket
- Envoy local rate limiting
- Prometheus and PromQL

## Sources Consulted
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio rate limiting with EnvoyFilter task: https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Prometheus promtool command reference: https://prometheus.io/docs/prometheus/latest/command-line/promtool/

## Issues Found
- The Istio networking and security examples used older `v1beta1` API versions. Updated VirtualService, Gateway, DestinationRule, and AuthorizationPolicy snippets to the current stable `networking.istio.io/v1` and `security.istio.io/v1` APIs used in Istio's current reference documentation.
- The WebSocket section implied that Istio needs the upgrade to be explicitly allowed. Istio can route WebSocket traffic, but the important configuration in the example is separating the upgrade route so it can use a long-lived timeout. Updated the wording and made the `upgrade` header match case-insensitive with `regex: "(?i)^websocket$"`.
- The rate limiting section said the shown local rate limit was based on client IP or headers, but the EnvoyFilter applies a per-proxy token bucket to matching inbound HTTP traffic. Updated the description to match the configuration.
- The `promtool query instant` example omitted the required Prometheus server argument. Added `http://localhost:9090`, which is the expected endpoint when running the command inside the Prometheus pod.

## Review Notes
The EnvoyFilter example follows Istio's documented local rate limiting pattern, but EnvoyFilter configurations expose Envoy internals and should be rechecked during Istio proxy upgrades. The examples use short service hostnames, which are valid in the same namespace; fully qualified service names are safer when moving these manifests across namespaces.
