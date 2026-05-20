# Validation Summary: How to Migrate Between Resource Tracking Methods in ArgoCD

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- YAML
- Bash
- kubectl
- jq

## Sources Consulted
- Argo CD Resource Tracking documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/resource_tracking/
- Argo CD annotations and labels reference: https://argo-cd.readthedocs.io/en/stable/user-guide/annotations-and-labels/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/release-3.2/user-guide/commands/argocd_app_set
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Argo CD resource health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes `kubectl rollout` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- Kubernetes `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The post said `annotation+label` allows existing label-based tracking to continue while annotations are added. Official Argo CD documentation states that in `annotation+label` mode the `app.kubernetes.io/instance` label is informational only and `argocd.argoproj.io/tracking-id` is used for tracking. Updated the explanation to preserve the compatibility point without claiming continued label tracking.
- The migration challenge section said the steps ensure resources get new metadata before Argo CD starts relying on it. Since Argo CD relies on the newly configured tracking method after the ConfigMap change is applied and the controller picks it up, updated the wording to say the process minimizes the transition window and syncs quickly to apply the new metadata.
- The verification command used `argocd app resources "$app" -o json`, but the official `argocd app resources` reference only supports tree outputs. Replaced it with `argocd app get "$app" -o json` and a jq query against `.status.resources`.
- The duplicate resource troubleshooting note implied the `tracking-id` annotation always shows the owner. Updated it to specify annotation-based tracking, since label tracking does not rely on that annotation.

## Review Notes
- The post is technically relevant and contains commands, configuration snippets, and migration procedures.
- The local environment did not have the `argocd` CLI installed, so Argo CD CLI behavior was checked against official command references rather than local `--help` output.
- The post does not pin an Argo CD version. Current Argo CD documentation lists `annotation` as the default tracking method, while older Argo CD releases used `label` as the default. The migration procedures remain valid for environments that are currently using label tracking.
