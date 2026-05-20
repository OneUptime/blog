# Validation Summary: How to Configure Git Webhook for GitLab in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitLab webhooks
- Kubernetes Secrets and ConfigMaps
- GitOps repository polling and webhook refresh
- TLS trust configuration

## Sources Consulted
- Argo CD webhook configuration: https://argo-cd.readthedocs.io/en/latest/operator-manual/webhook/
- Argo CD declarative setup and TLS certificate ConfigMap: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- Argo CD reconciliation interval FAQ: https://argo-cd.readthedocs.io/en/latest/faq/
- Argo CD argocd-cm example: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/argocd-cm-yaml/
- GitLab webhooks documentation: https://docs.gitlab.com/user/project/integrations/webhooks/
- GitLab project webhooks API: https://docs.gitlab.com/api/project_webhooks/
- GitLab group webhooks API: https://docs.gitlab.com/api/group_webhooks/
- GitLab outbound request filtering for webhooks: https://docs.gitlab.com/security/webhooks/

## Issues Found
- The prerequisites said Admin or Maintainer access was sufficient for a GitLab group webhook. GitLab documents group webhook creation as requiring the Owner role, so the prerequisite was corrected to Maintainer or Owner for projects and Owner for groups.
- The group webhook section omitted that GitLab group webhooks are a Premium/Ultimate feature. Added that tier requirement.
- The Argo CD webhook secret section stated that the API server must be restarted after updating `argocd-secret`. Argo CD documentation says webhook secret changes should take effect automatically, so the restart is now described only as a fallback.
- The Argo CD TLS certificate ConfigMap example omitted the `app.kubernetes.io/part-of: argocd` label required for Argo CD-managed configuration objects. Added the label and clarified that this ConfigMap is for repository access to GitLab over HTTPS.
- The reconciliation interval example used `timeout.reconciliation: "600"`. Argo CD documents this setting as a duration string such as `60s`, `1m`, or `1h`, so it was changed to `10m`.

## Review Notes
The post's main Argo CD webhook endpoint, GitLab secret-token configuration, GitLab project/group hook API fields, and self-managed GitLab outbound request guidance matched official documentation after the corrections above. GitLab's current documentation recommends signing tokens for new generic webhooks, but Argo CD's documented GitLab webhook integration uses GitLab's secret token via `webhook.gitlab.secret`, so the post correctly keeps using the Secret token field for this integration.
