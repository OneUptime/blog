# Validation Summary: How to Configure Karpenter Consolidation Policies for Optimal K8s Node Bin

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Karpenter
- Kubernetes
- Amazon EKS
- Helm
- Prometheus / PromQL
- PodDisruptionBudgets
- Pod topology spread constraints
- Python

## Sources Consulted
- Karpenter Getting Started with Karpenter: https://karpenter.sh/v1.12/getting-started/getting-started-with-karpenter/
- Karpenter NodePools documentation: https://karpenter.sh/preview/concepts/nodepools/
- Karpenter Disruption documentation: https://karpenter.sh/preview/concepts/disruption/
- Karpenter Metrics reference: https://karpenter.sh/v1.12/reference/metrics/
- Karpenter NodeClasses documentation: https://karpenter.sh/v1.0/concepts/nodeclasses/
- Kubernetes Pod Topology Spread Constraints: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes PodDisruptionBudget API reference: https://kubernetes.io/docs/reference/kubernetes-api/policy/pod-disruption-budget-v1/

## Issues Found
- The Helm install example used the old `https://charts.karpenter.sh` repository and older `settings.aws.*` values. Current Karpenter charts are distributed through the public ECR OCI registry, and current install examples use `settings.clusterName`. Updated the command to use `helm upgrade --install` with `oci://public.ecr.aws/karpenter/karpenter`, `--version`, `--create-namespace`, and `--wait`.
- The NodePool examples used `apiVersion: karpenter.sh/v1beta1`, `consolidationPolicy: WhenUnderutilized`, and a minimal `nodeClassRef`. Current Karpenter v1 examples use `apiVersion: karpenter.sh/v1`, `consolidationPolicy: WhenEmptyOrUnderutilized`, and `nodeClassRef` with `group`, `kind`, and `name`. Updated both NodePool snippets.
- The first NodePool placed `expireAfter` inside `spec.disruption`. Current Karpenter v1 examples place `expireAfter` under `spec.template.spec`. Moved the field to the correct location.
- The consolidation policy list described `WhenUnderutilized` as the default. Current Karpenter v1 uses `WhenEmptyOrUnderutilized` and `WhenEmpty`. Updated the list.
- The log command omitted the controller container. Updated it to include `-c controller`, matching Karpenter's documented log examples.
- The Prometheus queries referenced removed or non-current metrics such as `karpenter_consolidation_actions_performed_total` and `karpenter_pods_disrupted_total`. Replaced them with current Karpenter metrics: `karpenter_voluntary_disruption_decisions_total`, `karpenter_nodes_terminated_total`, and `karpenter_pods_drained_total`.
- The disruption-prevention example used the old `karpenter.sh/do-not-evict` annotation. Current Karpenter documents `karpenter.sh/do-not-disrupt`. Updated the annotation and comment.
- The critical-service Deployment was missing the required `spec.selector` and matching pod labels, and its PDB selector would not have matched the pods. Added matching `app: critical-service` selector and labels.

## Review Notes
- The post references an EC2NodeClass named `default` but does not define it. That is acceptable for a focused consolidation guide, but a complete deployment guide should include or link to an EC2NodeClass example.
- The Python cost script is intentionally simplified and estimates cost from allocatable vCPU rather than cloud provider pricing, instance type, purchase option, or real billing data.
