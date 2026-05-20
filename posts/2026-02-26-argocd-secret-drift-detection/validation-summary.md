# Validation Summary: How to Handle Secret Drift Detection in ArgoCD

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo CD
- Kubernetes Secrets
- GitOps
- External Secrets Operator
- Bitnami Sealed Secrets
- Prometheus Operator
- Kubernetes audit logging
- Lua resource health customizations

## Sources Consulted
- Argo CD Diff Customization: https://argo-cd.readthedocs.io/en/stable/user-guide/diffing/
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app diff` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Argo CD `argocd app get-resource` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get-resource/
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD Metrics documentation: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/metrics/
- Argo CD Security and Auditing documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/security/
- Argo CD Declarative Setup documentation: https://argo-cd.readthedocs.io/en/release-3.0/operator-manual/declarative-setup/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes Auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- External Secrets Operator ExternalSecret API: https://external-secrets.io/latest/api/externalsecret/
- Bitnami Sealed Secrets documentation: https://github.com/bitnami-labs/sealed-secrets

## Issues Found
- The post used `argocd app get myapp --show-diff`, but the current `argocd app get` command has no `--show-diff` flag. Changed it to `argocd app get myapp`.
- The post used `argocd app diff myapp --resource :Secret:my-secret`, but the documented `argocd app diff` command has no `--resource` option and Argo CD redacts Secret values. Replaced it with `argocd app get-resource myapp --kind Secret --resource-name my-secret -o yaml` and clarified how to inspect sensitive live Secret data with `kubectl` when necessary.
- The `ignoreDifferences` example used `name: managed-by-eso-*`, implying wildcard matching in the Application `name` field. Argo CD documents `name` as a specific resource name, so the example now uses JQ selection based on External Secrets Operator metadata.
- The External Secrets Operator data hash was referenced as a label. It is an annotation, so the JQ path now uses `.metadata.annotations."reconcile.external-secrets.io/data-hash"`.
- The Sealed Secrets example checked `sealedsecrets.bitnami.com/managed` as a label. Bitnami documents it as an annotation, so the example now checks `.metadata.annotations`.
- The custom health check used `resource.customizations.health.v1_Secret`, but Argo CD resource customization keys use `<group>_<kind>` and the core API group is empty. Changed it to `resource.customizations.health._Secret`.
- The Lua health-check example required a `crypto` module and attempted to hash Secret data inside Argo CD. Argo CD health checks are Lua scripts with standard libraries disabled by default and no documented crypto module, so the example now reads a drift marker annotation written by another controller or admission process.
- The Prometheus alert used undocumented metrics such as `argocd_app_resource_info`. Replaced it with documented Argo CD application metrics: `argocd_app_info` and the reconcile histogram count series.
- The `RespectIgnoreDifferences=true` explanation omitted Argo CD's documented caveat that it only affects resources that already exist in the cluster. Added that caveat.
- The audit section referenced an unsupported `resource.events.enable` setting. Replaced it with Argo CD's documented Kubernetes Events behavior and kept Kubernetes audit policy for direct Secret modification auditing.
- The ExternalSecret example used `external-secrets.io/v1beta1` and placed filtering labels only on the ExternalSecret object. Updated it to `external-secrets.io/v1` and moved the labels into `spec.target.template.metadata.labels` so they are applied to the generated Secret used by Argo CD filtering.

## Review Notes
Argo CD can show a Secret resource as OutOfSync, but Secret values are intentionally redacted in Argo CD API responses, logs, and CLI output. Secret-specific alerting generally needs either application-level Argo CD signals plus resource inspection, a custom controller that emits safe metadata, or Kubernetes audit/admission telemetry for direct Secret writes.
