# Validation Summary: ArgoCD Runbook: Application Stuck in Sync Loop

## Status
validated

## Post Type
Runbook / Troubleshooting guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- kubectl
- Kubernetes admission webhooks
- Kubernetes controllers such as HPA, VPA, cert-manager, and ExternalDNS

## Sources Consulted
- Argo CD Diff Strategies: https://argo-cd.readthedocs.io/en/stable/user-guide/diff-strategies/
- Argo CD Automated Sync Policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD app diff command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Argo CD app get command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD app set command reference: https://argo-cd.readthedocs.io/en/release-2.12/user-guide/commands/argocd_app_set/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl events reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Kubernetes Pod lifecycle documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/

## Issues Found
- The post described continuous automated re-sync without noting Argo CD's self-heal behavior. Argo CD normally avoids repeated automated syncs for the same commit and parameters unless `selfHeal` is enabled, so the introduction and impact assessment were updated to mention automatic self-healing.
- The command `argocd app get my-app --show-resources` is not present in the current Argo CD `app get` command reference. It was replaced with `argocd app get my-app -o tree | grep OutOfSync`, which uses a documented output mode.
- The Application annotation for server-side diff used `argocd.argoproj.io/compare-option`, but Argo CD documents the annotation as `argocd.argoproj.io/compare-options`. The snippet was corrected.
- The server-side diff section said admission webhook mutations are handled automatically. Argo CD documents that mutation webhook changes are not included by default and require `IncludeMutationWebhook=true`, so the text and per-application annotation were corrected.
- The global server-side diff example placed `controller.diff.server.side` in `argocd-cm`. Argo CD documents this setting in `argocd-cmd-params-cm`, so the ConfigMap example was corrected.

## Review Notes
The local environment did not have `argocd` or `kubectl` installed, so CLI verification was performed against the official command references. The linked OneUptime runbook URL is an internal blog URL pattern and appears plausible, but it was not treated as a technical authority.
