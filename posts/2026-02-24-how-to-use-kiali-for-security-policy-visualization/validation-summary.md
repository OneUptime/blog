# Validation Summary: How to Use Kiali for Security Policy Visualization

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kiali
- Istio
- PeerAuthentication
- AuthorizationPolicy
- DestinationRule
- mTLS
- Kubernetes YAML

## Sources Consulted
- Kiali Security documentation: https://kiali.io/docs/features/security/
- Kiali Validation documentation: https://kiali.io/docs/features/validations/
- Kiali Graph FAQ: https://kiali.io/docs/faq/graph/
- Kiali Topology documentation: https://kiali.io/docs/features/topology/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio TLS configuration guide: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/

## Issues Found
- Corrected the description of Kiali's graph security display. Kiali shows mTLS information on edges and calculates the mTLS percentage from Istio telemetry; a lock means mTLS traffic was observed, not that Kiali is directly proving every possible connection is encrypted.
- Corrected the mesh-wide mTLS status location and states. Current Kiali documentation places the mesh indicator on the Mesh page's Istio control plane panel and documents closed/open or hollow lock states, not a toolbar lock with exclamation/no-lock states.
- Corrected the PeerAuthentication validation claim. Kiali validates PeerAuthentication conflicts such as multiple selector-less policies or multiple policies applying to the same workload; the post previously overstated that Kiali validates all weakening overrides.
- Corrected the namespace PERMISSIVE statement. Kiali represents namespace mTLS status with lock indicators; the post previously described a warning that is not documented as such.
- Corrected AuthorizationPolicy graph claims. Kiali's Security graph display is documented for mTLS edge status; AuthorizationPolicy review should use Istio Config and workload validations rather than graph authorization badges.
- Narrowed the AuthorizationPolicy validation examples to documented Kiali checks, including missing namespaces, service accounts, and hosts.

## Review Notes
The Istio YAML snippets use current `security.istio.io/v1` and `networking.istio.io/v1` APIs and the fields shown are valid for current Istio documentation. The allow-all AuthorizationPolicy example with `rules: - {}` is correct because Istio documents an empty rule as always matched.
