# Validation Summary: How to Migrate from Sidecar Mode to Ambient Mode in Istio

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Istio ambient mode
- Istio sidecar mode
- Kubernetes
- Helm
- istioctl
- Istio AuthorizationPolicy and PeerAuthentication
- Istio waypoint proxies and ztunnel
- Gateway API HTTPRoute

## Sources Consulted
- Istio ambient migration overview: https://istio.io/latest/docs/ambient/migrate/
- Istio migration prerequisites: https://istio.io/latest/docs/ambient/migrate/before-you-begin/
- Istio install ambient components migration step: https://istio.io/latest/docs/ambient/migrate/install-ambient-components/
- Istio migrate policies guide: https://istio.io/latest/docs/ambient/migrate/migrate-policies/
- Istio enable ambient mode guide: https://istio.io/latest/docs/ambient/migrate/enable-ambient-mode/
- Istio ambient install with istioctl: https://istio.io/latest/docs/ambient/install/istioctl/
- Istio ambient install with Helm: https://istio.io/latest/docs/ambient/install/helm/
- Istio L4 authorization policy in ambient mode: https://istio.io/latest/docs/ambient/usage/l4-policy/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio ambient mode GA announcement for Istio 1.24: https://istio.io/latest/blog/2024/ambient-reaches-ga/

## Issues Found
- The post described the migration as zero-downtime without qualification. Updated it to note that L4-only configurations can avoid downtime, while L7 policies and routing currently require planning for an enforcement gap.
- The istioctl command used `istioctl install --set profile=ambient` for an existing sidecar installation. Changed it to `istioctl upgrade --set profile=ambient`, matching Istio's migration guidance.
- The Helm commands installed only CNI and ztunnel and omitted the ambient profile upgrade for istiod/CNI. Updated them to upgrade base and istiod, and to install or upgrade CNI and ztunnel with the ambient profile where required.
- The post said the sidecar injector webhook should appear as a pod. Corrected this because injection is managed by istiod, not by a separate sidecar injector pod.
- The post omitted the requirement to restart existing sidecar workloads so sidecars pick up ambient HBONE support. Added that restart step before namespace migration.
- The AuthorizationPolicy section incorrectly stated that all selector-based policies need `targetRefs`. Corrected it to distinguish L4 policies, which can keep selectors and are enforced by ztunnel, from L7 policies, which require waypoint enforcement and `targetRefs`.
- The example AuthorizationPolicy was L4-only but was presented as requiring `targetRefs`. Updated the example to include an HTTP method so it is truly an L7 policy.
- The PeerAuthentication section claimed PERMISSIVE is required for sidecar and ambient interoperability. Corrected this to state that STRICT is not a blocker and PERMISSIVE is only useful when plaintext or non-mesh clients must be allowed during validation.
- The namespace migration order removed sidecar injection before enabling ambient mode. Updated it to label the namespace for ambient mode first, verify enrollment, and then remove injection.
- The waypoint section deployed waypoints after pod rollout. Updated it to state that namespaces with L7 policy or routing should deploy and activate waypoints before restarting workloads without sidecars.
- The post implied VirtualService routing is generally suitable in ambient mode. Added the current caveat that stable ambient L7 routing should use Gateway API HTTPRoute because VirtualService support with waypoints is alpha.
- The cross-namespace communication section oversimplified sidecar/ambient interoperability and relied on PERMISSIVE. Updated it to mention HBONE support and the waypoint bypass behavior for sidecar-mode sources.
- The cleanup section recommended deleting the sidecar injector webhook. Replaced that with safer cleanup of injection labels and noted that the injector webhook is managed by istiod and should not be deleted from the active control plane.

## Review Notes
The post is technically relevant and useful after correction. It remains a concise migration guide rather than a full replacement for Istio's official migration sequence, so future updates should re-check Istio's ambient migration docs for changes in L7 migration guarantees and VirtualService support status.
