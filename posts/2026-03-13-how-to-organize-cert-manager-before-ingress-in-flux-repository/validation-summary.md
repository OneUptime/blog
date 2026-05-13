# Validation Summary: How to Organize Cert-Manager Before Ingress in Flux Repository

## Status
validated

## Post Type
Tutorial / GitOps configuration guide

## Technologies Covered
- Flux Kustomization resources
- Flux HelmRelease resources
- Kubernetes Ingress
- cert-manager
- Helm repositories and charts
- Let's Encrypt ACME HTTP-01 issuers
- kubectl and Flux CLI commands

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux CLI `flux get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- cert-manager v1.14 Helm installation documentation: https://cert-manager.io/v1.14-docs/installation/helm/
- cert-manager Ingress usage documentation: https://cert-manager.io/docs/usage/ingress/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes `kubectl describe` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/

## Issues Found
- The repository tree omitted `infrastructure/cert-manager/helmrepository.yaml`, but the later Kustomize example includes that file. Added it to the tree for consistency.
- The opening explanation overstated the failure mode when an Ingress references an unavailable issuer. Updated it to say certificate provisioning waits until the issuer is available and the Ingress will not serve the expected certificate.
- The explicit health-check example used `wait: true` together with `healthChecks`. Flux documentation states that `.spec.healthChecks` is ignored when `.spec.wait` is true, so the example now uses explicit `healthChecks` without `wait: true`.
- The conclusion said `dependsOn` and `wait: true` were the mechanism for every layer. Updated it to include either `wait: true` or explicit `healthChecks`, matching the corrected examples.

## Review Notes
- The cert-manager HelmRelease pins the chart to the `1.14.x` series, where the documented Helm value `installCRDs: true` is appropriate.
- The example uses the `nginx` ingress class for HTTP-01 solving. Current cert-manager documentation notes ingress-nginx end-of-life timing and Gateway API migration guidance, but the shown cert-manager and Kubernetes fields remain technically valid as an ingress-based example.
