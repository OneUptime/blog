# Validation Summary: How to Roll Back Failed Kubernetes Deployments Safely

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Kubernetes Deployments
- Kubernetes StatefulSets
- kubectl rollout commands
- Helm rollbacks and hooks
- Argo CD
- Flux CD
- Flagger
- Istio VirtualService traffic routing
- Prometheus / PromQL
- Database migration rollback patterns

## Sources Consulted
- Kubernetes kubectl rollout undo reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_undo/
- Kubernetes kubectl rollout history reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_history/
- Kubernetes kubectl rollout pause reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_pause/
- Kubernetes kubectl rollout resume reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_resume/
- Kubernetes StatefulSet concepts: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes kubectl set image reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/
- Kubernetes Deployment rollback documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Helm rollback command reference: https://helm.sh/docs/helm/helm_rollback/
- Argo CD app command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app/
- Argo CD automated sync policy: https://argo-cd.readthedocs.io/en/latest/user-guide/auto_sync/
- Flux suspend command reference: https://fluxcd.io/flux/cmd/flux_suspend/
- Flux reconcile kustomization reference: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flagger webhooks documentation: https://docs.flagger.app/usage/webhooks
- Flagger canary behavior documentation: https://docs.flagger.app/usage/how-it-works
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio traffic shifting task: https://istio.io/latest/docs/tasks/traffic-management/traffic-shifting/
- Prometheus histogram_quantile documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile

## Issues Found
- The Git range example for reverting multiple commits used `<oldest-commit>..<newest-commit>`, which excludes the oldest commit. Changed it to `<oldest-commit>^..<newest-commit>` so the stated oldest commit is included.
- The GitOps note said Argo CD would automatically sync after a revert. Changed it to clarify that this happens when automated sync is enabled.
- The StatefulSet rollback example used `kubectl rollout pause` and `kubectl rollout resume` for a StatefulSet, but current kubectl documentation says pause/resume are supported only for Deployments. Removed those commands from the StatefulSet snippet.
- The StatefulSet YAML omitted the required `spec.selector` and matching pod template labels. Added a selector and `app: mysql` labels so the apps/v1 StatefulSet manifest is valid.
- The Flagger manual abort example treated `spec.suspend: true` as a rollback and referenced a nonstandard annotation/CLI flow. Updated the text to say suspend pauses analysis, and changed the rollback example to use a `rollback` webhook backed by Flagger loadtester's `/gate/check` endpoint and `/gate/open` trigger.
- The PromQL p99 latency examples used `histogram_quantile()` directly on bucket rates. Updated them to aggregate classic histogram buckets with `sum by (le)` before calling `histogram_quantile()`, matching Prometheus guidance.

## Review Notes
- `kubectl --record` is correctly marked deprecated in the post, and the post provides the current annotation-based alternative.
- The local review environment did not have `kubectl`, `helm`, or `argocd` installed, so CLI verification was performed against official command references rather than local `--help` output.
