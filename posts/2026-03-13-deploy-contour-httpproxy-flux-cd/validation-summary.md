# Validation Summary: How to Deploy Contour with HTTPProxy via Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Flux CD HelmRepository, HelmRelease, and Kustomization APIs
- Kubernetes manifests and kubectl verification commands
- Contour HTTPProxy and TLSCertificateDelegation CRDs
- Envoy proxy through the Bitnami Contour Helm chart
- cert-manager-managed TLS secrets

## Sources Consulted
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease documentation and v2 API reference: https://fluxcd.io/flux/components/helm/helmreleases/ and https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Contour HTTPProxy API reference: https://projectcontour.io/docs/main/config/api-reference/
- Contour TLS termination documentation: https://projectcontour.io/docs/main/config/tls-termination/
- Contour TLS delegation documentation: https://projectcontour.io/docs/main/config/tls-delegation/
- Bitnami Contour chart values for the pinned 19.x range: https://charts.bitnami.com/bitnami/contour-19.5.13.tgz
- Contour v1.30.3 CLI source for `contour cli` flags: https://github.com/projectcontour/contour/blob/v1.30.3/cmd/contour/cli.go

## Issues Found
- The HelmRelease snippet placed the release in the `projectcontour` namespace without creating that namespace. Added a `Namespace` manifest before the HelmRelease so Flux can apply the resource successfully.
- The Envoy `replicaCount: 2` setting was described as high availability, but the Bitnami chart defaults Envoy to `daemonset`, where replica count is not the relevant scaling control. Added `envoy.kind: deployment` so the replica count does what the text says.
- The root HTTPProxy used a same-namespace TLS secret while the TLS delegation example delegated a different central certificate to application namespaces that do not define virtual hosts. Updated the root HTTPProxy to reference `cert-manager/wildcard-example-tls` and changed TLSCertificateDelegation to delegate that central secret to `projectcontour`.
- The `enableFallbackCertificate: false` comment incorrectly described route delegation. Changed the comment to describe fallback certificate routing.
- The HTTPProxy `healthCheckPolicy` was nested under an individual service, but Contour defines HTTP health checks at the route level. Moved `healthCheckPolicy` to the route.
- The Flux Kustomization health check targeted the rendered Deployment. Flux documentation recommends checking the HelmRelease when a Kustomization contains HelmRelease resources, so the health check was changed to `helm.toolkit.fluxcd.io/v2` `HelmRelease`.
- The Contour CLI command used an unsupported `--port=8001` flag. The Contour CLI uses `--contour` for host:port and defaults to `127.0.0.1:8001`, so the example was simplified to `contour cli routes`.
- The best-practice note said health checks are configured on backend services. Updated it to say HTTPProxy routes, matching Contour's API.

## Review Notes
The Bitnami chart range `>=19.0.0 <20.0.0` maps to Contour 1.30.x-era chart releases; newer Bitnami chart majors exist, but the post is internally versioned to 19.x and the reviewed values match that range.
