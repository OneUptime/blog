# Validation Summary: How to Resolve Helm Release Version Conflicts and Drift

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Helm 3
- Kubernetes
- kubectl
- helm-diff plugin
- Argo CD
- GitHub Actions
- Kyverno
- Prometheus Operator / PrometheusRule

## Sources Consulted
- Helm 3 `helm upgrade` command reference: https://helm.sh/docs/v3/helm/helm_upgrade/
- Helm 3 `helm rollback` command reference: https://helm.sh/docs/v3/helm/helm_rollback/
- Helm `helm get` command reference: https://helm.sh/docs/helm/helm_get/
- Helm command list: https://helm.sh/docs/helm/
- Helm 3 changes since Helm 2 / three-way merge: https://helm.sh/docs/v3/faq/changes_since_helm2/
- helm-diff plugin documentation: https://github.com/databus23/helm-diff
- Kubernetes `kubectl diff` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_diff/
- Kubernetes `kubectl apply` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes common labels reference: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/auto_sync/
- GitHub Actions workflow commands / environment files: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands
- Kyverno validate rule documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno background scan documentation: https://kyverno.io/docs/guides/reports/
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The `--show-secrets` helm-diff example was described as showing only specific resources. Updated the comment to state that it shows secret values instead of redacting them, matching the plugin flag behavior.
- The Argo CD Application manifest omitted common required operational fields for an Application example: `metadata.namespace`, `spec.project`, and `spec.destination`. Added those fields so the manifest is complete for Argo CD reconciliation.
- The GitHub Actions kubeconfig setup exported `KUBECONFIG` only inside one shell step, so the next step would not see it. Changed it to write `KUBECONFIG` to `$GITHUB_ENV`, which persists it for later steps in the same job.
- The Kyverno policy used deprecated policy-level `validationFailureAction`, set `background: true` while referencing AdmissionReview-only variables, and used `any` conditions that would deny unrelated non-Argo CD requests. Moved enforcement to `validate.failureAction`, set `background: false`, and changed the deny logic to `all`.
- The drift detection script used `helm get chart`, which is not a Helm command. Replaced it with an explicit `CHART_PATH` variable and used `helm get values -o yaml` for values input.

## Review Notes
- The Helm examples are valid for Helm 3, and the post explicitly discusses Helm 3 behavior. Helm 4 documentation is now the latest upstream documentation and has changed some upgrade flag names and behavior, so a future refresh could add a Helm 3 version note or Helm 4 alternatives.
- The Prometheus examples assume a Helm metrics source exporting `helm_release_info`; that metric is not built into Prometheus itself.
