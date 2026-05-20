# Validation Summary: How to Configure argocd-server Command-Line Options

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD / argocd-server
- Kubernetes Deployments
- Kustomize patches
- Helm chart values
- TLS configuration
- Redis, Dex, and Argo CD repo server connectivity

## Sources Consulted
- Argo CD argocd-server command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-server/
- Argo CD TLS configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/tls/
- Argo CD ingress configuration: https://argo-cd.readthedocs.io/en/latest/operator-manual/ingress/
- Argo CD command parameters ConfigMap reference: https://github.com/argoproj/argo-cd/blob/master/docs/operator-manual/argocd-cmd-params-cm.yaml
- Argo CD stable install manifest: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
- Argo CD Helm chart values: https://raw.githubusercontent.com/argoproj/argo-helm/main/charts/argo-cd/values.yaml
- Argo CD argocd-server source: https://github.com/argoproj/argo-cd/blob/master/cmd/argocd-server/commands/argocd_server.go

## Issues Found
- The Kustomize patch replaced `/command`, but the current upstream install manifest uses `args` for `argocd-server`. Changed the patch to replace `/spec/template/spec/containers/0/args` and keep `/usr/local/bin/argocd-server` as the first argument.
- The post documented non-existent `--tls-cert-file` and `--tls-key-file` flags for `argocd-server`. Replaced them with supported TLS option flags and corrected certificate configuration to use the `argocd-server-tls` Secret with `tls.crt` and `tls.key`.
- The post said `--logformat` defaults to `text`; current Argo CD command documentation defaults it to `json`. Updated the text.
- The post implied `--enable-gzip` is off by default. Current Argo CD enables gzip by default, so the text now states that.
- The "Rate Limiting Options" section listed request validation and cache settings, not rate limiting. Renamed it and clarified `--api-content-types`.
- The architecture diagram showed direct gRPC from `argocd-server` to `argocd-application-controller` and gRPC to Dex. Removed the controller edge and changed Dex communication to HTTP/OIDC.
- The environment variable examples used `ARGOCD_LOG_LEVEL` and `ARGOCD_LOG_FORMAT`, which are not the current `argocd-server` env vars. Corrected them to `ARGOCD_SERVER_LOG_LEVEL` and `ARGOCD_SERVER_LOGFORMAT`.
- The command for viewing the current configuration showed only `command`, while the corrected manifest uses `args`. Updated it to inspect container args.
- The common mistake about setting `--rootpath` without `--basehref` was outdated for current Argo CD behavior. Replaced it with guidance about using `--rootpath` when the API also needs a non-root path.

## Review Notes
The Helm `server.extraArgs` example is valid for the Argo CD Helm chart. The chart also supports `configs.params` for many server settings, which may be preferable for installations that follow the upstream `argocd-cmd-params-cm` pattern.
