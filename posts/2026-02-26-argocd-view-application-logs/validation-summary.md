# Validation Summary: How to View Application Logs in ArgoCD UI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD UI
- Argo CD CLI
- Argo CD RBAC
- Kubernetes Pod logs
- Kubernetes RBAC

## Sources Consulted
- Argo CD `argocd app logs` command reference: https://argo-cd.readthedocs.io/en/release-3.2/user-guide/commands/argocd_app_logs/
- Argo CD RBAC documentation for the `logs` resource: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD `argocd-cmd-params-cm` reference showing `server.enable.gzip`: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD upstream source for UI log viewer behavior: https://github.com/argoproj/argo-cd
- Argo CD upstream manifests for `argocd-server` Pod log permissions: https://github.com/argoproj/argo-cd/tree/master/manifests/cluster-rbac/server
- Argo CD upstream `argocd-cm` reference for `server.maxPodLogsToRender`: https://github.com/argoproj/argo-cd/blob/master/docs/operator-manual/argocd-cm.yaml

## Issues Found
- The post said the UI log filter works client-side on logs already loaded in the browser. Updated this to state that the filter is sent to Argo CD's log API and filters streamed output, with UI highlighting for matches.
- The post implied timestamps are always displayed. Updated this to clarify that Argo CD requests Kubernetes log timestamps and lets the user toggle timestamp display.
- The copy feature was described as copying specific selected lines. Updated this to match current UI behavior: the copy button copies the currently loaded log output.
- The Deployment section implied logs from previous ReplicaSet Pods are available generally. Clarified that this is only true if those Pods still exist.
- The RBAC section said log viewing must be explicitly granted by default. Updated this to focus on custom roles and the required `logs, get` permission, since built-in/default role configuration can also grant log access.
- The post incorrectly described `server.enable.gzip` as enabling server-side streaming logs. Updated the section to clarify that this setting only toggles HTTP gzip compression and does not enable logs.
- The Kubernetes RBAC example used `argocd-application-controller` and `pods/log` with `get` and `list`. Updated it to `argocd-server` with `get` on `pods` and `pods/log`, matching upstream Argo CD manifests for UI log viewing.
- The limitations section said there is no cross-pod aggregation. Updated this to describe Argo CD's limited parent-resource log aggregation and the `server.maxPodLogsToRender` cap.

## Review Notes
The CLI examples use current documented flags, including `--kind`, `--name`, `--container`, `--follow`, and `--previous`. The article remains version-sensitive because Argo CD log RBAC behavior changed across older 2.x releases; the corrected text matches current Argo CD behavior as of the review date.
