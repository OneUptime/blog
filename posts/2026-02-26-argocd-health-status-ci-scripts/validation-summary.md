# Validation Summary: How to Get Application Health Status in CI Scripts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- CI/CD shell scripting
- Argo CD CLI
- Argo CD REST API
- GitHub Actions
- GitHub Commit Status API
- jq
- curl

## Sources Consulted
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app wait` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_wait/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_sync/
- Argo CD API documentation: https://argo-cd.readthedocs.io/en/stable/developer-guide/api-docs/
- Argo CD Swagger schema: https://raw.githubusercontent.com/argoproj/argo-cd/master/assets/swagger.json
- Argo CD v2.14 to v3.0 upgrade notes: https://argo-cd.readthedocs.io/en/stable/operator-manual/upgrading/2.14-3.0/
- GitHub REST API commit statuses documentation: https://docs.github.com/en/rest/commits/statuses

## Issues Found
- The post described application health as an aggregate of all resource health statuses. Argo CD documents that application health is inferred from immediate child resources, and resource health is not inherited from child resources. Updated the wording to say the application-level health is the worst health of its immediate child resources.
- The multiple-application API example used `project=$PROJECT`. Current Argo CD API schema documents `projects` as the primary project filter and `project` as a legacy backwards-compatible name. Updated the example to use `projects=$PROJECT`.
- The GitHub status example used `Authorization: token`. Current GitHub REST examples use `Authorization: Bearer`, recommend the vendor `Accept` header, and include `X-GitHub-Api-Version`. Updated the headers accordingly.

## Review Notes
- The local environment did not have the `argocd` binary installed, so CLI flags were verified against official Argo CD command reference pages instead of local `--help` output.
- Argo CD 3.0 stores per-resource health externally by default, but the official upgrade notes direct users parsing `.status.resources[].health` to use the Argo CD CLI/API, which is what the post examples do.
