# Validation Summary: How to Send ArgoCD Notifications to Pushover

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Argo CD Notifications
- Kubernetes Secrets, ConfigMaps, and annotations
- Pushover Message API
- Webhook-based notification delivery

## Sources Consulted
- Argo CD Notifications webhook service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD Notifications templates documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/
- Argo CD Notifications triggers documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD notification subscriptions documentation: https://argo-cd.readthedocs.io/en/release-2.11/user-guide/subscriptions/
- Argo CD notification services overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/overview/
- Pushover Message API documentation: https://pushover.net/api
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes kubectl annotate reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate/

## Issues Found
- The webhook templates used `$pushover-api-token`, `$pushover-user-key`, and similar placeholders inside template bodies. Argo CD uses `$<secret-key>` references in service configuration, but notification templates access secrets through the `.secrets` variable. Updated all Pushover template bodies to use `{{ index .secrets "..." }}`, which also works with hyphenated Secret keys.
- The sync-related triggers accessed `app.status.operationState.phase` directly. Argo CD documents `status.operationState` as optional and recommends optional chaining to avoid evaluation failures while the operation state is absent. Updated those trigger conditions to use `app.status?.operationState.phase`.
- The "Sending to Different Users" examples referenced additional Secret keys without saying they must be stored first. Updated the introductory sentence to make that prerequisite explicit.

## Review Notes
- The Pushover endpoint, required `token`, `user`, and `message` parameters, JSON `Content-Type`, priority values, emergency `retry`/`expire` requirements, and listed built-in sounds match the official Pushover API documentation.
- The Argo CD webhook service format, template `webhook` block, and subscription annotation pattern match the official Argo CD Notifications documentation.
- `kubectl` was not installed in the local environment, so command behavior was checked against Kubernetes reference documentation rather than local `--help` output.
