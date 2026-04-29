# Validation Summary: How to Create Kubernetes Pod Disruption Budgets with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- PodDisruptionBudget (PDB)
- OpenTofu
- HashiCorp Kubernetes provider / OpenTofu-compatible Kubernetes provider
- HCL
- Kubernetes Deployments
- Kubernetes StatefulSets

## Sources Consulted
- Kubernetes Disruptions documentation: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes Specifying a Disruption Budget for your Application: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes provider `kubernetes_pod_disruption_budget_v1` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/pod_disruption_budget_v1.md
- Kubernetes provider `kubernetes_deployment_v1` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/deployment_v1.md
- Kubernetes provider `kubernetes_pod_disruption_budget_v1` implementation: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/kubernetes/resource_kubernetes_pod_disruption_budget_v1.go
- OpenTofu Providers documentation: https://opentofu.org/docs/v1.11/language/providers/

## Issues Found
- The description, overview, Step 5 comment, and summary overstated PDB behavior as an availability guarantee. Updated the wording to say PDBs help maintain availability during voluntary evictions, because the Kubernetes documentation explicitly says PDBs do not truly guarantee availability and only protect against specific voluntary evictions.
- The Deployment example implied a matching PDB provides an end-to-end availability guarantee. Revised that wording to describe limiting voluntary evictions instead, because Kubernetes documents that workload rolling updates are not constrained by PDBs.
- The StatefulSet example described a generic 3-node Redis example as maintaining quorum. Reworded it to the technically correct claim that it keeps 2 replicas available during voluntary disruptions, because the post did not establish a quorum-based Redis topology.
- The `max_unavailable` example was phrased too generally. Clarified that the example is for a controller-managed workload, matching Kubernetes guidance that `maxUnavailable` applies when the selected pods share the same managing controller.

## Review Notes
- The resource names and fields used in the post are current: `kubernetes_pod_disruption_budget_v1` targets the stable `policy/v1` PodDisruptionBudget API, and `kubernetes_deployment_v1` is the current provider resource for Deployments.
- The examples assume the Kubernetes provider is already configured in OpenTofu and that matching workload resources already exist where relevant.
- Local `tofu` / `terraform` CLI validation was not run in this environment because neither binary is installed; the review was completed against the current official Kubernetes and provider documentation instead.
