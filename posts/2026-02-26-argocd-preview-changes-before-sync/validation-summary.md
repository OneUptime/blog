# Validation Summary: How to Preview Application Changes Before Syncing in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD CLI
- Argo CD ApplicationSet Pull Request generator
- Argo CD Notifications
- Argo Rollouts
- Kubernetes manifests
- GitHub Actions
- Kustomize
- Helm values

## Sources Consulted
- Argo CD `argocd app diff` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Argo CD `argocd app manifests` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_manifests/
- Argo CD ApplicationSet Pull Request generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Pull-Request/
- Argo CD Notifications triggers documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD Notifications templates documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/
- Argo CD Notifications subscriptions documentation: https://argo-cd.readthedocs.io/en/release-2.7/operator-manual/notifications/subscriptions/
- Argo Rollouts specification documentation: https://argo-rollouts.readthedocs.io/en/latest/features/specification/
- Argo Rollouts NGINX traffic management documentation: https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/nginx/
- Argo Rollouts kubectl plugin command reference: https://argo-rollouts.readthedocs.io/en/stable/generated/kubectl-argo-rollouts/kubectl-argo-rollouts/
- GitHub `actions/checkout` documentation: https://github.com/actions/checkout

## Issues Found
- The `argocd app diff my-app --output json` example used an unsupported flag. The official `argocd app diff` command reference does not include an `--output` option; it renders through `diff` and supports `KUBECTL_EXTERNAL_DIFF`. Replaced the example with a custom diff-tool invocation.
- The GitHub Actions example used `git diff origin/main...HEAD` after a default shallow checkout, which may not have enough history or the base branch ref. Added `fetch-depth: 0` to the checkout step.
- The GitHub Actions shell snippet appended `\n` inside quoted strings, which can produce literal backslash-n text instead of newlines. Replaced that with `printf`.
- The GitHub Actions PR comment template preserved JavaScript indentation inside the markdown body. Replaced the template literal with an array joined by newlines so the generated Markdown renders correctly.
- The ApplicationSet Pull Request generator example used current Go template field syntax without enabling Go templates. Added `goTemplate: true`, `goTemplateOptions: ["missingkey=error"]`, and updated template variables to the documented `{{ .field }}` form.
- The Argo Rollouts YAML snippet lacked the required Rollout pod selector and pod template fields. Added a minimal `selector` and `template` so the manifest is structurally valid.

## Review Notes
- The examples are intentionally generic and still require environment-specific values such as Argo CD credentials, repository paths, services, ingress names, and Slack notification configuration.
- The Rollouts NGINX header-routing example assumes the referenced stable Ingress routes to the stable Service and that the NGINX ingress controller supports the configured canary annotations.
