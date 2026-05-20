# Validation Summary: How to Send Different Notifications for Success vs Failure in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Notifications
- Kubernetes ConfigMaps
- Argo CD Application annotations
- Slack notifications
- PagerDuty notifications
- Email notifications
- Webhook notifications
- Mermaid diagrams

## Sources Consulted
- Argo CD Notifications triggers documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD Notifications templates documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/
- Argo CD Notifications subscriptions documentation: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/notifications/subscriptions/
- Argo CD webhook notification service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD PagerDuty notification service documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/notifications/services/pagerduty/
- Argo CD notifications catalog: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/catalog/
- Linked OneUptime subscription article, verified reachable: https://oneuptime.com/blog/post/2026-02-26-argocd-subscribe-applications-notifications/view

## Issues Found
- The success Slack template labeled a field as "Duration" but rendered `finishedAt - startedAt` as a literal pair of timestamps, not a calculated duration. Changed the label to "Sync Window" and ordered the timestamps as started-to-finished.
- The PagerDuty subscription examples used `payment-team-oncall`, which reads like a team alias. The official PagerDuty notification annotation expects the recipient value to be the PagerDuty service ID. Changed the examples to use `P123456` as a service ID placeholder.
- The best-practice note recommended `finishedAt + health.status` for degraded notifications, but the article's trigger examples use `finishedAt` and Argo CD's official examples document `oncePer` as a single evaluated field/expression. Updated the note to match the examples and avoid recommending an unshown expression.

## Review Notes
The Argo CD notification trigger, template, subscription, Slack, email, PagerDuty, and webhook configuration shapes are consistent with the official documentation. The trigger examples use explicit nil checks before accessing `operationState`; the official documentation also recommends optional chaining (`app.status?.operationState.phase`) for this optional field, which would be a reasonable future hardening improvement.
