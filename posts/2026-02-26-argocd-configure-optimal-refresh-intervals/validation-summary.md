# Validation Summary: How to Configure Optimal Refresh Intervals in ArgoCD

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Prometheus
- GitHub webhooks

## Sources Consulted
- Argo CD FAQ for repository polling, `timeout.reconciliation`, jitter, and disabling polling: https://argo-cd.readthedocs.io/en/latest/faq/
- Argo CD `argocd-cm` example for reconciliation timeout and jitter configuration: https://argo-cd.readthedocs.io/en/latest/operator-manual/argocd-cm-yaml/
- Argo CD annotations and labels reference for `argocd.argoproj.io/refresh`: https://argo-cd.readthedocs.io/en/stable/user-guide/annotations-and-labels/
- Argo CD command parameters reference for `reposerver.repo.cache.expiration` and `controller.self.heal.timeout.seconds`: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD metrics reference for `argocd_app_info` and `argocd_app_reconcile`: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/metrics/
- Argo CD webhook documentation for `/api/webhook`, GitHub `application/json`, and webhook secrets: https://argo-cd.readthedocs.io/en/latest/operator-manual/webhook/
- Argo CD `argocd app get` command reference for `--hard-refresh`: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/commands/argocd_app_get/

## Issues Found
- The post described separate soft-refresh and Git-polling intervals and referenced `appResyncPeriod`. Current Argo CD documentation uses the global `timeout.reconciliation` setting, with optional `timeout.reconciliation.jitter`, for repository polling. I updated the diagram and explanation.
- The examples used bare numeric values such as `"180"` and `"300"` for `timeout.reconciliation`. Argo CD documents duration strings such as `120s`, `5m`, and `1h`, so I changed the examples to `180s` and `300s`.
- The post claimed `argocd.argoproj.io/refresh` and a nonexistent `argocd.argoproj.io/reconcile-timeout` annotation could configure per-application refresh intervals. Official docs define `argocd.argoproj.io/refresh` as a one-time refresh request with `normal` or `hard` values, removed after refresh. I corrected the section to describe one-time refresh triggers.
- The repo-server cache setting was shown in `argocd-cm`. Argo CD documents `reposerver.repo.cache.expiration` in `argocd-cmd-params-cm`, so I moved the examples to that ConfigMap and used the documented default format `24h0m0s`.
- The self-heal timeout was shown as a controller container argument. Current Argo CD command-parameter docs expose it as `controller.self.heal.timeout.seconds` in `argocd-cmd-params-cm`, so I updated the example.
- The monitoring examples used unsupported or misleading metrics and labels: `argocd_app_info{reconcile_status="Succeeded"}` and `argocd_app_reconcile_count` as a frequency metric. I replaced them with documented `argocd_app_info` state labels and a p95 reconciliation-latency query based on `argocd_app_reconcile_bucket`.

## Review Notes
The GitHub webhook setup is broadly correct: Argo CD documents `/api/webhook`, `application/json`, and the `webhook.github.secret` key. The sample `curl` includes a placeholder GitHub signature, so it is illustrative rather than directly executable without computing the real HMAC signature.
