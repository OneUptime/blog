# Validation Summary: How to Add a Public Git Repository to ArgoCD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD
- Kubernetes
- Git
- GitHub webhooks
- Kubernetes Secrets and ConfigMaps

## Sources Consulted
- Argo CD `argocd repo add` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- Argo CD `argocd repo get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_get/
- Argo CD declarative setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD webhook configuration documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/webhook/
- Argo CD FAQ on repository polling and reconciliation: https://argo-cd.readthedocs.io/en/stable/faq/
- Argo CD `argocd-repo-server` command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-repo-server/
- Argo CD high availability documentation for repo-server caching: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD `argocd-cmd-params-cm` example: https://argo-cd.readthedocs.io/en/release-2.9/operator-manual/argocd-cmd-params-cm-yaml/
- GitHub REST API rate limit documentation: https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api

## Issues Found
- The post stated that public repositories must be registered for Argo CD to track them. I changed this to say that registration provides an explicit place to manage and verify connection settings, because public repositories can also be referenced directly from an Application when allowed by the project configuration.
- The rate-limit section implied Argo CD repository polling consumes GitHub REST API quota. I clarified that Argo CD polling uses Git requests, while GitHub's 60-per-hour and 5,000-per-hour figures are REST API primary rate limits.
- The webhook example stored `webhook.github.secret` in `argocd-cm`. I changed it to `argocd-secret`, which is where Argo CD documents provider webhook secrets.
- The webhook instructions omitted GitHub's JSON payload requirement. I added that the webhook should send JSON payloads to `/api/webhook`.
- The repo-server cache example used an `ARGOCD_REPO_CACHE_EXPIRATION` environment variable on the Deployment. I changed it to the documented `argocd-cmd-params-cm` key `reposerver.repo.cache.expiration`.

## Review Notes
The remaining CLI commands, repository Secret format, Application manifest fields, reconciliation settings, and removal commands are consistent with current Argo CD documentation. The exact Argo CD UI labels can vary slightly by version, but the described workflow is technically valid.
