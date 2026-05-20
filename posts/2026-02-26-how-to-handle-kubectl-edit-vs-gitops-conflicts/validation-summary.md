# Validation Summary: How to Handle kubectl edit vs GitOps Conflicts

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- kubectl
- Kubernetes audit logs
- Kubernetes RBAC
- PrometheusRule and Prometheus metrics
- Bash, jq, and yq

## Sources Consulted
- Argo CD documentation: Automated Sync Policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD documentation: argocd app diff Command Reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Argo CD documentation: argocd app sync Command Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD documentation: argocd app set Command Reference: https://argo-cd.readthedocs.io/en/release-2.10/user-guide/commands/argocd_app_set/
- Argo CD documentation: Diff Customization: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/diffing/
- Argo CD documentation: Sync Options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD documentation: Metrics: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/metrics/
- Argo CD documentation: argocd-cmd-params-cm.yaml example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Kubernetes documentation: Auditing: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes documentation: Field Selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes documentation: kubectl set image reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes documentation: Using RBAC Authorization: https://kubernetes.io/docs/reference/access-authn-authz/rbac/

## Issues Found
- The event-based detection section described `kubectl get events` as querying Kubernetes audit logs. Kubernetes Events are API objects and are not the API server audit log. Changed the section to use an audit-log-based jq example against a file audit backend.
- The drift detection script incremented `DRIFTED` inside a `while` loop fed by a pipeline, so Bash would run the loop in a subshell and the final count would remain `0`. Changed the loop to use process substitution so the counter is preserved.
- The drift detection script called `argocd app diff` without accounting for its default non-zero exit code when a diff is found. Added `--exit-code=false` so drift output is not treated as a command failure.
- The self-heal timing text said the reconciliation interval defaults to 3 minutes. Current Argo CD documentation states the default is 120 seconds plus up to 60 seconds of jitter, for a maximum of 3 minutes. Updated the wording.
- The emergency workflow used `argocd app set my-app --self-heal=false`, while the documented CLI flag is primarily shown for enabling self-heal and current Argo CD docs recommend disabling autosync when live changes must persist. Changed the workflow to temporarily set `--sync-policy none` and then restore `--sync-policy automated --self-heal`.

## Review Notes
- The Argo CD `ignoreDifferences`, `managedFieldsManagers`, `RespectIgnoreDifferences=true`, self-heal timeout key, sync resource selector format, and `argocd_app_info{sync_status="OutOfSync"}` metric usage match the official documentation reviewed.
- The RBAC example is syntactically valid, but the broad read-only rule includes read access to Secrets. Production environments should usually scope read access more tightly.
