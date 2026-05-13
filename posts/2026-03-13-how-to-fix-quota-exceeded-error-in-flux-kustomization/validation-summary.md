# Validation Summary: How to Fix quota exceeded Error in Flux Kustomization

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux Kustomization
- Kubernetes ResourceQuota
- Kubernetes LimitRange
- Kubernetes Deployments
- kubectl
- GitOps

## Sources Consulted
- Kubernetes Resource Quotas documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Limit Ranges documentation: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `reconcile kustomization` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/

## Issues Found
- The post said failed or completed pods consume quota that should be available for deployments. Kubernetes ResourceQuota documentation states standard pod and compute quotas track pods in a non-terminal state, so I changed the guidance to focus on pending pods and clarified that failed and completed pods do not count against the standard `pods` quota.
- The jq command for summing resource requests was not generally correct because Kubernetes quantity strings use different units and missing requests could cause jq failures. I replaced it with a `kubectl get pods -o custom-columns` command that accurately lists per-pod CPU and memory requests for investigation.
- The Deployment manifest used `apiVersion: apps/v1` but omitted the required `.spec.selector` and matching pod template labels. I added `spec.selector.matchLabels` and `spec.template.metadata.labels`.
- The stale resource cleanup section claimed to remove orphaned PVCs but only printed PVC names. I changed it to identify PVCs first and included an explicit `kubectl delete pvc <pvc-name> -n my-namespace` command for confirmed orphaned PVCs.

## Review Notes
The local environment did not have `kubectl` or `flux` installed, so CLI validation was performed against official Kubernetes and Flux documentation rather than local `--help` output. The Flux Kustomization API fields and `flux reconcile kustomization --with-source` command are current in the official Flux documentation.
