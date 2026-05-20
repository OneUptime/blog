# Validation Summary: How to Debug ArgoCD Dex Server Issues

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Argo CD
- Dex
- Kubernetes
- kubectl
- OIDC/OAuth2
- GitHub and generic OIDC Dex connectors
- Kubernetes ConfigMaps, Secrets, RBAC, Services, and Endpoints

## Sources Consulted
- Argo CD user management and Dex SSO documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/user-management/
- Argo CD `argocd-dex gendexcfg` command reference: https://argo-cd.readthedocs.io/en/latest/operator-manual/server-commands/argocd-dex_gendexcfg/
- Argo CD Dex utility source documentation: https://pkg.go.dev/github.com/argoproj/argo-cd/v3/util/dex
- Argo CD command parameters reference for Dex TLS and server parameters: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD upstream install manifests for Dex service ports and RBAC: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
- Argo CD Dex config generation source: https://raw.githubusercontent.com/argoproj/argo-cd/stable/util/dex/config.go
- Dex OIDC connector documentation: https://dexidp.io/docs/connectors/oidc/
- Dex GitHub connector documentation: https://github.com/dexidp/website/blob/main/content/docs/connectors/github.md
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The post described Dex port 5556 as HTTP-only. Updated it to HTTP/HTTPS and added port 5558 for telemetry, matching Argo CD/Dex configuration.
- The post claimed Dex crashes when `argocd-cm` has no `url`. Argo CD settings treat Dex SSO as not configured when the URL is empty, so the wording was corrected.
- The Dex discovery examples used `/dex/.well-known/openid-configuration`. Argo CD's bundled Dex issuer path is `/api/dex`, so the examples now use `/api/dex/.well-known/openid-configuration`.
- The post said OIDC discovery shows available connectors. Discovery verifies issuer metadata, not connector IDs, so the comment was corrected.
- The Dex health check used `/dex/healthz` on port 5556. Dex health endpoints are exposed on the telemetry port, so the examples now use `http://localhost:5558/healthz/ready`.
- The "gRPC health" command used HTTP `curl` against the gRPC port 5557. Replaced it with a Kubernetes endpoint check so the command no longer implies an HTTP health endpoint on a gRPC port.
- The GitHub groups example set `loadAllGroups: true` while also specifying `orgs`. Dex documents that `loadAllGroups` only works when neither `org` nor `orgs` is configured, so the example now shows an explicit team under `orgs`.

## Review Notes
The remaining commands are operational troubleshooting commands and may depend on utilities present in the Argo CD/Dex container images, such as `curl`, `wget`, `jq`, and `python3` on the local operator machine or inside pods. The technical behavior and configuration fields were validated against current official documentation and upstream Argo CD/Dex manifests.
