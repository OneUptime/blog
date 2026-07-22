# Validation Summary: How to Allocate Shared Kubernetes Cluster Costs Fairly in Showback Reports

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Kubernetes namespaces, labels, resource requests, resource limits, and resource metrics
- Kubernetes compute, idle-capacity, persistent-storage, network, system, and shared-service cost allocation
- FinOps allocation and showback practices
- FinOps Open Cost and Usage Specification (FOCUS) `EffectiveCost`
- AWS Cost and Usage Reports split cost allocation data for Amazon EKS
- Azure Kubernetes Service cost analysis and OpenCost
- Google Kubernetes Engine cost allocation and Cloud Billing exports

## Sources Consulted

- [FinOps Foundation: Allocation capability](https://www.finops.org/framework/capabilities/allocation/)
- [FOCUS Specification v1.2: EffectiveCost](https://focus.finops.org/focus-specification/v1-2/)
- [Kubernetes: Namespaces](https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/)
- [Kubernetes: Labels and selectors](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/)
- [Kubernetes: Resource management for Pods and containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Kubernetes: Resource metrics pipeline](https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/)
- [Kubernetes SIGs: Metrics Server](https://github.com/kubernetes-sigs/metrics-server)
- [AWS: Understanding split cost allocation data](https://docs.aws.amazon.com/cur/latest/userguide/split-cost-allocation-data.html)
- [Amazon EKS: View costs by Pod in AWS billing with split cost allocation](https://docs.aws.amazon.com/eks/latest/userguide/cost-monitoring-aws.html)
- [AWS: Using Kubernetes labels for cost allocation in EKS](https://docs.aws.amazon.com/cur/latest/userguide/split-cost-allocation-data-kubernetes-labels.html)
- [Azure: AKS cost analysis](https://learn.microsoft.com/en-us/azure/aks/cost-analysis)
- [Google Cloud: GKE cost allocation](https://cloud.google.com/kubernetes-engine/docs/how-to/cost-allocations)

## Issues Found
No technical issues found.

## Review Notes
The post contains no executable code, commands, or configuration snippets; the review therefore focused on the technical allocation model, Kubernetes semantics, provider-feature scope, and external links. The provider-specific statements are accurate but prerequisite-sensitive: AKS cost analysis currently requires a Standard or Premium tier and has offer and cluster limitations; GKE cost allocation is request-based, requires detailed billing export data, and documents supported cluster and SKU constraints; AWS split cost allocation emits per-pod CPU and memory records and applies documented conditions to EKS attributes and imported Kubernetes labels. FOCUS also notes that `EffectiveCost` is an amortized cost measure and that its billing-period sum need not equal the invoiced sum, so reports should keep their chosen cost basis and reconciliation scope explicit, as the post recommends.
