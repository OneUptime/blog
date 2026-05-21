# Validation Summary: How to Debug DestinationRule Configuration Problems

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Istio DestinationRule
- Istio VirtualService
- Istio PeerAuthentication and mTLS
- istioctl
- Envoy proxy configuration and stats
- Kubernetes kubectl

## Sources Consulted
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio traffic management best practices: https://istio.io/latest/docs/ops/best-practices/traffic-management/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio diagnose configuration with istioctl analyze: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Istio understand your mesh with istioctl describe: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-describe/
- Istio authentication policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/

## Issues Found
- The post said multiple DestinationRules for the same host in the same namespace cause undefined behavior. Current Istio documentation describes merge semantics with restrictions: duplicate subset names and duplicate top-level traffic policies are not merged, and later duplicates are discarded. Updated the wording to match that behavior.
- The post said a DestinationRule in namespace A only applies to traffic originating from namespace A. Istio actually searches the client namespace, service namespace, then the mesh root namespace, subject to export visibility. Updated the namespace section and conflict guidance to describe that lookup path.
- The post used `istioctl authn tls-check`, which is not present in the current Istio command reference. Replaced it with `istioctl experimental describe pod <pod-name>`, which current Istio documentation uses to report DestinationRule TLS mode and TLS conflicts.
- The TLS fix section implied that workloads without sidecars generally require `mode: DISABLE`. Current Istio auto mTLS sends plaintext to workloads without sidecars by default. Updated the guidance to say this is only needed when an explicit mTLS DestinationRule override was configured, and to remove the override or set `DISABLE`.
- The outlier detection section said `consecutive5xxErrors` only counts HTTP 5xx status codes. Current DestinationRule documentation also counts connection timeouts, connection failures, and request failures for opaque TCP traffic. Updated the paragraph and clarified when `consecutiveGatewayErrors` is useful.

## Review Notes
The remaining examples are intentionally generic and require substituting real pod, service, namespace, and port values. `istioctl experimental describe` is still marked experimental in Istio's command reference, but it is the current documented replacement for inspecting pod-level DestinationRule and TLS effects.
