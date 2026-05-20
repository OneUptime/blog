# Validation Summary: How to Handle 'Progressing' Health Status That Never Completes in ArgoCD

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD
- Kubernetes
- kubectl
- Lua health checks
- JSONPath and jq

## Sources Consulted
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/release-2.10/user-guide/commands/argocd_app_get/
- Argo CD Metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Kubernetes `kubectl events` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Kubernetes `kubectl get` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes Deployment documentation for `progressDeadlineSeconds`: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes `kubectl rollout status` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- Kubernetes `kubectl logs` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes `kubectl exec` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- `argocd app resources my-app` was presented as the default way to list resources with health status, and the follow-up example used `argocd app resources my-app -o json`. Current Argo CD documentation only supports `tree` and `tree=detailed` output for `argocd app resources`, so I changed the first command to `--output tree=detailed` and changed the JSON filtering example to use `argocd app get my-app -o json` against `.status.resources[]`.
- `kubectl events -n <namespace> --sort-by='.lastTimestamp'` used a flag that is not documented for `kubectl events`. I changed it to `kubectl get events -n <namespace> --sort-by='.lastTimestamp'`, where `--sort-by` is supported by `kubectl get`.
- The common-cause list said "Kubernetes progress deadline not configured", but Kubernetes Deployments default `spec.progressDeadlineSeconds` to 600 seconds. I changed this to "Very high progress deadline or a paused Deployment."
- The Deployment explanation said Deployments stay Progressing when pods cannot reach Running. This was too narrow because Argo CD's documented built-in check is based on observed generation and updated replica counts, and rollout availability/readiness issues can be reflected through Deployment status. I updated the wording to describe the Deployment rollout state more accurately.
- The Lua health-check snippets used `hs` without initializing it and iterated directly over `obj.status.conditions`, which can fail if the field is absent. I added `hs = {}`, nil-safe condition iteration, and an explicit fallback return in the corrected example.

## Review Notes
The guide is broadly accurate after the fixes. Argo CD health behavior can vary for custom resources or overridden health checks, and Application health is computed from immediate child resources rather than recursively inherited from all descendants.
