# Validation Summary: How to Use argocd.argoproj.io/tracking-id Label

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD resource tracking
- Kubernetes labels and annotations
- Helm chart labels
- Argo CD CLI
- Kubernetes `kubectl` JSONPath

## Sources Consulted
- Argo CD Resource Tracking documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/resource_tracking/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Kubernetes recommended labels documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/
- Helm chart label best practices: https://helm.sh/docs/chart_best_practices/labels/

## Issues Found
- The post described `argocd.argoproj.io/tracking-id` as a label. It is an annotation in Argo CD's annotation-based tracking. Updated the title, description, and introductory explanation accordingly.
- The post stated that label-based tracking is the default. Current Argo CD documentation lists `annotation` as the default tracking method, while older Argo CD releases used `label` as the default. Updated the tracking method list and label-mode explanation to distinguish current behavior from legacy behavior.
- The migration section used `argocd app get --hard-refresh` as the step to apply tracking metadata. Argo CD documentation describes `--hard-refresh` as refreshing app data and target manifests cache, not syncing resources. Replaced this with `argocd app sync "$app"` so the new tracking metadata is applied to live resources.
- The shared resource section implied that Argo CD always prevents or fails on shared resources. Official docs state that Argo CD applies manifests by default and fails only when `FailOnSharedResource=true` is set. Updated the explanation.
- The debugging section described a label selector as a generic orphaned-resource check, which is only applicable to label-based or `annotation+label` tracking. Updated the comment to avoid implying it works for annotation-only tracking.

## Review Notes
The `argocd.argoproj.io/tracking-id` format, `application.resourceTrackingMethod` ConfigMap key, valid tracking method values, `FailOnSharedResource` sync option, and Argo CD CLI command shapes were verified against official documentation. The local Argo CD CLI was not installed, so CLI validation was performed against the official command reference.
