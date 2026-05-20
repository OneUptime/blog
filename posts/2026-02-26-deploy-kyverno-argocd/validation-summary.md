# Validation Summary: How to Deploy Kyverno with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kyverno
- Argo CD
- Kubernetes
- Helm
- kubectl
- Prometheus ServiceMonitor

## Sources Consulted
- Kyverno Helm chart repository index and chart values for chart `kyverno` version `3.3.1`: https://kyverno.github.io/kyverno/index.yaml and https://kyverno.github.io/kyverno/kyverno-3.3.1.tgz
- Kyverno installation customization and webhook failure policy documentation: https://kyverno.io/docs/installation/customization/
- Kyverno ClusterPolicy validation rule documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno ClusterPolicy policy settings documentation: https://kyverno.io/docs/policy-types/cluster-policy/policy-settings/
- Kyverno generate rule documentation: https://kyverno.io/docs/policy-types/cluster-policy/generate/
- Kyverno official disallow privileged containers policy: https://kyverno.io/policies/pod-security/baseline/disallow-privileged-containers/disallow-privileged-containers/
- Argo CD directory source documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/directory/
- Argo CD diff customization documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Kubernetes kubectl `run` command source for `--privileged`: https://github.com/kubernetes/kubectl/blob/master/pkg/cmd/run/run.go

## Issues Found
- The Kyverno Helm values used `admissionController.container.args` with `--webhookFailurePolicy=Ignore`, but the Kyverno 3.3.1 chart expects additional admission-controller arguments under `admissionController.container.extraArgs`, and the documented global way to force generated webhook failure policies to `Ignore` is `forceFailurePolicyIgnore`. Changed the example to use `features.forceFailurePolicyIgnore.enabled: true`.
- The Kyverno policy examples used top-level `spec.validationFailureAction`, which is deprecated as of Kyverno 1.13. Moved the action to each validate rule as `validate.failureAction`.
- The privileged-container policy required every container to explicitly define `securityContext.privileged: false`. The official baseline policy allows the field to be unset or false, matching Kubernetes default behavior. Updated the pattern to use Kyverno optional anchors for `securityContext` and `privileged`.
- The policy Application pointed Argo CD at a directory containing nested policy subdirectories but did not enable recursive resource detection. Added `source.directory.recurse: true`.
- The drift-handling guidance said to apply Kyverno mutations in Audit mode, but mutation rules do not use validation `Audit` / `Enforce` behavior. Reworded the guidance to update Git manifests before enabling mutating policies for Argo CD-managed resources.
- Updated namespace resource filters to the current chart-style `*/*` kind pattern for namespace-wide exclusions.

## Review Notes
The post remains centered on the classic Kyverno `ClusterPolicy` API, which current Kyverno documentation labels deprecated in favor of newer CEL-based policy types. The examples are still valid for the chart version shown, but a future refresh could mention the newer policy APIs.
