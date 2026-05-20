# Validation Summary: How to Understand Why an Application is OutOfSync in ArgoCD

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- kubectl
- jq

## Sources Consulted
- Argo CD `argocd app diff` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD diff customization documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/diffing/
- Argo CD diff strategies documentation: https://argo-cd.readthedocs.io/en/release-3.3/user-guide/diff-strategies/
- Argo CD FAQ on reconciliation polling and OutOfSync causes: https://argo-cd.readthedocs.io/en/release-3.4/faq/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Service ClusterIP allocation documentation: https://kubernetes.io/docs/concepts/services-networking/cluster-ip-allocation/
- Kubernetes auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes audit annotations reference: https://kubernetes.io/docs/reference/labels-annotations-taints/audit-annotations/

## Issues Found
- The post claimed `argocd app resources my-app --orphaned` filters to out-of-sync resources. Official Argo CD documentation says `--orphaned` lists orphaned resources only. Changed this to use `argocd app get my-app --output tree=detailed` for resource status and a JSON plus `jq` example to filter `.status.resources[]` where `.status == "OutOfSync"`.
- The post labeled `kubectl get events` as checking Kubernetes audit logs. Kubernetes Events are different from audit events and do not reliably identify the user or API client that changed an object. Updated the text to describe Events as clues and added a note that user attribution requires the cluster's configured Kubernetes audit log backend.
- The post stated Kubernetes defaulted fields always cause a diff. Argo CD diff behavior depends on resource type and diff strategy, especially with server-side diff. Softened the statement to "can cause" and "may see them as different."
- The "Resource Version and Generation Changes" section was missing heading markup. Added the heading marker so it is correctly structured as a subsection.

## Review Notes
The core troubleshooting flow, Argo CD `diff`, `get`, `sync`, `ignoreDifferences`, `jqPathExpressions`, `managedFieldsManagers`, and Kubernetes defaulting examples are consistent with the official documentation consulted. The local environment did not have the `argocd` CLI installed, so CLI checks were verified against official Argo CD command reference pages rather than local `--help` output.
