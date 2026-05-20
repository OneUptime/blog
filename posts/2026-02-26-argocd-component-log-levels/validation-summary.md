# Validation Summary: How to Configure ArgoCD Component Log Levels

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD Helm chart
- Kubernetes Deployments, StatefulSets, ConfigMaps, and kubectl
- Helm
- jq
- Container runtime log rotation

## Sources Consulted
- Argo CD argocd-server command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-server/
- Argo CD argocd-application-controller command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-application-controller/
- Argo CD argocd-repo-server command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-repo-server/
- Argo CD argocd-dex rundex command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-dex_rundex/
- Argo CD argocd-cmd-params-cm reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD additional configuration method: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/additional-configuration-method/
- Argo CD admin settings command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_settings/
- Argo Helm chart values.yaml: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/values.yaml
- Argo CD upstream install manifests: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

## Issues Found
- The application controller examples used `Deployment`, but current upstream Argo CD manifests run `argocd-application-controller` as a `StatefulSet`. Updated the workload kind and `kubectl logs` examples accordingly.
- The Helm values example used per-component `server.logLevel`, `controller.logLevel`, `repoServer.logLevel`, and `dex.logLevel` keys. Current chart values use `global.logging` and `configs.params`, with older component log fields deprecated where present. Updated the values example to use current keys.
- The dynamic log-level section claimed `argocd admin settings set --loglevel debug` could change component log levels at runtime and suggested `ARGOCD_LOG_LEVEL` via `kubectl set env`. The official CLI does not provide that subcommand for changing running component log levels, and component log levels are startup settings. Replaced this with `argocd-cmd-params-cm` patch examples followed by rollout restarts.
- The ConfigMap restart command only restarted Deployments, missing the application controller StatefulSet. Updated it to restart both Deployments and StatefulSets.
- The resource management example said to increase ephemeral storage but did not set `ephemeral-storage` requests or limits. Added explicit ephemeral storage request and limit fields.
- The introduction implied Redis was configured like Argo CD components. Clarified that Redis is supporting infrastructure and that the guide covers Argo CD component log settings.

## Review Notes
The command-line flags `--loglevel` and `--logformat` and the levels `debug`, `info`, `warn`, and `error` are current in the official Argo CD component command references. Argo CD's current default component log format is `json`, while the Helm chart global logging default is `text`; the post now uses explicit `json` settings where JSON output is recommended.
