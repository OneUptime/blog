# Validation Summary: How to Configure Istio for REST API Services

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio service mesh
- Kubernetes Deployments, Services, namespaces, and labels
- Istio VirtualService, DestinationRule, Gateway, AuthorizationPolicy, and PeerAuthentication resources
- Envoy/Istio retries, timeouts, circuit breaking, traffic mirroring, fault injection, CORS, and mTLS
- Prometheus and PromQL

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Gateway reference and secure ingress task: https://istio.io/latest/docs/reference/config/networking/gateway/ and https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/
- Prometheus promtool reference: https://prometheus.io/docs/prometheus/latest/command-line/promtool/

## Issues Found
- The Istio examples used `networking.istio.io/v1beta1` and `security.istio.io/v1beta1`. Updated them to the current stable `networking.istio.io/v1` and `security.istio.io/v1` API versions used in the current Istio reference documentation.
- The ingress `Gateway` example used `credentialName` without explaining where the referenced Kubernetes TLS secret must be available. Added a sentence noting that, for the default Istio ingress gateway, the secret should be created in the `istio-system` namespace.
- The AuthorizationPolicy explanation used `source.namespaces` without mentioning its mTLS dependency. Updated the explanation to say the namespace-based policy works with mTLS enabled.
- The `promtool query instant` commands omitted the required Prometheus server URL argument. Added `http://localhost:9090` before each PromQL expression.

## Review Notes
The YAML snippets were parsed successfully after the changes. The examples are technically valid as focused snippets, but a production manifest set should consolidate or coordinate multiple `VirtualService` and `DestinationRule` resources for the same host to avoid conflicting traffic policy ownership.
