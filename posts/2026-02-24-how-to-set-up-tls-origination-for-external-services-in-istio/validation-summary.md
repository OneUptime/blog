# Validation Summary: How to Set Up TLS Origination for External Services in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio ServiceEntry
- Istio DestinationRule
- Istio VirtualService
- Istio Gateway and egress gateway
- TLS origination and mutual TLS
- Kubernetes Secrets and RBAC
- istioctl proxy-config

## Sources Consulted
- Istio Egress TLS Origination: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-tls-origination/
- Istio Egress Gateways with TLS Origination: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-gateway-tls-origination/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes kubectl create secret generic reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The basic sidecar TLS origination example attached TLS settings to destination port 443 and used a VirtualService to route HTTP traffic to port 443. Istio's documented sidecar pattern uses `targetPort: 443` on the HTTP ServiceEntry port and applies the DestinationRule TLS policy to service port 80. Updated the ServiceEntry, DestinationRule, and optional VirtualService accordingly.
- The mutual TLS example used `credentialName` for sidecar origination without a `workloadSelector`. Istio documents that `credentialName` is applicable at sidecars only when the DestinationRule has a `workloadSelector`; otherwise it applies at gateways. Added a workload selector, changed the TLS policy to service port 80, and corrected the secret namespace guidance.
- The mutual TLS secret command placed the sidecar credential in `istio-system`, which is only appropriate for the default egress gateway case. Changed the command to create the secret in the application namespace and added the RBAC commands needed for the selected workload service account to access the credential.
- The egress gateway example sent plain HTTP to the gateway and omitted the DestinationRule that configures Istio mutual TLS from sidecars to the egress gateway. Updated the Gateway server to HTTPS with `ISTIO_MUTUAL`, added the egress gateway DestinationRule and subset, and kept TLS origination to the external service on port 443.
- The egress gateway ServiceEntry used protocol `TLS` on port 443 even though the example is for HTTP requests that are originated as HTTPS by Istio. Changed it to `HTTPS`, matching Istio's TLS origination examples.
- The multiple external services example only defined port 443 and configured destination-level TLS, which would not support the article's plain HTTP application-call pattern. Added an HTTP service port with `targetPort: 443` and changed each DestinationRule to apply TLS on port 80.

## Review Notes
The corrected examples align with Istio 1.30 documentation. The post intentionally uses placeholder hosts such as `api.example.com`; a real deployment must replace them with real hostnames, workload labels, namespaces, and service accounts.
