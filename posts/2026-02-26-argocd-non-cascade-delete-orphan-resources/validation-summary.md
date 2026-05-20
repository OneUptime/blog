# Validation Summary: How to Use Non-Cascade Delete to Orphan Resources in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- Argo CD CLI
- kubectl
- Argo CD Application and AppProject custom resources

## Sources Consulted
- Argo CD App Deletion documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/app_deletion/
- Argo CD Orphaned Resources Monitoring documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/orphaned-resources/
- Argo CD Resource Tracking documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/resource_tracking/
- Argo CD `argocd app delete` command reference: https://argo-cd.readthedocs.io/en/release-2.0/user-guide/commands/argocd_app_delete/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/

## Issues Found
- The `kubectl patch` example used a JSON patch that removes `/metadata/finalizers`. This only works when the field exists and removes all finalizers by path. Updated it to the merge patch form recommended by the Argo CD documentation: `{"metadata": {"finalizers": null}}`.
- The post stated that Argo CD tracking labels remain on orphaned resources. Current Argo CD documentation describes `argocd.argoproj.io/tracking-id` annotation tracking as the default, with labels depending on the configured tracking method. Updated the wording and examples to refer to tracking metadata, including both annotations and labels.
- The cleanup example removed only `argocd.argoproj.io/tracking-id`. Updated it to also remove `argocd.argoproj.io/installation-id`, which Argo CD may add when multiple Argo CD instances manage the same cluster.
- The targeted cleanup example removed the `app.kubernetes.io/instance` label before using the same label selector to remove annotations. Reordered the commands so annotations are removed before the selector label is removed, and clarified that the selector approach applies to resources that have the instance label.
- The orphaned resource monitoring description was too broad. Argo CD detects top-level namespaced orphaned resources in application target namespaces for projects with orphaned resource monitoring enabled, not every unmanaged object in a cluster. Updated the wording accordingly.
- The common-mistakes section said a new application might flag orphaned resources as managed by the new app. Updated this to distinguish orphan warnings from unexpected association when tracking configuration and metadata overlap.

## Review Notes
The local workspace does not have `argocd` or `kubectl` installed, so CLI validation was performed against official Argo CD documentation rather than local command output. The `kubectl get all` cleanup examples remain intentionally scoped to common resource types; they do not cover every Kubernetes resource kind.
