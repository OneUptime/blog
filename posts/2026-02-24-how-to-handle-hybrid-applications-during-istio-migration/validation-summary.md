# Validation Summary: How to Handle Hybrid Applications During Istio Migration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio sidecar mode
- Kubernetes
- Istio PeerAuthentication and mTLS
- Istio AuthorizationPolicy
- Istio VirtualService and DestinationRule
- Istio ServiceEntry
- Kiali
- Prometheus and Grafana

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio Mutual TLS Migration task: https://istio.io/latest/docs/tasks/security/authentication/mtls-migration/
- Istio Authentication Policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Authorization Policy Conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio security concepts: https://istio.io/latest/docs/concepts/security/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio protocol selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Kiali security feature documentation: https://kiali.io/docs/features/security/
- Kiali access documentation: https://kiali.io/docs/installation/installation-guide/accessing-kiali/

## Issues Found
- Updated Istio API examples from `security.istio.io/v1beta1` and `networking.istio.io/v1beta1` to the current documented `v1` API versions for PeerAuthentication, AuthorizationPolicy, VirtualService, and ServiceEntry.
- Fixed the hybrid AuthorizationPolicy example, which had a duplicate `source` key in the same YAML mapping. The corrected rule uses a single `source` block with `notPrincipals: ["*"]`.
- Added a caveat that plaintext non-meshed callers cannot be narrowed by Istio source namespace or principal because those attributes require Istio identity from mTLS. The post now suggests source IP ranges or Kubernetes network controls for narrowing plaintext callers.
- Added the missing DestinationRule required by the canary VirtualService subsets. Istio subsets referenced by a VirtualService must be declared in a corresponding DestinationRule.

## Review Notes
The post is technically relevant and accurate after the corrections above. `kubectl` was not installed in the local workspace, so command syntax was checked against official documentation rather than local CLI help.
