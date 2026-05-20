# Validation Summary: How to Configure ArgoCD Server Environment Variables

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes Deployments and ConfigMaps
- Helm
- Kustomize
- kubectl

## Sources Consulted
- Argo CD argocd-cmd-params-cm example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD argocd-server command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-server/
- Argo CD additional configuration method: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/additional-configuration-method/
- Argo CD ingress documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/ingress/
- Argo CD user management documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/
- Argo CD CLI admin settings reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_admin_settings/
- Argo Helm chart values and README: https://github.com/argoproj/argo-helm/tree/main/charts/argo-cd
- Argo CD source for argocd-server flags and environment variables: https://github.com/argoproj/argo-cd/blob/master/cmd/argocd-server/commands/argocd_server.go

## Issues Found
- The post used `ARGOCD_LOG_LEVEL` and `ARGOCD_LOG_FORMAT` for server logging. Current `argocd-server` flags read `ARGOCD_SERVER_LOG_LEVEL` and `ARGOCD_SERVER_LOGFORMAT`, so the examples were updated.
- The gRPC size example used `ARGOCD_SERVER_MAX_GRPC_MESSAGE_SIZE`, bytes, and `server.grpc.max-size-mb`. Current Argo CD uses `ARGOCD_GRPC_MAX_SIZE_MB` and the ConfigMap key `reposerver.grpc.max.size`, so the example was corrected to MB values.
- The connection settings example described setting the server port but only showed the listen address. The text was corrected to describe `server.listen.address`.
- The repo server ConfigMap example omitted `repo.server` for the repo server address. It now includes `repo.server` and keeps `server.repo.server.timeout.seconds` for timeout.
- The rate limiting section incorrectly used `server.enable.gzip` as a rate limiting setting. It was changed to a compression section.
- The session management example used unsupported `server.session.maxage`. It was replaced with `users.session.duration`, which belongs in `argocd-cm`.
- The RBAC and admin-user settings were shown without their owning ConfigMaps. The examples now distinguish `argocd-cm` for `admin.enabled` from `argocd-rbac-cm` for `policy.default`.
- The static assets section described `server.disable.auth` as API-only UI disabling. It now identifies `server.staticassets` as the static assets directory and keeps authentication enabled with `server.disable.auth: "false"`.
- The common production example still used the old gRPC ConfigMap key. It now uses `reposerver.grpc.max.size`.
- The Helm values example used older `server.extraEnv` and `server.config` fields. It was updated to current `server.env` and `configs.params` usage.
- The Kustomize ConfigMap patch replaced `/data` as a whole. It now adds individual data keys.
- The secret-backed environment variable example used `ARGOCD_SERVER_DEX_SERVER_PLAINTEXT` with a URL-like secret key. It now uses `ARGOCD_SERVER_DEX_SERVER` for a Dex server address loaded from a Secret.

## Review Notes
The guide is technically relevant and remains useful after correction. Some configuration behavior is version-sensitive because Argo CD and the Helm chart have changed parameter names over time; the review used the current stable Argo CD documentation and current argo-helm chart layout as of 2026-05-20.
