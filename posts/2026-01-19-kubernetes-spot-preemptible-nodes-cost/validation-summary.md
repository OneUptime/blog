# Validation Summary: How to Reduce Kubernetes Costs with Spot and Preemptible Nodes

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Kubernetes Deployments, Jobs, taints, tolerations, node affinity, topology spread constraints, and PodDisruptionBudgets
- AWS EKS, EC2 Spot Instances, eksctl, AWS Node Termination Handler, Cluster Autoscaler, and Karpenter
- Google Kubernetes Engine Spot and preemptible VMs
- Azure Kubernetes Service Spot node pools and Azure Instance Metadata Service Scheduled Events
- Helm, Bash, Go, and Python

## Sources Consulted
- AWS EC2 Spot interruption notices: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-instance-termination-notices.html
- AWS EC2 Spot best practices: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-best-practices.html
- eksctl Spot instances documentation: https://docs.aws.amazon.com/eks/latest/eksctl/spot-instances.html
- AWS Node Termination Handler Helm values: https://github.com/aws/aws-node-termination-handler/blob/main/config/helm/aws-node-termination-handler/values.yaml
- GKE Spot VMs documentation: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/spot-vms
- GKE preemptible VMs documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/preemptible-vms
- gcloud container node-pools create reference: https://docs.cloud.google.com/sdk/gcloud/reference/container/node-pools/create
- AKS Spot node pool documentation: https://learn.microsoft.com/en-us/azure/aks/spot-node-pool
- Azure Spot Virtual Machines documentation: https://learn.microsoft.com/en-us/azure/virtual-machines/spot-vms
- Azure Instance Metadata Service and Scheduled Events documentation: https://learn.microsoft.com/en-us/azure/virtual-machines/instance-metadata-service and https://learn.microsoft.com/en-us/azure/virtual-machines/windows/scheduled-events
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes disruptions and PodDisruptionBudget documentation: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes Cluster Autoscaler priority expander documentation: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/expander/priority/readme.md
- Karpenter NodePool and EC2NodeClass documentation: https://karpenter.sh/docs/concepts/nodepools/ and https://karpenter.sh/docs/concepts/nodeclasses/
- Karpenter v1beta1 migration notes for removed Provisioner/provider/TTL fields: https://karpenter.sh/v1.0/upgrading/v1beta1-migration/
- Google Cloud Spot VM pricing documentation: https://docs.cloud.google.com/compute/docs/instances/spot
- Azure Spot VM pricing page: https://azure.microsoft.com/en-us/products/virtual-machines/spot

## Issues Found
- GKE node pool commands used `--min-nodes` and `--max-nodes` without `--enable-autoscaling`; the gcloud reference says those limits are ignored unless autoscaling is enabled. Added `--enable-autoscaling` to both GKE node pool commands.
- AKS Spot node pools add the built-in `kubernetes.azure.com/scalesetpriority=spot:NoSchedule` taint. Added matching tolerations to Spot workload examples so they can schedule on AKS Spot nodes.
- Several `apps/v1` Deployment examples omitted required `spec.selector` and matching pod template labels. Added selectors and labels to the GKE preemption, Cluster Autoscaler, critical workload, and cost allocation examples.
- Cluster Autoscaler priority expander values preferred on-demand over Spot because the highest priority value wins. Reordered priorities so Spot has the higher value.
- Karpenter examples used deprecated/removed `karpenter.sh/v1alpha5` `Provisioner`, `spec.provider`, `ttlSecondsAfterEmpty`, `ttlSecondsUntilExpired`, and old consolidation fields. Replaced them with current `karpenter.sh/v1` `NodePool` and `karpenter.k8s.aws/v1` `EC2NodeClass` examples.
- The Azure Scheduled Events DaemonSet referenced an unverified `mcr.microsoft.com/aks/scheduled-events-handler:latest` image. Replaced it with the documented Azure IMDS Scheduled Events endpoint call.
- The PDB language implied PDBs maintain availability during all Spot churn. Clarified that PDBs help voluntary evictions such as drains but cannot prevent involuntary Spot/preemptible terminations.
- The Go graceful shutdown example used `log.Printf` without importing `log`. Added the missing import.
- The Python checkpointing example called `sys.exit` without importing `sys`. Added the missing import.

## Review Notes
- Karpenter examples use `al2023@latest` for brevity, with an inline note to pin a tested AMI version in production.
- Local `kubectl`, `eksctl`, `gcloud`, `az`, `helm`, `go`, and `shellcheck` binaries were not available in the workspace, so CLI/API validation was performed against official documentation rather than local `--help` output or live cluster validation.
- Syntax checks performed locally: `git diff --check`, YAML parsing for fenced YAML blocks, Bash `bash -n` for fenced Bash blocks, and Python AST parsing for fenced Python blocks.
