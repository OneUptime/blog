# Validation Summary: How to Create Scale Actions for Deployments in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD resource actions
- Argo CD CLI
- Kubernetes Deployments
- Kubernetes StatefulSets
- Kubernetes ReplicaSets
- Horizontal Pod Autoscaler behavior
- Lua resource action scripts
- YAML Kubernetes and Argo CD configuration

## Sources Consulted
- Argo CD Resource Actions documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/resource_actions/
- Argo CD `argocd app actions run` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_actions_run/
- Argo CD Diff Customization documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD Automated Sync Policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes ReplicaSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/replicaset/

## Issues Found
- Deployment and StatefulSet custom action examples omitted `mergeBuiltinActions: true`. Current Argo CD documentation states custom resource action customizations override built-in actions by default, and Argo CD 2.13+ supports `mergeBuiltinActions` to retain built-ins. Added `mergeBuiltinActions: true` to the Deployment and StatefulSet examples and added a short version caveat.
- The auto-sync section stated that auto-sync alone will revert live replica changes on the next sync. Argo CD documentation says live cluster drift triggers automated correction when self-heal is enabled; without self-heal, a later Git-triggered or manual sync can still revert the change. Updated the wording to distinguish these cases.

## Review Notes
The Argo CD CLI examples use valid `argocd app actions run` flags. The `ignoreDifferences` example for `/spec/replicas` matches Argo CD diff customization documentation. The Kubernetes scaling claims for Deployments, StatefulSets, and ReplicaSets are consistent with Kubernetes documentation. YAML code blocks were parsed successfully after wrapping excerpted ConfigMap snippets under `data:`.
