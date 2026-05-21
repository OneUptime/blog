# Validation Summary: How to Install Istio Sidecar for HTTPS Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio sidecar proxies
- Istio mutual TLS
- Kubernetes Deployments and Services
- Istio PeerAuthentication
- Istio DestinationRule
- Istio ServiceEntry
- TLS origination and HTTPS passthrough
- Istio sidecar traffic capture annotations
- Istio workload certificates and SDS

## Sources Consulted
- Istio TLS Configuration: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio Protocol Selection: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio Egress TLS Origination task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-tls-origination/
- Istio Resource Annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Securing Prometheus Scraping task, for OUTPUT_CERTS usage: https://istio.io/latest/docs/tasks/observability/metrics/secure-metrics/

## Issues Found
- Corrected the opening explanation and problem section. The original post said the server sidecar forwards plaintext to an HTTPS application after decrypting Istio mTLS. Istio forwards local inbound traffic as-is, so app-originated HTTPS remains HTTPS after the Istio mTLS layer is removed.
- Corrected Option 1 wording. Istio mTLS encrypts proxy-to-proxy traffic, but it is not exactly the same as application-level end-to-end HTTPS semantics.
- Corrected Option 2 DestinationRule. The original `tls.mode: SIMPLE` would tell the client sidecar to originate TLS, which is wrong for traffic where the application already sends HTTPS. Changed it to `DISABLE` and used a fully qualified service host.
- Corrected Option 3 TLS origination. TLS origination should be configured for plaintext HTTP traffic, typically on an HTTP service port, and the DestinationRule should apply to that HTTP port. Added the matching Service example and changed the port-level setting from 443 to 80.
- Corrected external HTTPS guidance. The original ServiceEntry plus `DestinationRule` `tls.mode: SIMPLE` would cause sidecar TLS origination on traffic that the application already encrypted with HTTPS. Removed the incorrect DestinationRule and clarified that `SIMPLE` is only for sidecar-originated TLS from plaintext HTTP.
- Corrected verification examples to distinguish application TLS passthrough from sidecar TLS origination.
- Added a caveat to the SDS certificate-sharing section. Istio workload certificates can be read by an application, but they are SPIFFE workload identity certificates and are not a direct replacement for public DNS HTTPS certificates.

## Review Notes
The Kubernetes Deployment snippets are illustrative and omit production fields such as deployment selectors and pod template labels in some examples. That is acceptable for a focused blog post, but full manifests should include the required Kubernetes Deployment selector fields before being applied directly.
