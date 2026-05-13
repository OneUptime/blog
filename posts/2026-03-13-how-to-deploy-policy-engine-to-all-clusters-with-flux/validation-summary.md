# Validation Summary: How to Deploy Policy Engine to All Clusters with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux
- Kubernetes
- GitOps
- Kyverno
- Helm
- Kustomize
- Kubernetes Policy Reports

## Sources Consulted
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization post-build substitution documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI reconcile documentation: https://fluxcd.io/flux/cmd/flux_reconcile/
- Kyverno installation documentation: https://main.kyverno.io/docs/installation/installation/
- Kyverno Helm chart README and values reference: https://github.com/kyverno/kyverno/tree/main/charts/kyverno
- Kyverno validate rules documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno policy exceptions documentation: https://kyverno.io/docs/guides/exceptions/
- Kyverno policy reports documentation: https://kyverno.io/docs/guides/reports/
- Kyverno disallow privileged containers sample policy: https://kyverno.io/policies/pod-security/baseline/disallow-privileged-containers/disallow-privileged-containers/

## Issues Found
- The Kyverno Helm values used `replicaCount` and top-level `resources`, which are v2 chart values replaced in the v3 chart. Updated the example to use `admissionController.replicas`, `admissionController.container.resources`, and per-controller replica settings.
- The `config.webhooks` value was shown as a list, but the Kyverno v3 chart expects an object containing webhook selectors. Updated it to use a `namespaceSelector` object.
- The post used `spec.validationFailureAction`, which Kyverno marks as deprecated. Moved enforcement mode to each rule's `validate.failureAction`.
- The privileged container policy required `securityContext.privileged: false` and `initContainers`, which would reject Pods that simply omit those optional fields. Updated it to use Kyverno equality anchors so omitted fields are allowed while explicit privileged mode is rejected.
- The PolicyException example requires Kyverno PolicyExceptions to be enabled. Added the relevant Helm chart feature settings and restricted exceptions to the `kube-system` namespace used by the example.
- The Flux Kustomization example depended on a `crds` Kustomization not defined anywhere in the article, while the HelmRelease already installs Kyverno CRDs using `CreateReplace`. Removed the undefined dependency.

## Review Notes
ClusterPolicy remains supported but appears in Kyverno's documentation under deprecated policy types as Kyverno continues adding newer policy APIs. A future article update could migrate examples to the newer Kyverno policy APIs, but the corrected ClusterPolicy examples are valid for the current chart and documented API.
