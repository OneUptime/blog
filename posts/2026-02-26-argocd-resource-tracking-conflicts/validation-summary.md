# Validation Summary: How to Handle Resource Tracking Conflicts in ArgoCD

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- Argo CD Application and AppProject manifests
- Argo CD CLI
- kubectl
- Prometheus alerting

## Sources Consulted
- Argo CD Resource Tracking documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/resource_tracking/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Compare Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/compare-options/
- Argo CD Application Controller Metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD `argocd app wait` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_wait/
- Argo CD Project Specification documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- OneUptime linked post, checked for URL relevance: https://oneuptime.com/blog/post/2026-02-09-argocd-resource-tracking/view

## Issues Found
- The post described label-based tracking as the default. Current Argo CD documentation lists annotation-based tracking as the default, with `label`, `annotation`, and `annotation+label` as valid options. Updated the explanation to distinguish current defaults from older label-based installations.
- The `argocd app resources my-app --output json` command was invalid for the current command reference, which only supports tree outputs for that command. Replaced it with `argocd app get my-app -o json | jq '.status.resources[] | {kind, name, namespace}'`.
- The `kubectl get all` example claimed to find all resources with tracking annotations, but `kubectl get all` only returns a common subset of resource types. Updated the wording to say "common workload resources."
- The first resolution strategy used `ignoreDifferences` as if it excluded a resource from sync. `ignoreDifferences` controls diff behavior, not resource ownership. Replaced that snippet with a refresh and sync sequence after removing the duplicate manifest from the secondary app's Git path.
- The "shared resource annotations" section used `argocd.argoproj.io/managed-by: external`, which is not documented as an Argo CD mechanism for shared resource ownership. Reworked the section to use documented `argocd.argoproj.io/compare-options: IgnoreExtraneous` and `argocd.argoproj.io/sync-options: Prune=false` annotations, with a caveat that these do not make a resource safely owned by multiple applications.
- The AppProject example omitted `sourceRepos`, making the policy incomplete for a usable project. Added a scoped repository allowlist.
- The migration sequence used `argocd app sync old-app --prune=false`, which is not the documented way to configure no-prune behavior at the application level and did not remove the resource from Git before reconciling. Updated the sequence to set `Prune=false`, remove the resource from the old app's Git source, sync the old app, clear old tracking metadata if the live resource remains, then sync the new app.

## Review Notes
The Prometheus example is technically valid as a broad sync-error alert because `argocd_app_sync_total` and the `phase="Error"` label value are documented, but it is not specific to tracking conflicts. It should be treated as a possible-signal alert rather than a precise conflict detector.
