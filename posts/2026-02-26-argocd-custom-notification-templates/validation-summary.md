# Validation Summary: How to Create Custom Notification Templates in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Notifications
- Kubernetes ConfigMaps
- Go templates / Sprig template functions
- Slack notification templates
- Email notification templates
- Webhook notification templates
- `kubectl` and `argocd admin notifications` CLI commands

## Sources Consulted
- Argo CD notification templates documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/
- Argo CD notification triggers documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD Slack notification service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/slack/
- Argo CD Email notification service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/email/
- Argo CD Webhook notification service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD notification troubleshooting commands: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/troubleshooting-commands/
- Argo CD `argocd admin notifications template notify` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_admin_notifications_template_notify/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/

## Issues Found
- The post said Argo CD notification templates use Go's `text/template` package. Official Argo CD documentation says notification templates use Go's `html/template` package, so this was corrected.
- The post said Argo CD sends to all services defined in a template when a trigger fires. Argo CD sends notifications to subscribed recipients and uses the matching service-specific fields, so this wording was corrected.
- The email examples used `email.body` and `email.content-type`. Official Argo CD email templates document `email.subject`; the body content is supplied by the top-level `message` field, while `body` is a webhook field. The examples were corrected to use `message` for email content.
- The `.context.argocdUrl` section was labeled "Context Functions", but Argo CD documents `context` as a user-defined string map. The heading was changed to "Context Values".
- The time example claimed to format timestamps but only printed the raw timestamp. It now uses Argo CD's `.time.Parse` helper and Go `Time.Format`.
- The template reuse section implied reusable Go named template fragments. Argo CD templates are reusable by trigger references and can be composed by sending multiple templates, but Go `define`/`template` blocks are not supported. The wording was corrected.
- The error handling section described template failures as silent. Argo CD logs notification/template failures, so this was corrected.
- The testing section said there is no built-in template testing tool. Argo CD provides `argocd admin notifications template notify`, so the section now mentions it.

## Review Notes
- The remaining snippets are partial `argocd-notifications-cm` data examples rather than full Kubernetes manifests, which is appropriate for this guide.
- HTML email rendering in Argo CD is controlled by the email service configuration's `html` option, not by a per-template `content-type` field.
