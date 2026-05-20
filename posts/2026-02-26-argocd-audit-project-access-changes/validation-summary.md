# Validation Summary: How to Audit Project Access and Changes in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes audit logging
- Argo CD Notifications
- Argo CD CLI
- Prometheus / PromQL
- Fluent Bit
- Git and GitHub CODEOWNERS

## Sources Consulted
- Argo CD command parameters ConfigMap documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD Notifications triggers documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD Notifications templates documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/
- Argo CD Notifications webhook service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD Notifications subscriptions documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/subscriptions/
- Argo CD Notifications Slack service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/slack/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD CLI app list command documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Kubernetes audit logging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes audit API reference: https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/

## Issues Found
- The logging ConfigMap comments incorrectly described `server.log.level: info` as debug logging and `server.log.format: json` as enabling gRPC access logs. Updated the comments to match the documented Argo CD command parameters.
- The Argo CD API server logging description overstated that every API request is logged with full user/action/result audit detail. Reworded it to describe API activity logs as useful for reconstructing actions.
- The notification trigger expressions accessed `app.status.operationState` without optional chaining. Updated trigger conditions to use `app.status?.operationState`, matching current Argo CD notification examples and avoiding errors when `operationState` is absent.
- The notification examples defined services, templates, and triggers but did not subscribe applications to those triggers. Added global `subscriptions` examples for the webhook and Slack audit streams, as required by Argo CD Notifications.
- The Slack trigger used `when: "true"`, which would fire on every evaluation and could render a template that expects sync operation fields even when no operation exists. Replaced it with a sync-operation trigger that only fires for defined operation phases.
- The Prometheus metrics section implied `argocd_app_sync_total` can identify who triggered syncs. Argo CD documents this metric as sync history with labels such as project and phase, not username, so the wording was corrected.
- The failed sync example returned the raw counter value. Changed it to use `increase(...[24h])` so it reports failed sync attempts over a time window.
- The after-hours PromQL expression had incorrect grouping for detecting sync activity during a time window. Replaced it with an expression that checks recent sync increases and gates them by `hour()`.

## Review Notes
The post is technically relevant and broadly correct after the fixes. For stricter compliance reporting, a future improvement would be to distinguish best-effort Argo CD application logs from authoritative Kubernetes API audit logs and SIEM-retained records.
