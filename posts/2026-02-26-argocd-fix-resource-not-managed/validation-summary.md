# Validation Summary: How to Fix 'resource is not managed' Error in ArgoCD

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD
- Kubernetes
- kubectl
- Argo CD CLI
- GitOps resource tracking

## Sources Consulted
- Argo CD Resource Tracking: https://argo-cd.readthedocs.io/en/latest/user-guide/resource_tracking/
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_set/
- Argo CD `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Argo CD annotations and labels reference: https://argo-cd.readthedocs.io/en/stable/user-guide/annotations-and-labels/
- Argo CD declarative setup resource exclusions: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Kubernetes kubectl JSONPath reference: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The post stated that Argo CD defaults to label-based tracking when `application.resourceTrackingMethod` is unset. Current Argo CD documentation lists `annotation` as the default, so the post now says current versions default to `argocd.argoproj.io/tracking-id` and notes older installations may use label-based tracking.
- Several examples referred only to tracking labels. Current Argo CD can use annotation-based tracking, so those references and checks were updated to say tracking metadata and include both `argocd.argoproj.io/tracking-id` and `app.kubernetes.io/instance`.
- The post used `argocd app set my-app --name old-app-name`, but the official `argocd app set` command reference does not include a `--name` flag. The example now tells readers to update the Application manifest `metadata.name` in Git and apply it.
- The namespace explanation implied an Application could simply add another namespace. The text now clarifies that a namespaced object in a different namespace is a different resource and that the manifest and destination namespace should match the intended target.
- The ServerSideApply summary said it takes ownership without recreation. This was narrowed to say it applies changes without recreation, which more closely matches Argo CD's documented server-side apply behavior.

## Review Notes
The remaining commands and configuration snippets are consistent with current Argo CD and Kubernetes documentation. `argocd app sync --force`, `FailOnSharedResource=true`, `ServerSideApply=true`, `resource.exclusions`, `ignoreDifferences`, and `argocd app resources --output tree` are documented options. Manual resource labeling or annotation remains fragile and should be treated as a last-resort repair step.
