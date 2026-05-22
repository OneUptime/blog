# Validation Summary: How to Configure Istio for Financial Services Applications

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio service mesh
- Kubernetes
- Istio security APIs: PeerAuthentication, AuthorizationPolicy, RequestAuthentication
- Istio networking APIs: VirtualService, Sidecar, DestinationRule, ServiceEntry
- Envoy access logging
- Prometheus alerting
- Istio certificate management

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Envoy access logging task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Envoy substitution formatter reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/advanced/substitution_formatter
- Istio egress TLS origination task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-tls-origination/
- Istio plug in CA certificates task: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio custom CA integration using Kubernetes CSR task: https://istio.io/latest/docs/tasks/security/cert-management/custom-ca-k8s/

## Issues Found
- The Istio security and networking examples used `v1beta1` API versions. Updated them to the current documented `security.istio.io/v1` and `networking.istio.io/v1` API versions.
- The access log format used `%DOWNSTREAM_PEER_NAMESPACE%`, which is not a supported Envoy substitution formatter command. Replaced it with `%DOWNSTREAM_REMOTE_ADDRESS%` and renamed the field to `source_address`.
- The idempotency-key AuthorizationPolicy used `notValues: [""]`, which is not the right way to require header presence. Replaced it with `values: ["*"]` and clarified that the application must use the idempotency key to make retries safe.
- The external TLS example configured destination-level TLS for an HTTPS ServiceEntry. Updated it to the documented TLS origination pattern: HTTP port 80 with `targetPort: 443` and a port-level `DestinationRule` TLS policy.
- The Prometheus P99 latency alert passed raw bucket rates directly to `histogram_quantile`. Updated it to aggregate by `le` before calculating the quantile.
- The certificate management section mixed the plugged-in `cacerts` secret workflow with the Kubernetes CSR external CA setting `EXTERNAL_CA: ISTIOD_RA_KUBERNETES_API`. Replaced the incorrect IstioOperator snippet with the documented flow of installing or restarting Istio after creating the `cacerts` secret.

## Review Notes
The examples are version-neutral but were checked against the current Istio documentation available on 2026-05-22. The post still uses placeholder hostnames and service names, so users must adapt namespaces, labels, service accounts, certificate mount paths, and trust domains to their own clusters.
