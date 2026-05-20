# Validation Summary: How to Track a Git Branch in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD CLI
- Argo CD Application manifests
- Argo CD ApplicationSet Git generator
- Kubernetes manifests
- Git branch tracking

## Sources Consulted
- Argo CD Declarative Setup: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD `argocd app create` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_create/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD Git webhook configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/webhook/
- Argo CD FAQ on repository polling and reconciliation timeout: https://argo-cd.readthedocs.io/en/latest/faq/
- Argo CD ApplicationSet Git generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Git/

## Issues Found
- The ApplicationSet section claimed the Git generator automatically generates applications for branches. The documented Git directory generator generates applications from matching repository directories, not from branch enumeration. Updated the wording to say it generates applications for multiple overlay directories while each generated application tracks a branch.
- The ApplicationSet example used older/non-current template parameter syntax (`{{path}}` and `{{path.basename}}`). Updated it to use `goTemplate: true` and current documented parameters (`{{.path.path}}` and `{{.path.basename}}`).
- Several Application examples omitted `spec.project`. Official minimal Application examples include `project: default`, so the examples were updated to include it.
- The reconciliation ConfigMap comment said it reduced polling to exactly 1 minute. Official docs describe the default as a base interval plus jitter, so the comment was changed to "base polling interval" to avoid implying exact timing.

## Review Notes
The Argo CD CLI flags, `targetRevision` usage, webhook endpoint, `timeout.reconciliation` key, and `argocd app get --hard-refresh` command were verified against official Argo CD documentation. The post does not pin an Argo CD version, so the review used current stable/latest official docs as of 2026-05-20.
