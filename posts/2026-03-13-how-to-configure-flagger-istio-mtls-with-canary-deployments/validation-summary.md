# Validation Summary: How to Configure Flagger Istio mTLS with Canary Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flagger Canary custom resources
- Istio PeerAuthentication
- Istio DestinationRule TLS settings
- Istio sidecar injection
- Kubernetes kubectl commands
- Flagger load tester webhooks

## Sources Consulted
- Flagger Istio progressive delivery documentation: https://docs.flagger.app/main/tutorials/istio-progressive-delivery
- Flagger FAQ, Istio mutual TLS section: https://docs.flagger.app/faq
- Flagger webhooks documentation: https://docs.flagger.app/main/usage/webhooks
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio TLS configuration guide: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio v1 API announcement: https://istio.io/latest/blog/2024/v1-apis/
- Istio istioctl describe documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-describe/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/

## Issues Found
- Updated Istio PeerAuthentication examples from `security.istio.io/v1beta1` to `security.istio.io/v1`. Istio promoted PeerAuthentication and other networking/security APIs to `v1` in Istio 1.22, and current official examples use the stable API.
- Corrected Flagger Istio gateway references from Kubernetes service FQDN style (`my-gateway.istio-system.svc.cluster.local`) to Istio gateway resource style (`istio-system/my-gateway`), matching Flagger's documented `service.gateways` format.
- Clarified the `portLevelMtls` explanation to say the key is a workload/container port, not a Kubernetes Service port, matching Istio's PeerAuthentication reference.
- Replaced the recommendation to increase `skipAnalysis` with readiness-probe or pre-rollout readiness guidance. `skipAnalysis` is a boolean for promoting without canary analysis, not a tunable delay.

## Review Notes
- The remaining Flagger Canary examples, `trafficPolicy.tls.mode: ISTIO_MUTUAL`, webhook shapes, and `istioctl x describe pod` command are consistent with the official documentation.
- `kubectl label namespace test istio-injection=enabled` is valid, though production runbooks often add `--overwrite` when rerunning against an already labeled namespace.
