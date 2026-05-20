# Validation Summary: How to Implement Developer Self-Service with ArgoCD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD and ApplicationSet
- GitOps workflows
- Kubernetes Ingress
- External Secrets Operator
- Prometheus Operator ServiceMonitor
- GitHub CLI
- Bash scripting

## Sources Consulted
- Argo CD ApplicationSet List generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-List/
- Argo CD ApplicationSet Go Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD ApplicationSet Pull Request generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Pull-Request/
- Argo CD CLI command reference for `argocd app sync`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_sync/
- Argo CD CLI command reference for `argocd app rollback`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_rollback/
- Argo CD CLI command reference for `argocd app logs`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_logs/
- GitHub CLI manual for `gh pr create`: https://cli.github.com/manual/gh_pr_create
- External Secrets Operator ExternalSecret API documentation: https://external-secrets.io/latest/api/externalsecret/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Prometheus Operator ServiceMonitor getting started documentation: https://prometheus-operator.dev/docs/developer/getting-started/

## Issues Found
- The onboarding ApplicationSet mixed default ApplicationSet template syntax with Go template syntax and had an extra Matrix generator that would create Applications without the `environment` value required by the template. I changed it to a single Matrix generator with `goTemplate: true`, `goTemplateOptions: ["missingkey=error"]`, and Go-template parameter references such as `{{.team}}`.
- The onboarding ApplicationSet's nested `range` example used `$` as if it referred to the current application, but in Go templates `$` refers to the root context. I changed the loop to bind the application and environment to `$app` and `$env`.
- The CLI `create` flow wrote an application config to `/tmp/app-config.yaml` and then created a PR without modifying, committing, or pushing the platform configuration repository. I changed the example to create a branch, append the application entry to `onboarding/applications.yaml`, commit it, push it, and then run `gh pr create`.
- The rollback command used history ID `0` while describing a rollback to the previous version. Argo CD documents the history ID as optional and says omitting it rolls back to the previous version, so I removed the hard-coded `0`.
- The preview ApplicationSet used non-Go-template variables like `{{number}}` and `{{branch}}`. I enabled Go templates, changed variable references to `{{.number}}`, and changed `targetRevision` to `{{.head_sha}}`, which Argo CD documents for pull request generated Applications.
- The ExternalSecret snippet used `external-secrets.io/v1beta1`. The current External Secrets documentation uses `external-secrets.io/v1`, so I updated the apiVersion.

## Review Notes
- The Ingress and ServiceMonitor snippets use current API groups and valid field shapes. The ServiceMonitor assumes the selected Kubernetes Service has a named port `http`, which is required for the `port` field to resolve.
- The preview environment TTL annotation is an example convention. Argo CD does not delete resources based on that annotation by itself; it requires a separate controller or cleanup process.
