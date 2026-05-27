# Validation Summary: How to Configure Istio mTLS for Zero-Trust Service Communication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio service mesh
- Istio mutual TLS (mTLS)
- Istio PeerAuthentication
- Istio AuthorizationPolicy
- Istio DestinationRule and ServiceEntry
- istioctl
- Kubernetes
- Prometheus metrics

## Sources Consulted
- Istio Security Concepts: https://istio.io/latest/docs/concepts/security/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Egress TLS Origination task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-tls-origination/
- Istio mTLS verification with metrics: https://istio.io/latest/docs/ambient/usage/verify-mtls-enabled/

## Issues Found
- The introduction said mTLS ensures connections are authorized. Changed this to state that mTLS authenticates and encrypts connections, while Istio AuthorizationPolicy handles authorization.
- The certificate lifecycle diagram used SPIFFE IDs under `spiffe://cluster/...`. Changed them to `spiffe://cluster.local/...`, matching Istio's default trust domain format.
- Istio API examples used `security.istio.io/v1beta1` and `networking.istio.io/v1beta1`. Updated them to the current stable `security.istio.io/v1` and `networking.istio.io/v1` forms used in current Istio documentation.
- The workload-level mTLS snippet said `PERMISSIVE` allowed plaintext on a metrics port. Clarified that `PERMISSIVE` accepts both mTLS and plaintext.
- The listener verification comment overstated what `istioctl proxy-config listeners` verifies. Changed it to say it inspects inbound listener configuration for one workload.
- The certificate details command included a Python stub that did not actually display certificate validity. Replaced it with `istioctl proxy-config secret productpage-v1-xxxxx`, which is the supported command for viewing proxy secret and certificate details.
- The Prometheus query looked only for `connection_security_policy="none"`, which is not the value shown in current Istio examples. Changed it to find series where `connection_security_policy!="mutual_tls"`.
- The external mTLS example applied TLS settings directly to an HTTPS ServiceEntry port. Updated it to the documented TLS-origination pattern: HTTP service port `80` with `targetPort: 443`, `portLevelSettings`, and `mode: MUTUAL` for the sidecar-originated upstream TLS connection.

## Review Notes
The examples are written for sidecar-mode Istio. Ambient-mode Istio has different verification commands and does not support `DISABLE` peer authentication mode, so a future version of the post could call out the deployment mode explicitly.
