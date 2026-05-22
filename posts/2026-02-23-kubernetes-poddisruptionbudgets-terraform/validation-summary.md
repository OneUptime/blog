# Validation Summary: How to Create Kubernetes PodDisruptionBudgets with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp Kubernetes provider
- Kubernetes PodDisruptionBudget policy/v1
- Kubernetes Deployments and StatefulSets
- kubectl
- jq

## Sources Consulted
- Kubernetes documentation: Disruptions and PodDisruptionBudgets - https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes task guide: Specifying a Disruption Budget for your Application - https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes API reference: PodDisruptionBudget policy/v1 - https://kubernetes.io/docs/reference/kubernetes-api/policy-resources/pod-disruption-budget-v1/
- Kubernetes kubectl reference: kubectl get - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl reference: kubectl describe - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- HashiCorp Terraform Registry: kubernetes_pod_disruption_budget_v1 resource - https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/pod_disruption_budget_v1
- HashiCorp Terraform Registry: kubernetes_deployment resource - https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/deployment

## Issues Found
- The single-replica PDB example comments incorrectly referred to `maxUnavailable = 0` as the zero-downtime option, while the actual Terraform example uses `max_unavailable = "1"` to allow the singleton pod to be evicted and accept brief downtime. Updated the comments to match the example and Kubernetes PDB behavior.

## Review Notes
- The PDB examples use the current `policy/v1` Terraform resource (`kubernetes_pod_disruption_budget_v1`) and valid `min_available` / `max_unavailable` string values.
- Kubernetes documentation notes that `maxUnavailable` and `minAvailable` are mutually exclusive, percentages round up, PDBs constrain voluntary evictions through the Eviction API, and involuntary disruptions cannot be prevented by PDBs. The post's explanations are consistent with those points.
- Local `terraform` and `kubectl` binaries were not available in the review environment, so command and schema verification was performed against official documentation instead of local CLI output.
