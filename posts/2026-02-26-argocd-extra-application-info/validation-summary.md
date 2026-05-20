# Validation Summary: How to Add Extra Application Info to ArgoCD UI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Applications
- Argo CD CLI
- Argo CD ApplicationSets
- Kubernetes labels and annotations
- Argo CD UI extensions
- Argo CD Notifications

## Sources Consulted
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Add extra Application info: https://argo-cd.readthedocs.io/en/stable/user-guide/extra_info/
- Argo CD `argocd app set` Command Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_set/
- Argo CD `argocd app patch` Command Reference: https://argo-cd.readthedocs.io/en/release-2.7/user-guide/commands/argocd_app_patch/
- Argo CD `argocd app list` Command Reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Argo CD Git Generator documentation for ApplicationSets: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Git/
- Argo CD UI Extensions documentation: https://argo-cd.readthedocs.io/en/release-3.4/developer-guide/extensions/ui-extensions/
- Argo CD Notification Subscriptions documentation: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/notifications/subscriptions/
- Argo CD External URL Links documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/external-url/
- Argo CD Annotations and Labels reference: https://argo-cd.readthedocs.io/en/stable/user-guide/annotations-and-labels/

## Issues Found
- The CLI example used `argocd app set --info`, but the official `argocd app set` command reference does not include an `--info` flag. Changed the example to use `argocd app patch --type merge --patch ...`, which is supported by the official `argocd app patch` command and updates `spec.info` directly.
- The ApplicationSet example used legacy-style template expressions such as `{{name}}`. Updated the snippet to enable `goTemplate: true`, add `goTemplateOptions: ["missingkey=error"]`, and use current Go template expressions such as `{{.name}}`, matching current Argo CD ApplicationSet documentation.

## Review Notes
The `spec.info` field, label selector examples, notification subscription annotation format, and UI extension claims were verified against official Argo CD documentation. The URL examples use placeholder domains and are structurally plausible.
