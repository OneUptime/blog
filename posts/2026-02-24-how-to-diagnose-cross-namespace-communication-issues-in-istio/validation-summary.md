# Validation Summary: How to Diagnose Cross-Namespace Communication Issues in Istio

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Istio sidecar mode
- Kubernetes namespaces and Services
- Istio Sidecar resources
- Istio AuthorizationPolicy
- Istio PeerAuthentication and mTLS
- Istio DestinationRule and VirtualService
- Kubernetes NetworkPolicy
- kubectl and istioctl

## Sources Consulted
- Istio Sidecar reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio configuration analysis documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Istio mutual TLS migration task: https://istio.io/latest/docs/tasks/security/authentication/mtls-migration/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The basic connectivity curl example said it was "bypassing Istio". From an injected pod, outbound application traffic to a service is normally intercepted by the Istio sidecar, so this wording was misleading. Changed the comment to simply check whether the destination service can be reached.
- The mTLS verification command used `istioctl authn tls-check`, which is not present in the current Istio command reference. Replaced it with `istioctl proxy-config cluster ... --fqdn ... -o json` to inspect the generated Envoy cluster for the destination path.
- The complete diagnostic flow used repeated `-n` flags with `kubectl get peerauthentication`, `kubectl get networkpolicy`, and `istioctl analyze`, which does not query multiple namespaces. Replaced those examples with `--all-namespaces` and namespace filtering where appropriate.

## Review Notes
The configuration examples use current Istio `networking.istio.io/v1` and `security.istio.io/v1` APIs. The VirtualService guidance to prefer fully qualified service hostnames across namespaces matches Istio's documented short-name resolution behavior.
