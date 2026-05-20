# Validation Summary: How to View Application Resource Tree in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD UI
- Argo CD CLI
- GitOps
- Kubernetes owner references and resource health

## Sources Consulted
- Argo CD UI customization documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/ui-customization/
- Argo CD `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD `argocd app logs` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_logs/
- Argo CD resource health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD resource tracking documentation: https://argo-cd.readthedocs.io/en/release-2.11/user-guide/resource_tracking/
- Kubernetes owners and dependents documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/owners-dependents/
- Argo CD UI source code for application details, filters, resource tree, and resource details: https://github.com/argoproj/argo-cd/tree/master/ui/src/app/applications/components

## Issues Found
- The example resource count said "all six resources (plus the three child resources)" for a graph containing seven resources total. Changed it to state that all seven resources shown are part of the application view.
- The post described exact health icon shapes and omitted the `Missing` health state. Changed this to list the health states without over-specifying icon artwork.
- The sync status section implied that resources without an indicator are always Kubernetes-created resources. Changed this to the more precise explanation that they are not directly tracked as desired resources for comparison.
- The node detail section claimed creation timestamp appears on hover. The current UI displays age/resource labels when available, so the wording was corrected.
- The context menu section mentioned right-click and a Details action. The current UI exposes node actions through the three-dot menu and opens details by selecting the node, so the menu wording was corrected.
- The post described group-by options for kind, health, and sync. The current Argo CD resource tree has filters for those fields and a group-nodes control that collapses repeated sibling resources of the same kind. Replaced the inaccurate group-by section with the correct group-nodes behavior.
- The complex application tips referred to compact view and highlighting from search. Updated this to the group-nodes option and narrowing the tree with the name filter.
- The CLI example `argocd app resources my-app --kind Deployment --name web` is not supported by the official `argocd app resources` command. Replaced the CLI examples with documented `--output tree` and `--output tree=detailed` usage.

## Review Notes
The Argo CD UI evolves over time and can also be extended with custom UI extensions and resource actions. The reviewed post now avoids over-specifying UI icon artwork or exact optional actions while preserving the practical workflow.
