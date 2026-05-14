# Validation Summary: How to Write Integration Tests for Flux CD Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- kubectl
- Bash
- Go
- controller-runtime Kubernetes client
- Flux source-controller and kustomize-controller APIs
- Flux helm-controller HelmRelease resources
- GitHub Actions
- Kind

## Sources Consulted
- Flux CLI `flux reconcile kustomization` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux Kustomization documentation, including `dependsOn`, Ready conditions, health checks, and drift correction: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation, including Ready conditions and drift detection behavior: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux GitHub Action documentation: https://fluxcd.io/flux/flux-gh-action/
- Flux HelmRepository documentation, including Ready conditions and artifacts: https://fluxcd.io/flux/components/source/helmrepositories/
- Kubernetes `kubectl wait` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes EndpointSlice documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Endpoints deprecation notice for v1.33: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/

## Issues Found
- The Bash `assert_resource_exists` helper always passed `-n`, which is inappropriate for cluster-scoped resources such as `Namespace`. Updated the helper to omit `-n` when an empty namespace is supplied, and changed namespace assertions to use cluster scope.
- The Go test example imported `controller-runtime`'s `client` package but did not use it, and referenced helper functions that were not defined. Added minimal `getK8sClient` and `waitForKustomizationCondition` helpers using current Kubernetes and Flux API schemes.
- The Go test compared Flux condition status values to a string literal. Updated the sample to compare with `metav1.ConditionTrue`.
- The Kustomization dependency test claimed it verified dependency ordering by reading `lastAppliedRevision`, but that field is a revision, not an ordering timestamp. Updated the comments and variable names so the code records revisions for diagnostics instead of implying ordering verification.
- The application health test used the deprecated Kubernetes `Endpoints` API. Updated it to check `EndpointSlice` resources via the `kubernetes.io/service-name` label.
- The pod health test comment said it checked readiness, but the command only checked pod phase. Updated the command to count pods whose `Ready` condition is not `True`.

## Review Notes
- The examples remain illustrative and assume resource names such as `fleet-repo`, `apps`, `infrastructure`, and `my-app` exist in the test cluster.
- The GitHub Actions workflow uses `fluxcd/flux2/action@main`, which is supported by the Flux documentation. Pinning a specific action version or Flux CLI version would improve reproducibility but is not required for correctness.
- HelmRelease drift correction requires `.spec.driftDetection.mode: enabled`; Kustomization-managed resources are reconciled and drift-corrected by kustomize-controller according to their reconciliation interval and server-side apply behavior.
