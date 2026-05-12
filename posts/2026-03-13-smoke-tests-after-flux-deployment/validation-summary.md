# Validation Summary: How to Set Up Smoke Tests After Flux Deployment

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD (Notification Controller — Provider and Alert resources)
- Kubernetes (Jobs, ConfigMaps, Services)
- kubectl
- curl (curlimages/curl container image)
- Bash / POSIX shell scripting
- GitHub Actions (workflow_dispatch)
- Slack GitHub Action (slackapi/slack-github-action)
- Kustomize

## Sources Consulted
- Flux Notification Controller source: https://github.com/fluxcd/notification-controller (`api/v1beta3/alert_types.go`, `api/v1beta3/provider_types.go`, `internal/server/event_handlers.go`)
- Flux Notification Controller releases: https://github.com/fluxcd/notification-controller/releases (latest v1.8.4, Apr 2026)
- Flux Alerts documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Providers documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux Notification Controller v1 promotion issue #436: https://github.com/fluxcd/notification-controller/issues/436
- Kustomize-controller events source: https://github.com/fluxcd/kustomize-controller (`internal/controller/kustomization_controller.go`, condition reasons)
- Kubernetes Job documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/ (verified `ttlSecondsAfterFinished`, `backoffLimit`, `restartPolicy`)
- GitHub Actions docs: https://docs.github.com/en/actions (workflow_dispatch, actions/checkout@v4)
- curlimages/curl on Docker Hub: https://hub.docker.com/r/curlimages/curl (tag 8.5.0 exists)

## Issues Found
1. **Incorrect API version for Flux Provider and Alert.** The post used `apiVersion: notification.toolkit.fluxcd.io/v1` for both `Provider` and `Alert`. Only `Receiver` has been promoted to `v1` in the notification controller; `Provider` and `Alert` are still on `v1beta3` (their storage version) as of notification-controller v1.8.4 (April 2026). Fixed by changing both API versions to `notification.toolkit.fluxcd.io/v1beta3`.

2. **`inclusionList` regex would not match.** The post used `".*succeeded.*"` to filter for successful reconciliation events. However, per `internal/server/event_handlers.go` (`messageIsIncluded`), the regex is matched against `event.Message`, not `event.Reason`. The Kustomization success Message reads "Reconciliation finished in <duration>, next run in <interval>" — the literal "succeeded" appears only in the Reason (`ReconciliationSucceeded`), not in the Message. The regex is also case-sensitive (Go RE2, default flags). Fixed by changing the inclusion expression to `".*Reconciliation finished.*"`, which matches the actual success Message emitted by kustomize-controller.

## Review Notes
- The Step 4 GitHub Actions workflow uses `workflow_dispatch`, which requires manual or API-triggered invocation. The generic webhook Provider in Step 2 cannot trigger this directly — it would need an intermediary webhook handler that calls the GitHub `workflow_dispatch` API. A cleaner alternative would be Flux's built-in `type: githubdispatch` Provider combined with an `on: repository_dispatch` workflow trigger. This is a design gap rather than a technical error, and the post does describe a webhook handler URL in Step 2.
- The `slackapi/slack-github-action@v1` example only sets `SLACK_WEBHOOK_URL` in env. For Slack incoming webhooks (as opposed to Slack Workflow triggers), v1 typically also requires `SLACK_WEBHOOK_TYPE: INCOMING_WEBHOOK`. The Slack payload also uses a top-level `color` field, which is rendered by Slack only when nested inside `attachments`. Left as-is since the focus of the post is smoke tests, not Slack message formatting.
- The Step 1 Job manifest is a static Job — committing it to GitOps would cause it to run only once (Job spec fields are largely immutable after creation). Step 3 alludes to this by mentioning deletion after completion, but the flow between steps could be clearer. Not a technical inaccuracy.
- `curlimages/curl:8.5.0` is a real, valid image tag; newer tags exist but this works.
- All `kubectl` commands in Step 6 are valid current syntax.
- `actions/checkout@v4` is current.
- The Provider/Alert v1 promotion is in flight upstream; once notification-controller publishes v1 for these resources in a stable release, the apiVersion in this post should be revisited.
