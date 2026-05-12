# Validation Summary: How to Build a Service Mesh Platform with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD v2 (source-controller, helm-controller, kustomize-controller)
- Kubernetes
- Istio 1.21 (base, istiod, PeerAuthentication, VirtualService, DestinationRule, AuthorizationPolicy)
- Helm
- Kiali (operator + CR)
- Prometheus / Grafana (referenced as external services for Kiali)
- GitOps patterns (dependsOn, Kustomization ordering)
- mTLS (PERMISSIVE/STRICT modes)

## Sources Consulted
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRelease docs (dependsOn, cross-namespace references): https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization API (healthChecks field): https://fluxcd.io/flux/components/kustomize/api/v1/
- Istio Helm install guide: https://istio.io/latest/docs/setup/install/helm/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio VirtualService and DestinationRule references: https://istio.io/latest/docs/reference/config/networking/
- Istio MeshConfig / ProxyConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio 1.21 release notes: https://istio.io/latest/news/releases/1.21.x/

## Issues Found

1. **Invalid `healthChecks` field on HelmRelease (Step 1, istiod HelmRelease).**
   The original snippet attached a `spec.healthChecks` list to the `istiod` HelmRelease. The Flux HelmRelease v2 API does **not** have a `spec.healthChecks` field — that field belongs exclusively to the Kustomization API (`kustomize.toolkit.fluxcd.io/v1`). HelmRelease uses `spec.healthCheckExprs` for custom resource checks and otherwise relies on the helm-controller waiting for release resources to become ready.
   **Fix:** Removed the invalid `healthChecks` block and added a one-line note explaining that the helm-controller already waits for release resources to become ready, which is what `dependsOn` consumers rely on for ordering.

2. **Wrong `dependsOn` namespace for the Kiali HelmRelease (Step 5).**
   The Kiali HelmRelease referenced `dependsOn: - name: istiod, namespace: flux-system`, but the `istiod` HelmRelease is deployed in `istio-system`, not `flux-system`. Flux looks the dependency up in the specified namespace, so the dependency would never be found and Kiali would be blocked.
   **Fix:** Changed `namespace: flux-system` to `namespace: istio-system`.

3. **Misleading intro claim about Argo Rollouts.**
   The introduction stated that the post would "implement progressive delivery with Argo Rollouts integration", but the post contains no Argo Rollouts content — progressive delivery is demonstrated via Istio `VirtualService` weighted routing only.
   **Fix:** Rewrote the sentence to describe what the post actually covers (canary routing via VirtualService and zero-trust authorization policies).

## Review Notes

- **API version freshness.** All Istio CRD examples use `*.istio.io/v1beta1`. These versions are still served by Istio 1.21 and remain valid, but the preferred/served version in current Istio (1.22+) is `*.istio.io/v1`. Left unchanged because the post pins to `1.21.x` and v1beta1 is fully functional there; future iterations could migrate to `v1` once readers are likely on 1.22+.
- **`HelmRepository` for Kiali not shown.** Step 5 references a `HelmRepository` named `kiali`, but does not define it inline. The Kiali Helm repo is at `https://kiali.org/helm-charts` — readers would need to create that `HelmRepository` resource analogously to the Istio one in Step 1. Not technically wrong, just an implicit step.
- **`PeerAuthentication` root namespace.** The mesh-wide PeerAuthentication is placed in `istio-system`, which is correct for the default `meshConfig.rootNamespace`. If a deployment overrides `rootNamespace`, the policy must move accordingly — worth a passing mention in a future revision.
- **Best practice tension.** The post installs istiod with `meshConfig` implying STRICT-via-PeerAuthentication, and the Best Practices section also recommends starting in `PERMISSIVE` before switching to `STRICT`. These are consistent (the mesh-wide PeerAuthentication is what flips the mode) but could be made more explicit for first-time readers.
- **Grammar nit (not changed):** "becomes a archaeology project" should read "an archaeology project" — left as-is since instructions limit edits to technical corrections.
