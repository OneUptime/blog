# Validation Summary: How to Increase ArgoCD Log Verbosity for Debugging

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- kubectl
- Dex
- gRPC Go logging

## Sources Consulted
- Argo CD `argocd-cmd-params-cm.yaml` reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD additional command configuration method: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/additional-configuration-method/
- Argo CD `argocd-server` command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-server/
- Argo CD `argocd-dex rundex` command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-dex_rundex/
- Argo CD official stable install manifest: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
- Kubernetes `kubectl rollout` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- Kubernetes `kubectl patch` documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/update-api-object-kubectl-patch/
- gRPC Go `grpclog` package documentation: https://pkg.go.dev/google.golang.org/grpc/grpclog

## Issues Found
- The post listed unsupported Argo CD component log levels `fatal` and `trace`. Current Argo CD command references list `debug|info|warn|error`, so the table was corrected.
- The post claimed `trace` logs include gRPC payloads and generally overstated gRPC detail. This was softened to gRPC-related messages and gRPC call traces.
- The restart and log commands treated `argocd-application-controller` as a Deployment. The official stable manifest defines it as a StatefulSet, so those commands were changed to use `statefulset/argocd-application-controller`.
- The initial ConfigMap example included ApplicationSet and Notifications controller log levels but did not restart those deployments. Restart and status commands now include them.
- Dex logging was shown as a `dex.config` logger block. Argo CD exposes `dexserver.log.level` and `dexserver.log.format` command parameters, so the Dex section now uses `argocd-cmd-params-cm`.
- Several log filtering examples only matched text-formatted `level=debug` logs. Current Argo CD docs show JSON as the default log format, so filters now also match `"level":"debug"`.
- The revert examples set log formats back to `text`, but current Argo CD references document `json` as the default for these components. Revert snippets now use `json`.
- The "all components" patch example omitted ApplicationSet, Notifications, and Dex after the post had introduced them. The example now includes the corresponding keys.

## Review Notes
The commands are syntactically valid based on the Kubernetes and Argo CD references reviewed, but they were not executed against a live Argo CD cluster in this environment.
