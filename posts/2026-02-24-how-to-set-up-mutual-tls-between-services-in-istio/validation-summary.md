# Validation Summary: How to Set Up Mutual TLS Between Services in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- Envoy sidecars
- Mutual TLS (mTLS)
- PeerAuthentication
- DestinationRule
- istioctl
- Prometheus metrics

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio Authentication Policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio Mutual TLS Migration task: https://istio.io/latest/docs/tasks/security/authentication/mtls-migration/
- Istio Understanding TLS Configuration: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Understand your Mesh with Istioctl Describe: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-describe/
- Istio Debugging Envoy and Istiod: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio Health Checking of Istio Services: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Verify mutual TLS is enabled: https://istio.io/latest/docs/ambient/usage/verify-mtls-enabled/

## Issues Found
- The traffic flow said the application sends its request to localhost. In the default sidecar capture model, the application sends traffic as usual and Istio intercepts it. Updated the wording to avoid implying the application must target localhost.
- The `istioctl x describe pod` section described the command as verifying active mTLS between two services. That command shows effective configuration for a pod, not live connection state. Updated the text and comment to say it checks the effective mTLS policy.
- The health-check exception implied kubelet health checks generally need a permissive port exception. Istio rewrites Kubernetes HTTP, TCP, and gRPC probes by default. Updated the example to cover non-rewritten or external health checks and clarified that `portLevelMtls` uses the workload port.
- The command for finding pods without sidecars assumed any pod with one container has no sidecar, which misses multi-container pods without sidecars and can misclassify workloads. Replaced it with a query that checks whether the `istio-proxy` container is absent.
- The DestinationRule troubleshooting note said `mode: DISABLE` overrides PeerAuthentication settings. PeerAuthentication controls inbound acceptance and DestinationRule controls outbound TLS origination. Updated the wording to explain that `DISABLE` forces plaintext outbound and conflicts with a STRICT destination.
- The Prometheus examples queried `connection_security_policy` without constraining the reporter. Istio documents this label as populated for destination-reported traffic in sidecar telemetry, so the examples now filter on `reporter="destination"`.

## Review Notes
The remaining Istio API versions, PeerAuthentication and DestinationRule fields, mTLS modes, mesh-wide root namespace behavior, `ISTIO_MUTUAL` usage, `istioctl proxy-config` examples, and Prometheus `connection_security_policy="mutual_tls"` metric usage were consistent with current Istio documentation. The post assumes sidecar mode; ambient mesh has different datapath details, but the sidecar framing is clear throughout the article.
