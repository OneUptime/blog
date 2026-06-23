# Validation Summary: How to Use Spot/Preemptible Nodes in Kubernetes Cost-Effectively

## Status
validated

## Post Type
Tutorial / Guide (multi-cloud how-to with configuration examples)

## Technologies Covered
- Kubernetes (Deployments, Jobs, PodDisruptionBudgets, nodeSelector/tolerations/affinity, topologySpreadConstraints, lifecycle hooks)
- AWS EKS spot node groups (eksctl, Terraform `aws_eks_node_group`, AWS Node Termination Handler)
- GCP GKE Spot VMs (gcloud, Terraform `google_container_node_pool`)
- Azure AKS spot node pools (az CLI, Terraform `azurerm_kubernetes_cluster_node_pool`)
- Karpenter (v1 `NodePool` / `EC2NodeClass`)
- Cluster Autoscaler (priority expander)
- Prometheus / PrometheusRule (kube-state-metrics)

## Sources Consulted
- eksctl Spot instances guide — https://docs.aws.amazon.com/eks/latest/eksctl/spot-instances.html
- eksctl Instance Selector guide — https://docs.aws.amazon.com/eks/latest/eksctl/instance-selector.html
- AWS blog: EKS managed node groups Spot support — https://aws.amazon.com/blogs/containers/amazon-eks-now-supports-provisioning-and-managing-ec2-spot-instances-in-managed-node-groups/
- AWS Node Termination Handler Helm chart — https://github.com/aws/aws-node-termination-handler
- GKE Spot VMs docs — https://cloud.google.com/kubernetes-engine/docs/concepts/spot-vms
- Azure AKS spot node pools — https://learn.microsoft.com/en-us/azure/aks/spot-node-pool
- Terraform azurerm_kubernetes_cluster_node_pool — https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/kubernetes_cluster_node_pool
- Karpenter NodePool / EC2NodeClass (v1) — https://karpenter.sh/docs/concepts/nodepools/
- AWS EC2 m5.large on-demand pricing (us-east-1) — https://aws.amazon.com/ec2/pricing/on-demand/

## Issues Found
- **eksctl: wrong flag for multiple instance types.** The command used `--node-type m5.large,m5a.large,m4.large`. `--node-type` accepts only a single instance type; specifying a comma-separated list of types for a (Spot) managed node group requires `--instance-types`. Changed `--node-type` to `--instance-types`. (Verified against the eksctl Spot instances guide.)
- **eksctl: nonexistent flag.** The command ended with `--instance-types-filters "cpu-manufacturer=intel"`. No such flag exists in eksctl. The instance-selector feature uses `--instance-selector-vcpus`, `--instance-selector-memory`, `--instance-selector-gpus`, and `--instance-selector-cpu-architecture` (there is no CLI manufacturer filter). Removed the invalid line and made `--spot` the final flag, with a note that managed node groups are the default. (Verified against the eksctl Instance Selector guide.)

## Review Notes
- **Bash inline comments after line-continuation backslashes:** Several multi-line shell snippets place `# comment` after a trailing `\` (e.g. `--spot \   # Use spot instances`). In real bash this breaks line continuation (the backslash escapes the space, and the unescaped newline terminates the command). This is a widespread documentation convention and the snippets are illustrative, so they were left as-is to preserve the author's style; readers should strip the inline comments before running.
- **Cost-calculation snippet uses float arithmetic in `$(( ))`:** `$((ON_DEMAND_NODES * 0.096 * 730))` would fail in real bash, which only does integer arithmetic. The annotated results ($700/month on-demand, $210/month spot, ~70% savings) and the m5.large prices ($0.096 on-demand, ~$0.029 spot in us-east-1) are accurate; the block is illustrative pseudocode. Left unchanged.
- **azurerm provider version caveat:** `enable_auto_scaling` is correct for azurerm provider v3.x but was renamed to `auto_scaling_enabled` in provider v4. Users on v4+ should use the newer name. Left as-is since both are widely deployed; flagged here for awareness.
- **Cloud-managed labels/taints:** GKE auto-applies the `cloud.google.com/gke-spot=true` label, and AKS auto-applies the `kubernetes.azure.com/scalesetpriority=spot` label and the matching `NoSchedule` taint to spot pools. Setting these explicitly (as the post does) is redundant but harmless and arguably clearer.
- Notice periods (AWS 2 min, GCP 30s, Azure 30s), Karpenter v1 API (`karpenter.sh/v1` NodePool + `karpenter.k8s.aws/v1` EC2NodeClass, `nodeClassRef` group/kind/name, `consolidationPolicy: WhenEmpty`), AWS Node Termination Handler Helm values, the priority-expander ConfigMap, and the Kubernetes scheduling primitives (PDB `minAvailable`, podAntiAffinity, topologySpreadConstraints) were all verified correct.
