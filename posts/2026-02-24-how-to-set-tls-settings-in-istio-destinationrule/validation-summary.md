# Validation Summary: How to Set TLS Settings in Istio DestinationRule

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Istio
- DestinationRule
- ServiceEntry
- Envoy TLS origination
- Istio mutual TLS
- Kubernetes Secrets
- istioctl

## Sources Consulted
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio TLS configuration overview: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio Egress TLS Origination task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-tls-origination/
- Istio Accessing External Services task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-control/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Understand your Mesh with Istioctl Describe: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-describe/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/

## Issues Found
- The SIMPLE examples described ordinary external HTTPS access as if a DestinationRule with `mode: SIMPLE` should always be used. Istio's TLS origination examples use SIMPLE when Envoy originates TLS for plaintext HTTP traffic, commonly with a ServiceEntry HTTP port and `targetPort: 443`. I changed the text and examples to show TLS origination on port 80 and clarified that applications already sending HTTPS usually only need an HTTPS ServiceEntry, not TLS origination for the same connection.
- The ServiceEntry plus DestinationRule example used `protocol: HTTPS` on port 443 together with `mode: SIMPLE`, which can lead to unintended double TLS when the application already uses HTTPS. I changed the example to the documented TLS origination pattern with an HTTP port, `targetPort: 443`, and port-level SIMPLE TLS.
- The verification section used `istioctl authn tls-check`, which is not present in the current Istio 1.30 command reference. I replaced it with `istioctl experimental describe pod <pod-name>`, which the official diagnostics guide documents for checking DestinationRules and mTLS-related warnings affecting a pod.
- The post said mTLS certificates would appear as certificate paths for Istio SDS-provided certificates. Current Envoy configuration typically shows SDS secret references, so I corrected that wording.
- The conclusion said `ISTIO_MUTUAL` is the default for in-mesh services. I changed this to say auto mTLS is the default behavior and usually requires no DestinationRule TLS configuration.

## Review Notes
The remaining YAML snippets use current `networking.istio.io/v1` and `security.istio.io/v1` API concepts and valid DestinationRule TLS fields. For future maintenance, examples that use file-mounted certificates could also be expanded to show `credentialName` with a `workloadSelector`, which is the documented SDS pattern for sidecars.
