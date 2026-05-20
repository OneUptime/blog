# Validation Summary: How to Unsubscribe from Notifications in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD Notifications
- Argo CD Application resources
- Kubernetes `kubectl`
- Kubernetes annotations and labels
- `jq`
- YAML

## Sources Consulted
- Argo CD notification subscriptions: https://argo-cd.readthedocs.io/en/stable/user-guide/subscriptions/
- Argo CD notification triggers and trigger functions: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD notification templates and time functions: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_sync/
- Kubernetes `kubectl annotate` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate/
- Kubernetes `kubectl label` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Expr language definition used by Argo CD notification triggers: https://expr-lang.org/docs/language-definition
- jq manual: https://jqlang.github.io/jq/manual/

## Issues Found
- The `jq 'del(.metadata.annotations | to_entries[] | select(...))'` example for removing all notification annotations was invalid because `del` requires a path expression. Changed it to update `metadata.annotations` with `with_entries(...)`, preserving non-notification annotations.
- The verification command used `.metadata.annotations | to_entries[]`, which fails when the annotations map is missing. Changed it to `(.metadata.annotations // {}) | to_entries[]`.
- Trigger examples accessed `app.status.operationState.phase` directly. Argo CD documents `status.operationState` as optional, so the direct access can fail during trigger evaluation. Changed those examples to use `app.status?.operationState.phase`.
- The silence-window example compared formatted timestamps as strings. Changed it to parse the silence timestamp with `time.Parse(...)` and compare it with `time.Now().After(...)`, matching Argo CD's documented trigger time functions.

## Review Notes
The subscription annotation format, default subscription `subscriptions` structure, selector usage, trailing-hyphen annotation and label removal commands, scaling the notification controller deployment, and `argocd app sync` command are consistent with official documentation. The post does not pin a specific Argo CD version, so the review used the current stable Argo CD documentation.
