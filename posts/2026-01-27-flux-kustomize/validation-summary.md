# Validation Summary: How to Use Flux with Kustomize

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- Kubernetes
- Flux CD
- Flux Kustomization custom resources
- Flux GitRepository sources
- Kustomize
- GitOps
- Kubernetes YAML manifests

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux GitHub bootstrap CLI documentation: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux get kustomizations CLI documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux export kustomization CLI documentation: https://fluxcd.io/flux/cmd/flux_export_kustomization/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/

## Issues Found
- Flux post-build substitution precedence was reversed. The post said inline `substitute` values had lower priority than `substituteFrom`; Flux documents that inline `substitute` values take precedence. Updated the comments to reflect the correct priority.
- The variable example used `${IMAGE_TAG}` and `${LOG_LEVEL}` but the ConfigMap example did not define them. Added `IMAGE_TAG` and `LOG_LEVEL` to the ConfigMap so the manifest example has complete substitutions.
- Several Flux Kustomization examples combined `wait: true` with explicit `healthChecks` while describing those explicit checks as active. Flux documents that `spec.healthChecks` is ignored when `spec.wait` is `true`. Removed `wait: true` from examples intended to demonstrate explicit health checks.
- The "Health Check Status Expression" section did not use Flux `healthCheckExprs` or CEL expressions. Renamed it to "Additional Health Checks" and adjusted the snippet comment so it accurately describes the YAML shown.
- A Kustomize overlay comment called a JSON patch a strategic merge patch. Updated the comments to describe the generic `patches` field and the inline JSON patch accurately.
- The overlay used `configMapGenerator.behavior: merge` without showing a matching base generator to merge with. Removed `behavior: merge` so the generator example is valid as written.
- The monitoring section used `flux get kustomization apps -o yaml`, but Flux does not document a singular `get kustomization` command for YAML output. Replaced it with `kubectl get kustomization apps -n flux-system -o yaml`.

## Review Notes
The Flux CLI was not installed in the local environment, so CLI command validation was performed against the official Flux CLI documentation rather than local `--help` output. The remaining examples use current Flux `v1` Kustomization and GitRepository API versions and standard Kustomize `kustomization.config.k8s.io/v1beta1` examples.
