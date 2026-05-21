# Validation Summary: How to Design Istio Architecture for SaaS Applications

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio service mesh
- Kubernetes namespaces and labels
- Istio Sidecar resources
- Istio AuthorizationPolicy resources
- Istio VirtualService and DestinationRule resources
- Istio EnvoyFilter-based rate limiting
- IstioOperator control plane configuration
- Envoy local and global rate limiting

## Sources Consulted
- Istio Sidecar API reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio AuthorizationPolicy API reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio VirtualService API reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio EnvoyFilter API reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio rate limiting task documentation: https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- IstioOperator options reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio pilot-discovery environment variables reference: https://istio.io/latest/docs/reference/commands/pilot-discovery/

## Issues Found
- Updated Istio networking resources from `networking.istio.io/v1beta1` to `networking.istio.io/v1` for `Sidecar`, `VirtualService`, and `DestinationRule` examples, matching the current stable API used in Istio documentation.
- Replaced the invalid shared-services `Sidecar` host entry `*/tenant-*.svc.cluster.local`. Istio `Sidecar` egress hosts use `namespace/dnsName`, and the namespace part supports `*`, `.`, `~`, or an explicit namespace, not prefix patterns like `tenant-*`. The example now lists tenant namespaces explicitly and explains that onboarding automation should generate them.
- Clarified the local rate limiting example as coarse API gateway sidecar-level limiting. The shown Envoy local rate limit filter is per proxy instance and does not implement tenant-specific quotas by itself.
- Changed `PILOT_DEBOUNCE_MAX` from `3s` to `15s` because Istio documents the default as `10s`; the original value contradicted the text saying the debounce values were being increased to reduce push frequency.

## Review Notes
The examples remain illustrative and assume sidecar mode with namespace-level injection. For production, the EnvoyFilter example should be tested against the exact Istio proxy version because Istio documents EnvoyFilter patches as tied to Envoy internals and requiring care during upgrades.
