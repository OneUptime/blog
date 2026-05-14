# Validation Summary: How to Handle Tenant Offboarding in Flux CD

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Flux CD
- Kubernetes
- GitOps
- Kustomize Controller
- Source Controller
- Helm Controller
- Kubernetes RBAC
- Kubernetes namespaces, finalizers, and persistent volume snapshots

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux CLI `flux suspend kustomization`: https://fluxcd.io/flux/cmd/flux_suspend_kustomization/
- Flux CLI `flux suspend source git`: https://fluxcd.io/flux/cmd/flux_suspend_source_git/
- Flux CLI `flux get all`: https://fluxcd.io/flux/cmd/flux_get_all/
- Flux CLI `flux reconcile kustomization`: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes `kubectl delete` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- Kubernetes `kubectl api-resources` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_api-resources/
- Kubernetes kubectl quick reference: https://kubernetes.io/docs/reference/kubectl/quick-reference/

## Issues Found
- The Step 1 comment said to suspend all Kustomizations in the tenant namespace, but the command suspended only one named Kustomization. Updated the command to `flux suspend kustomization --all -n team-alpha`, which matches the documented Flux CLI `--all` behavior.
- The Step 1 source suspension command suspended only one named GitRepository while the surrounding procedure describes freezing tenant reconciliation. Updated it to `flux suspend source git --all -n team-alpha`, which matches the documented Flux CLI `--all` behavior for sources.
- The backup examples described `kubectl get all` as exporting all tenant resources. Kubernetes documentation directs users to `kubectl api-resources` for a complete resource list; `kubectl get all` is not a complete export of every namespaced resource or CRD. Updated the wording and output filename to describe it as a backup of common workload resources instead of all tenant resources.
- The automated script repeated the same `kubectl get all` overstatement. Updated the log message and filename to say it backs up common tenant workload resources.

## Review Notes
The local workspace does not have `flux` or `kubectl` installed, so CLI validation was performed against official Flux and Kubernetes generated command references rather than local `--help` output. The guide is technically valid after the edits, but the backup process remains intentionally generic; production offboarding should use workload-specific database exports, CSI VolumeSnapshot workflows where installed, and a cluster-specific inventory process for CRDs and external resources.
