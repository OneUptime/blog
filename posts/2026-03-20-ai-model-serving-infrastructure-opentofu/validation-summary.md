# Validation Summary: How to Create AI Model Serving Infrastructure with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- AWS EKS managed node groups
- Kubernetes Deployments
- Kubernetes Services
- Kubernetes Horizontal Pod Autoscalers
- NVIDIA GPU scheduling on Kubernetes

## Sources Consulted
- OpenTofu `plan` command docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command docs: https://opentofu.org/docs/cli/commands/apply/
- AWS EKS managed node group creation guide: https://docs.aws.amazon.com/eks/latest/userguide/create-managed-node-group.html
- AWS EKS optimized AMIs guide: https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami.html
- AWS EKS accelerated AMIs for GPU instances: https://docs.aws.amazon.com/eks/latest/userguide/ml-eks-optimized-ami.html
- AWS EKS NVIDIA device management guide: https://docs.aws.amazon.com/eks/latest/userguide/device-management-nvidia.html
- AWS EKS AL2/AL2023 transition guidance: https://docs.aws.amazon.com/eks/latest/userguide/eks-ami-deprecation-faqs.html
- Kubernetes Horizontal Pod Autoscaling docs: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- HashiCorp AWS provider `aws_eks_node_group` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/eks_node_group.html.markdown
- HashiCorp Kubernetes provider `kubernetes_deployment_v1` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/deployment_v1.md
- HashiCorp Kubernetes provider `kubernetes_horizontal_pod_autoscaler_v2` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/horizontal_pod_autoscaler_v2.md

## Issues Found
- The GPU node group did not specify a current GPU-enabled EKS AMI. I added `ami_type = "AL2023_x86_64_NVIDIA"` because current EKS guidance has moved away from AL2 GPU AMIs.
- The node group launched with `desired_size = 1` even though the Deployment starts with two Pods that each request one GPU. I changed the node group capacity to `desired_size = 2` and `min_size = 1` so the initial rollout can schedule successfully.
- The post omitted a required EKS prerequisite for `nvidia.com/gpu` requests on AL2023 NVIDIA AMIs. I added a note that the NVIDIA Kubernetes device plugin must be installed separately so GPU resources are advertised to the scheduler.
- The HPA example assumed CPU metrics and node scaling were automatic. I added a note that Metrics Server is required for CPU-based HPA and that Cluster Autoscaler must scale the node group between `min_size` and `max_size`.
- The HPA allowed `max_replicas = 10` while the node group could provide at most five `g4dn.xlarge` GPUs. I reduced `max_replicas` to `5` to match available GPU capacity.
- The description and summary overstated the article as a complete monitored serving stack. I softened that wording so it matches the infrastructure actually shown and the add-ons it depends on.

## Review Notes
- On Amazon EKS with Kubernetes 1.34 and later, AWS recommends the NVIDIA DRA driver for new GPU deployments. This post uses the still-supported NVIDIA device plugin path because the workload requests the classic `nvidia.com/gpu` resource.
