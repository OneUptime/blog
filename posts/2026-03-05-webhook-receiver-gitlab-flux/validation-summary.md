# Validation Summary: How to Configure Webhook Receiver for GitLab in Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD notification-controller
- Flux Receiver custom resources
- Flux GitRepository sources
- GitLab project webhooks
- Kubernetes Secrets
- Kubernetes Ingress
- kubectl

## Sources Consulted
- Flux documentation: Receiver custom resources and GitLab receiver behavior: https://fluxcd.io/flux/components/notification/receivers/
- Flux documentation: Webhook receiver setup guide: https://fluxcd.io/flux/guides/webhook-receivers/
- GitLab documentation: Project webhooks configuration and request headers: https://docs.gitlab.com/user/project/integrations/webhooks/
- GitLab documentation: Webhook event names for push and tag push events: https://docs.gitlab.com/user/project/integrations/webhook_events/

## Issues Found
- The prerequisites said "Admin or maintainer access" was needed for GitLab webhook configuration. GitLab's current project webhook documentation specifies the Maintainer or Owner role, so this was changed to "Maintainer or Owner access."
- The GitLab webhook setup steps skipped the current UI action to select **Add new webhook** before entering the URL and token. This step was added, and the subsequent steps were renumbered.

## Review Notes
- The Flux Receiver API version, `type: gitlab`, event names (`Push Hook` and `Tag Push Hook`), secret token key, `.status.webhookPath` usage, and `X-Gitlab-Token` authentication behavior match the current Flux documentation.
- GitLab's current documentation recommends signing tokens for new webhooks, but Flux's GitLab receiver currently validates the legacy Secret token through the `X-Gitlab-Token` header. The post correctly instructs readers to configure GitLab's Secret token field for Flux compatibility.
