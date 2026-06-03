# Validation Summary: How to Implement Spot Instance Node Pools for Cost Optimization

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes Deployments, taints, tolerations, affinity, and PodDisruptionBudgets
- Amazon EKS managed node groups and EC2 Spot Instances
- eksctl ClusterConfig
- Google Kubernetes Engine Spot VM node pools
- gcloud CLI
- AWS Node Termination Handler
- Kubernetes Cluster Autoscaler priority expander
- Prometheus / OpenCost cost metrics

## Sources Consulted
- Amazon EKS eksctl Spot instances documentation: https://docs.aws.amazon.com/eks/latest/eksctl/spot-instances.html
- Amazon EKS managed node group capacity types: https://docs.aws.amazon.com/eks/latest/userguide/managed-node-groups.html
- Amazon EC2 Spot Instance interruption notices: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-instance-termination-notices.html
- Google Kubernetes Engine Spot VMs documentation: https://cloud.google.com/kubernetes-engine/docs/concepts/spot-vms
- Google Cloud SDK `gcloud container node-pools create` reference: https://cloud.google.com/sdk/gcloud/reference/container/node-pools/create
- Microsoft Azure Spot Virtual Machines documentation: https://learn.microsoft.com/en-us/azure/virtual-machines/spot-vms
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes taints and tolerations documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes node affinity documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes disruptions and PodDisruptionBudget documentation: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes PodDisruptionBudget API reference: https://kubernetes.io/docs/reference/kubernetes-api/policy/pod-disruption-budget-v1/
- AWS Node Termination Handler documentation: https://github.com/aws/aws-node-termination-handler
- Kubernetes Cluster Autoscaler priority expander documentation: https://github.com/kubernetes/autoscaler/tree/master/cluster-autoscaler/expander/priority
- OpenCost metrics documentation: https://opencost.io/docs/integrations/metrics/
- kube-state-metrics node metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/cluster/node-metrics.md

## Issues Found
- The AWS/Azure/GKE interruption notice timing was imprecise. Updated the text to state AWS provides a 2-minute notice, Azure Spot VMs provide 30 seconds of notice, and GKE Spot VM nodes shut down 30 seconds after preemption notice.
- The Kubernetes Deployment examples were invalid for `apps/v1` because they omitted required `.spec.selector` fields and matching pod template labels. Added selectors and labels to both Deployment snippets.
- The mixed on-demand and Spot eksctl YAML snippet had a document separator before a list item, making the example invalid YAML. Removed the separator so both node groups remain in the same `managedNodeGroups` list.
- The EKS interruption handling section implied AWS Node Termination Handler is always required for EKS managed node groups. Updated the wording to note that EKS managed node groups drain Spot nodes automatically and that AWS Node Termination Handler is appropriate for self-managed node groups or additional EC2 events.
- The GKE interruption handling section recommended node-problem-detector as a Spot termination handler. Replaced that with GKE's documented Spot VM termination behavior.
- The PodDisruptionBudget section claimed PDBs guarantee availability during interruptions. Updated the wording because PDBs apply to voluntary evictions and cannot guarantee availability for all involuntary failures or provider-enforced termination deadlines.
- The PromQL cost examples used non-standard metric names and labels. Updated them to use OpenCost/Kubecost-style `node_total_hourly_cost` and `kubecost_node_is_spot` metrics.
- The interruption-rate PromQL used `rate()` for a daily percentage. Changed it to use `increase(...[24h]) / spot node count * 100`.
- The best-practices section recommended "aggressive" resource requests. Changed this to accurate resource requests, which is the correct Kubernetes scheduling guidance.

## Review Notes
The post is technically relevant and valid after the corrections. The monitoring examples still assume OpenCost/Kubecost and a custom `spot_interruptions_total` metric from the environment or termination handler; exact metric names can vary by installation.
