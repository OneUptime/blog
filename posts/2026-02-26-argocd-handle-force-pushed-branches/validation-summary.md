# Validation Summary: How to Handle Force-Pushed Branches in ArgoCD

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Argo CD
- Git and Git fetch refspecs
- Kubernetes manifests
- GitHub webhooks
- Prometheus metrics

## Sources Consulted
- Argo CD Git client source, showing repo fetch uses `git fetch origin <revision> --tags --force --prune`: https://github.com/argoproj/argo-cd/blob/v3.4.1/util/git/client.go
- Argo CD webhook documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/webhook/
- Argo CD command reference for `argocd app get --hard-refresh`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD command reference for `argocd app diff --hard-refresh`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Argo CD API/OpenAPI definitions for `GET /api/v1/applications/{name}?refresh=hard`: https://github.com/argoproj/argo-cd/blob/v3.4.1/assets/swagger.json
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Git fetch documentation for `--force`, `--prune`, and force-update refspecs: https://git-scm.com/docs/git-fetch

## Issues Found
- The post claimed ArgoCD must be configured to use force-fetch refspecs through a mounted `.gitconfig`. Current Argo CD already fetches with `--force --prune`, so the section was corrected to describe the built-in behavior and remove the unsupported custom ConfigMap/deployment patch.
- The post described hard refresh as deleting the cached repository and recloning. Official CLI docs describe `--hard-refresh` as refreshing application data and the target manifest cache, so the wording was corrected.
- The REST API example used `POST /api/v1/applications/{name}?refresh=hard`. The Argo CD API exposes this refresh parameter on `GET /api/v1/applications/{name}`, so the curl command was corrected.
- The webhook secret example placed `webhook.github.secret` in `argocd-cm`. Official Argo CD docs place provider webhook secrets in the `argocd-secret` Secret, so the YAML was corrected.
- The custom Kubernetes Job example used `bitnami/kubectl` while invoking the `argocd` CLI and did not provide a working webhook handler. It was removed in favor of Argo CD's official webhook integration.
- The fetch error example included `fatal: refusing to merge unrelated histories`, which is a merge/pull error rather than the typical Argo CD fetch failure mode. It was replaced with a missing advertised commit example.
- The monitoring query used `argocd_git_request_total{grpc_code!="OK"}`, but current Argo CD repo-server metrics expose `argocd_git_fetch_fail_total` for fetch failures and do not document a `grpc_code` label on that metric. The query was corrected.
- The post stated that commit SHAs remain usable after force pushes. This was narrowed to explain that a SHA identifies an exact object, but the object must still be reachable or fetchable from the remote.

## Review Notes
The overall guidance to avoid force pushes on production-tracked branches, use branch protection, configure Argo CD webhooks, and use explicit revisions for production deployments is technically sound. The main correction was changing the article from a custom Git configuration workaround to the behavior Argo CD already provides in current releases.
