# Validation Summary: How to Reduce ArgoCD API Server Load

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo CD
- Kubernetes
- Redis
- NGINX Ingress Controller
- Prometheus
- Argo CD CLI

## Sources Consulted
- Argo CD `argocd-cmd-params-cm` reference: https://argo-cd.readthedocs.io/en/release-3.3/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD `argocd-server` command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-server/
- Argo CD high availability documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD `argocd app wait` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_wait/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/release-2.13/operator-manual/rbac/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/metrics/
- NGINX Ingress Controller annotation documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/

## Issues Found
- The Redis configuration comment described `redis.server` as a connection pool setting. Changed the comment to accurately describe it as the Redis hostname and port, and normalized the cache duration example to the documented `1h0m0s` format.
- Complete Kubernetes Deployment examples were missing required `spec.selector` and matching pod template labels. Added selectors and labels to the Redis and API server Deployment snippets.
- The API server scaling example omitted `ARGOCD_API_SERVER_REPLICAS`, which Argo CD documents for scaled API server deployments. Added the environment variable to match the replica count.
- The UI settings section used `server.disable.auth` and `server.status.cache.expiration` as UI load controls. `server.disable.auth` controls authentication, and `server.status.cache.expiration` is not a documented Argo CD server parameter. Replaced them with documented server gzip and application state cache settings.
- The rate limiting section used `server.api.content.types` as a rate limit setting. That parameter controls allowed non-GET content types, not request rate. Replaced it with the documented `server.webhook.parallelism.limit` and clarified that general HTTP API rate limiting should happen at ingress or gateway level.
- The CI/CD subsection title said to use webhooks, but the example used `argocd app wait`. Renamed the subsection to accurately describe the recommendation.
- The read-only replica example used `argocd-server --read-only`, which is not a documented `argocd-server` option. Replaced it with Argo CD RBAC configuration for read-only monitoring access.
- The monitoring section used the gRPC latency histogram without noting that Argo CD requires `ARGOCD_ENABLE_GRPC_TIME_HISTOGRAM=true` for gRPC histogram metrics. Added that caveat.
- The unauthenticated health check used `/api/v1/session/userinfo`, which is an authenticated user-info endpoint. Replaced it with `/healthz`.

## Review Notes
- The post remains a practical guide rather than a complete production manifest. Some snippets are intentionally partial patches and still need to be merged with the installed Argo CD manifests or Helm values in a real deployment.
