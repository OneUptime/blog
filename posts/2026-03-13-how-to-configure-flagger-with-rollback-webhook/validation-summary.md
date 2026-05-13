# Validation Summary: How to Configure Flagger with rollback Webhook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flagger
- Kubernetes
- Flagger Canary custom resources
- Flagger webhooks
- Flagger loadtester
- Slack-style and incident-management webhook integrations

## Sources Consulted
- Flagger Webhooks documentation: https://docs.flagger.app/main/usage/webhooks
- Flagger How it works documentation: https://docs.flagger.app/usage/how-it-works
- Flagger Deployment Strategies documentation: https://docs.flagger.app/main/usage/deployment-strategies
- Flagger Alerting documentation: https://docs.flagger.app/main/usage/alerting

## Issues Found
- The post incorrectly described `rollback` webhooks as notification callbacks fired after Flagger automatically rolls back a failed canary. Updated the explanation to match Flagger documentation: rollback hooks are checked while a canary is `Progressing` or `Waiting`, and a successful HTTP response requests rollback.
- The post claimed rollback webhook failures do not affect rollback behavior. Updated the guidance because the `rollback` hook response is itself the rollback decision: HTTP 2xx triggers rollback, while non-2xx does not.
- The rollback sequence incorrectly listed `rollback` webhooks as part of Flagger's automatic metric-threshold rollback path. Updated the sequence to distinguish automatic threshold rollback from rollback webhook checks.
- The example webhook payload omitted the `checksum` field and used `Failed` as the phase for a rollback hook. Updated the payload to include `checksum` and show a `Progressing` phase, which is consistent with rollback hooks being called during analysis.
- Several examples used rollback webhooks as ordinary notification endpoints. Updated them to use rollback check/gate endpoints that return HTTP 2xx only when rollback should be triggered.
- The diagnostic and log-collection examples would have returned success unconditionally and therefore triggered rollback on every analysis loop. Added an external rollback-request check before the diagnostic commands.
- The "Combining rollback with post-rollout" section incorrectly described rollback as the failure notification counterpart to `post-rollout`. Updated it to show rollback as an external trigger and `post-rollout` as the completion notification hook.

## Review Notes
Flagger already has built-in alert providers and `event` webhooks for deployment lifecycle notifications. Future revisions could include a separate notification-focused example using `analysis.alerts` or an `event` webhook, but that was outside the minimal technical correction scope for this post.
