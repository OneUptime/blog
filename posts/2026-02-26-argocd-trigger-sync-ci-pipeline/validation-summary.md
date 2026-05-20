# Validation Summary: How to Trigger ArgoCD Sync from CI Pipeline

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- GitHub Actions
- GitLab CI
- Jenkins Pipeline
- REST API / curl
- Git webhooks

## Sources Consulted
- Argo CD webhook configuration documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/webhook/
- Argo CD local users/accounts documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_sync/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app wait` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_wait/
- Argo CD `argocd account generate-token` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_generate-token/
- Argo CD API documentation: https://argo-cd.readthedocs.io/en/stable/developer-guide/api-docs/
- Argo CD OpenAPI schema: https://raw.githubusercontent.com/argoproj/argo-cd/master/assets/swagger.json
- Argo CD GitHub releases: https://github.com/argoproj/argo-cd/releases

## Issues Found
- The GitHub and GitLab webhook secret snippets used `argocd-cm` ConfigMaps. Official Argo CD documentation configures provider webhook secrets in the `argocd-secret` Secret under keys such as `webhook.github.secret` and `webhook.gitlab.secret`, so both snippets were changed to `kind: Secret`, `name: argocd-secret`, and `stringData`.
- The Jenkins example used `${GIT_COMMIT[0..6]}` inside a shell step. That is not valid shell syntax, so it was replaced with `IMAGE_TAG="$(git rev-parse --short=7 HEAD)"` and the build/push commands now use that tag.
- The GitHub Actions manifest update step committed without setting a Git identity. Hosted CI environments can fail `git commit` without `user.name` and `user.email`, so bot identity configuration was added before committing.
- The GitLab CI example pinned `argoproj/argocd:v2.10.0`, which is outdated for a post validated on 2026-05-20. It was updated to `argoproj/argocd:v3.4.2`, the latest Argo CD release observed during validation.
- The API refresh-and-sync example posted to the sync endpoint without a JSON body or `Content-Type`. The Argo CD OpenAPI schema defines a sync request body, so the example now sends `Content-Type: application/json` with an empty JSON object.
- The best-practice item said to always use `--grpc-web` from CI. The official CLI describes it as useful when the Argo CD server is behind a proxy that does not support HTTP/2, so the wording was changed to use it when needed.

## Review Notes
- The Argo CD CLI flags shown for sync, wait, refresh, auth tokens, retries, pruning, and gRPC-web are present in the official command reference.
- The API endpoint `/api/v1/applications/{name}/sync`, bearer-token authorization, refresh query parameter, `revision`, `prune`, `strategy.apply.force`, and resource-scoped sync request fields match the official API documentation and OpenAPI schema.
- The local account and RBAC examples match Argo CD documentation for `accounts.<name>: apiKey`, `argocd account generate-token --account`, and direct local-user RBAC policy assignment.
