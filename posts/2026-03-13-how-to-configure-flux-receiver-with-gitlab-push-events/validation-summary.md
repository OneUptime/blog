# Validation Summary: How to Configure Flux Receiver with GitLab Push Events

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux v2 notification-controller
- Flux Receiver custom resources
- Kubernetes Secrets and Ingress
- GitLab project webhooks
- kubectl and Flux CLI commands

## Sources Consulted
- Flux Receiver documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux webhook receiver guide: https://fluxcd.io/flux/guides/webhook-receivers/
- Flux Notification API reference v1: https://fluxcd.io/flux/components/notification/api/v1/
- Flux installation prerequisites: https://fluxcd.io/flux/installation/
- Flux releases and supported Kubernetes versions: https://fluxcd.io/flux/releases/
- GitLab webhook documentation: https://docs.gitlab.com/user/project/integrations/webhooks/
- GitLab webhook events documentation: https://docs.gitlab.com/user/project/integrations/webhook_events/
- GitLab outbound request filtering documentation: https://docs.gitlab.com/security/webhooks/

## Issues Found
- The prerequisites said "Kubernetes cluster (v1.25 or later)", which is outdated for current Flux releases. Changed this to require a Kubernetes version supported by the installed Flux release.
- The Ingress example routed traffic to the `notification-controller` service. Flux documentation exposes webhook traffic through the `webhook-receiver` service, so the service name was corrected.
- The multiple-resource example implied that listing downstream `Kustomization` and `HelmRelease` resources is the normal way to handle a repository that drives multiple deployments. Flux recommends reconciling source resources and letting downstream resources reconcile after source revision changes, so the explanation was corrected while preserving the example.
- The merge request section said reconciliation could be triggered when merge requests are merged. GitLab sends merge request webhooks for multiple merge request actions, and Flux filters only by the `X-Gitlab-Event` header value. The wording was updated to describe merge request activity and clarify the filtering behavior.

## Review Notes
GitLab's newer webhook signing-token feature can coexist with the existing secret token, but Flux's GitLab Receiver documentation still describes validation with the GitLab "Secret token" and `X-Gitlab-Token` header. The post's secret-token guidance remains correct for Flux Receiver configuration.
