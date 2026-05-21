# Validation Summary: How to Implement End-to-End Encryption with Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio Gateway
- Istio mutual TLS
- Istio PeerAuthentication
- Istio AuthorizationPolicy
- Istio DestinationRule
- Istio ServiceEntry
- Kubernetes Service and TLS secrets
- cert-manager Certificate resources
- tcpdump

## Sources Consulted
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio TLS configuration guide: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio authentication policy guide: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio security policy examples: https://preliminary.istio.io/latest/docs/ops/configuration/security/security-policy-examples/
- Istio egress TLS origination guide: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-tls-origination/
- Istio istioctl describe guide: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-describe/
- Istio proxy-config command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes kubectl create secret tls reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- cert-manager Certificate API reference: https://cert-manager.io/docs/reference/api-docs/

## Issues Found
- The first gateway TLS example described configuring an external load balancer certificate, but the YAML configures TLS termination on the Istio ingress gateway. Updated the wording to specify the load balancer forwards TLS through to Istio.
- The sidecar-to-application section used a DestinationRule with `tls.mode: DISABLE`, which would disable Istio TLS origination for that destination and conflict with the post's STRICT mTLS guidance. Replaced it with a Kubernetes Service example using a TLS-named port and clarified that application TLS is handled by the app while Envoy passes the traffic through.
- The service-to-service sidecar check stated that any pod without a sidecar is always a gap. Qualified this for sidecar mode, because Istio ambient mode does not use sidecars for every workload.
- The gateway authorization policy allowed port `8443` while the gateway example used HTTPS port `443`. Updated the policy to match port `443`.
- The `istioctl proxy-config cluster --fqdn` example passed an Envoy cluster name string instead of a service FQDN. Updated it to pass `service-b.default.svc.cluster.local`, matching the documented `--fqdn` usage.
- The external service TLS origination example applied `tls.mode: SIMPLE` directly to port 443, which can be misleading for normal HTTPS calls. Updated it to the documented TLS origination pattern: HTTP on port 80 with `targetPort: 443` and a port-level `DestinationRule` that originates TLS.
- Clarified that Istio's default auto-SNI and auto-SAN validation use the downstream HTTP host/authority when explicit SNI and SAN values are not configured, instead of making the broader claim that `SIMPLE` always verifies against public CAs.
- Updated the external mutual TLS snippet to use the same port-level settings pattern as the corrected TLS origination example.

## Review Notes
Local `istioctl` and `kubectl` binaries were not installed in the review environment, so command behavior was verified against official command references and Istio documentation rather than local `--help` output.
