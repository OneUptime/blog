# Validation Summary: How to Test Notification Templates Locally in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Notifications
- Argo CD CLI
- Kubernetes Application manifests
- Go templates and Sprig template functions
- Slack notification formatting
- Email notification templates
- GitHub Actions CI

## Sources Consulted
- Argo CD CLI installation: https://argo-cd.readthedocs.io/en/latest/cli_installation/
- Argo CD notifications troubleshooting commands: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/troubleshooting-commands/
- Argo CD `argocd admin notifications template notify` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_admin_notifications_template_notify/
- Argo CD notification templates documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/
- Argo CD notification triggers and catalog: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/ and https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/catalog/
- Argo CD Slack notification service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/slack/
- Argo CD Email notification service documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/notifications/services/email/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/

## Issues Found
- The post described and installed an `argocd-notifications` binary from the Argo CD CLI release asset, but current Argo CD documentation exposes notification testing through the `argocd admin notifications` command group. Updated the description, section title, and install commands to install the binary as `argocd`.
- The post claimed notification subcommands started in Argo CD 2.6. The official notification docs and catalog exist for earlier Argo CD 2.x releases, so the version-specific claim was replaced with a neutral current-version statement.
- The example passed `argocd-notifications-cm` and `argocd-notifications-secret` as flag values, but the CLI flags expect YAML file paths or `:empty` for the secret. Updated the examples to use `./argocd-notifications-cm.yaml`, `./argocd-notifications-secret.yaml`, and `:empty` where appropriate.
- The Slack preview example used `template get`, which prints template definitions rather than rendering a service-specific notification. Replaced it with `template notify --recipient slack:...`.
- The mock Application JSON lacked `apiVersion` and `kind`, which are expected for a Kubernetes Application resource file. Added both fields and included a concrete local `template notify` command using the mock file.
- The gomplate section implied generic offline tools validate Argo CD's full function set. Clarified that offline tools are suitable for basic Go template syntax, while the `argocd` CLI should be used for Argo CD and Sprig-specific behavior.
- The staging Application used a non-existent catalog trigger name, `on-deploy-failed`. Changed it to the documented `on-sync-failed` trigger.
- The staging Application targeted a namespace that might not exist. Added `syncPolicy.syncOptions: CreateNamespace=true`, matching Argo CD sync option documentation.
- The email template used `email.body`, but Argo CD email templates use `email.subject` plus the template `message` body. Updated the snippet accordingly.

## Review Notes
The post is technically relevant and now aligns with official Argo CD notification command, template, trigger, Slack, email, and sync-option documentation. The CI example references a project-specific `scripts/validate-templates.py`; that is acceptable as illustrative CI wiring, but a future post could include or link to the script for reproducibility.
