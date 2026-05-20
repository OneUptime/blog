# Validation Summary: How to Use the 'FailOnSharedResource' Sync Option in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- Argo CD Application sync options
- Argo CD resource tracking
- Argo CD AppProjects

## Sources Consulted
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Resource Tracking documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/resource_tracking/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD Annotations and Labels documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/annotations-and-labels/
- Argo CD Project Specification reference: https://argo-cd.readthedocs.io/en/latest/operator-manual/project-specification/

## Issues Found
- The CLI example used `argocd app sync team-a-services --sync-option FailOnSharedResource=true` and described it as a one-time sync option. The current official `argocd app sync` command reference does not include a generic `--sync-option` flag. Changed the example to `argocd app set team-a-services --sync-option FailOnSharedResource=true`, which matches Argo CD's documented pattern for configuring sync options from the CLI.
- The post recommended `argocd.argoproj.io/managed-by` to explicitly assign ownership of an arbitrary shared resource. Official Argo CD annotation documentation does not document that annotation for resource ownership assignment. Rewrote the section to recommend one owning application for the shared resource and references from other applications.
- The resource tracking section said `annotation+label` is most reliable because it uses both the label and annotation for tracking. Official Argo CD docs state that `annotation+label` uses `argocd.argoproj.io/tracking-id` for tracking, while the `app.kubernetes.io/instance` label is informational/compatibility metadata. Updated the explanation accordingly.

## Review Notes
The main `FailOnSharedResource=true` Application sync option, Application manifests, `application.resourceTrackingMethod` values, and AppProject boundary fields were verified against official Argo CD documentation. The local Argo CD CLI was not installed, so CLI validation was performed against the official command reference.
