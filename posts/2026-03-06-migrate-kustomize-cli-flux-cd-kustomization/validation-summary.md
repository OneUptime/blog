# Validation Summary: How to Migrate from Kustomize CLI to Flux CD Kustomization

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Flux CD
- Flux Kustomization CRD
- Kustomize
- Kubernetes
- HorizontalPodAutoscaler
- GitOps
- GitHub Actions
- SOPS

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux bootstrap GitHub command reference: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux bootstrap command reference: https://fluxcd.io/flux/cmd/flux_bootstrap/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/

## Issues Found
- The Kustomize examples used `commonLabels`, which current Kustomize versions warn is deprecated. Changed the examples to use the current `labels` field, with `includeSelectors: true` where selector labels are intended.
- The production example configured an HPA while also setting Deployment `spec.replicas` through the base manifest and a production replica patch. Kubernetes recommends removing `spec.replicas` from manifests when an HPA manages the workload's replicas, because repeated apply/reconcile operations can reset the HPA-managed count. Removed the base replica count and production replica patch from the HPA-enabled example.
- The drift detection test manually scaled the Deployment and expected Flux to restore the replica count. That conflicts with the corrected HPA setup, where the HPA should manage replicas. Changed the drift test to add a manual annotation and verify that Flux removes it on reconciliation.
- The comparison table said variable substitution is not available in Kustomize CLI. Kustomize supports replacement-style mechanisms, but Flux adds post-build substitution through `postBuild.substitute`. Narrowed the table row to "Post-build variable substitution."

## Review Notes
The remaining snippets are technically valid illustrative examples and assume supporting cluster components and credentials exist, such as Flux controllers, a bootstrapped `GitRepository`, an ingress controller, cert-manager, metrics-server for HPA CPU metrics, SOPS keys, and CI permissions to commit back to the repository. The Flux `wait: true` and `healthChecks` behavior is accurate as shown, with the caveat that Flux ignores explicit `healthChecks` when `wait: true` is set.
