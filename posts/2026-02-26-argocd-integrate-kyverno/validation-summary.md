# Validation Summary: How to Integrate ArgoCD with Kyverno for Policy Enforcement

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD
- Kyverno
- Kubernetes
- Helm
- GitOps
- Kubernetes admission control

## Sources Consulted
- Kyverno installation and Helm chart documentation: https://kyverno.io/docs/installation/installation/
- Kyverno chart 3.1.0 values: https://raw.githubusercontent.com/kyverno/kyverno/kyverno-chart-3.1.0/charts/kyverno/values.yaml
- Kyverno validate rules documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno mutate rules documentation: https://kyverno.io/docs/policy-types/cluster-policy/mutate/
- Kyverno generate rules documentation: https://kyverno.io/docs/policy-types/cluster-policy/generate/
- Kyverno PolicyException documentation: https://kyverno.io/docs/guides/exceptions/
- Argo CD diff customization documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD diff strategies documentation: https://argo-cd.readthedocs.io/en/release-2.11/user-guide/diff-strategies/
- Argo CD custom health checks documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD sync waves documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/

## Issues Found
- The Kyverno Helm values used `replicaCount` and top-level `resources`, which are not valid for the Kyverno 3.1.0 chart. Updated the example to use controller-specific values such as `admissionController.replicas`, `admissionController.container.resources`, and replica settings for the background, cleanup, and reports controllers.
- The Kyverno install snippet claimed to exclude the Argo CD namespace but only excluded `kube-system` and `kyverno`. Added `argocd` to the webhook namespace selector and clarified the comment.
- The validation policy examples used top-level `spec.validationFailureAction`, which Kyverno documents as deprecated. Moved the setting to each rule's `validate.failureAction`.
- The server-side diff example labeled `controller.diff.server.side` as an `argocd-cm` setting. Updated it to `argocd-cmd-params-cm` and noted that `argocd-application-controller` must be restarted after changing it.
- The PolicyException example used `kyverno.io/v2beta1`. Updated it to the current `kyverno.io/v2` API version and added explicit matched resource kinds for the exception.
- The best-practices list referred to deprecated `validationFailureAction`. Updated it to `failureAction`.

## Review Notes
Kyverno's current documentation marks the legacy ClusterPolicy section as deprecated in favor of newer CEL-based policy types. The post remains technically valid as a ClusterPolicy-based guide, especially because it pins the Kyverno Helm chart to 3.1.0, but a future rewrite should consider the newer `policies.kyverno.io` policy APIs.
