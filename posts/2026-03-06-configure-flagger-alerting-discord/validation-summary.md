# Validation Summary: How to Configure Flagger Alerting with Discord

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flagger
- Flux
- Kubernetes
- Discord incoming webhooks
- kubectl
- Canary deployments

## Sources Consulted
- Flagger alerting documentation: https://fluxcd.io/flagger/usage/alerting/
- Flagger AlertProvider CRD and notifier source: https://github.com/fluxcd/flagger
- Discord webhook documentation: https://docs.discord.com/developers/platform/webhooks
- Discord rate-limit documentation: https://docs.discord.com/developers/topics/rate-limits
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- kubectl reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The per-canary Discord webhook secrets were created in `flagger-system` while the referenced `AlertProvider` objects were in `default`. Flagger resolves `secretRef` in the provider namespace, so the secret examples were changed to `default` for per-canary providers.
- The cluster-wide provider example referenced a secret in `flagger-system` without showing that the secret must exist there. Added the matching `flagger-system` secret manifest before the shared `AlertProvider`.
- The multi-channel example implied `severity: info` only sends progress updates. Flagger treats `info` as all alert severities, so the comments were corrected to show that the deployments channel receives all canary alerts and the error provider receives failures and rollbacks.
- The Discord message description claimed yellow/orange progress coloring and metric analysis results in the Discord messages. Flagger's Discord notifier uses Slack-compatible attachments with `good` for non-error and `danger` for errors, and its alert metadata does not include detailed metric analysis results. The description was corrected.
- The dedicated Discord bot alternative was inaccurate because Flagger's Discord provider uses incoming webhooks, not the Discord bot API. The section was rewritten to describe webhook identity customization and note that interactive bot behavior requires a separate integration.
- The rate-limit section stated a fixed webhook limit and said Flagger respects those limits. Discord's official guidance says rate limits can vary and should be handled through response headers, while Flagger's notifier reports non-2xx responses but does not implement retry/backoff. The section was corrected to avoid hard-coded limits and overclaiming Flagger behavior.

## Review Notes
The Flagger documentation states that the Discord provider appends `/slack` to the Discord webhook URL and uses Slack-compatible formatting, so the copied Discord webhook URL format in the post is acceptable. The `kubectl apply`, `kubectl get -w`, `kubectl set image`, `kubectl logs`, and `kubectl run ... -- curl ...` command forms are consistent with kubectl usage.
