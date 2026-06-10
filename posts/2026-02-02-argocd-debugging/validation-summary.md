# Validation Summary: How to Debug ArgoCD Sync Issues

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- ArgoCD (CLI, application controller, repo server, API server)
- Kubernetes (Deployments, Services, ConfigMaps, CRDs, Jobs, Secrets)
- GitOps workflows
- ArgoCD sync waves and resource hooks
- ArgoCD ignoreDifferences (jsonPointers, jqPathExpressions, managedFieldsManagers)
- Lua scripting for custom health checks
- kubectl CLI

## Sources Consulted
- ArgoCD upstream source: https://github.com/argoproj/argo-cd
  - `cmd/argocd-application-controller/commands/argocd_application_controller.go` (env vars for status/operation processors and reconciliation timeout)
  - `manifests/base/application-controller/argocd-application-controller-statefulset.yaml`
- ArgoCD operator manual: https://argo-cd.readthedocs.io/en/stable/operator-manual/
  - argocd-cmd-params-cm reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
  - Custom health checks: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
  - Sync waves / phases / hooks user guide
  - Diffing strategies (ignoreDifferences, managedFieldsManagers)
- ArgoCD user guide: https://argo-cd.readthedocs.io/en/stable/user-guide/
  - Sync options (CreateNamespace, RespectIgnoreDifferences, ServerSideApply, ApplyOutOfSyncOnly)
  - CLI command reference (`argocd app get/sync/diff/resources`, `argocd repo`)
- Kubernetes documentation (label/name validation rules, Deployment selector requirement)

## Issues Found
1. **Incorrect env var name `ARGOCD_CONTROLLER_STATUS_PROCESSORS`** in the application controller scaling YAML. The correct env var (parsed by the controller binary) is `ARGOCD_APPLICATION_CONTROLLER_STATUS_PROCESSORS`. Fixed by updating the env var name.
2. **Incorrect env var name `ARGOCD_CONTROLLER_OPERATION_PROCESSORS`**. The correct name is `ARGOCD_APPLICATION_CONTROLLER_OPERATION_PROCESSORS`. Fixed.
3. **Invalid duration value `"300"` for `reposerver.git.request.timeout`** in the `argocd-cmd-params-cm` ConfigMap. The value is parsed as a Go duration and a bare integer would fail to parse. Changed to `"300s"`.
4. **Invalid ConfigMap key `reposerver.git.lsremote.parallelism`**. The actual upstream parameter is `reposerver.git.lsremote.parallelism.limit`. Fixed the key name and updated the inline comment to match its real purpose (controls parallelism for `git ls-remote` calls, not "shallow clones").

## Review Notes
- The "SyncFailed" label in the state diagram is a common simplification; ArgoCD's formal sync statuses are `Synced`, `OutOfSync`, and `Unknown`, while `Failed` is technically a phase of the last sync **operation** rather than a sync status itself. The post's usage is consistent with how the term is commonly used in the ArgoCD community and CLI output, so it was left as-is.
- `ARGOCD_RECONCILIATION_TIMEOUT` is technically the application resync period (default 180s), not strictly a "timeout"; the variable name and value `"300s"` are both correct, so no change was made — the naming reflects upstream usage.
- `argocd app sync --resource apps:Deployment:myapp` uses the supported `GROUP:KIND:NAME` form; namespaced form `GROUP:KIND:NAMESPACE/NAME` is also supported but not required.
- The label-validation regex shown (`[a-z0-9A-Z-_.]`) is a simplification of the actual rule (label values must be 63 chars or fewer, must begin and end with an alphanumeric, and may contain dashes, underscores, dots, and alphanumerics in between). The example value `"1.0.0/beta"` is correctly flagged as invalid because `/` is not allowed.
- The `managedFieldsManagers` example under `ignoreDifferences` is valid per ArgoCD's diffing customization docs.
- The custom health check Lua scripts (KafkaTopic, Certificate) use the legacy underscore-joined key format `resource.customizations.health.<group>_<kind>`, which remains supported alongside the newer nested-YAML format.
