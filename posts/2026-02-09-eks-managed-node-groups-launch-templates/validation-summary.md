# Validation Summary: How to Configure EKS Managed Node Groups with Custom Launch Templates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EKS managed node groups
- Amazon EC2 launch templates
- AWS CLI
- Terraform AWS provider
- Kubernetes node bootstrap and kubelet configuration
- Amazon CloudWatch Agent
- EC2 Spot Instances
- EKS optimized Amazon Linux and accelerated AMIs

## Sources Consulted
- Amazon EKS User Guide: Customize managed nodes with launch templates - https://docs.aws.amazon.com/eks/latest/userguide/launch-templates.html
- AWS CLI Command Reference: `aws eks create-nodegroup` - https://docs.aws.amazon.com/cli/latest/reference/eks/create-nodegroup.html
- AWS CLI Command Reference: `aws eks update-nodegroup-version` - https://docs.aws.amazon.com/cli/latest/reference/eks/update-nodegroup-version.html
- Amazon EKS User Guide: Create a managed node group for your cluster - https://docs.aws.amazon.com/eks/latest/userguide/create-managed-node-group.html
- Amazon EKS User Guide: Create nodes with optimized Amazon Linux AMIs - https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami.html
- Amazon EKS User Guide: Retrieve recommended Amazon Linux AMI IDs - https://docs.aws.amazon.com/eks/latest/userguide/retrieve-ami-id.html
- Amazon EKS User Guide: Use EKS-optimized accelerated AMIs for GPU instances - https://docs.aws.amazon.com/eks/latest/userguide/ml-eks-optimized-ami.html
- Terraform AWS Provider: `aws_launch_template` and `aws_eks_node_group` resources - https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- Kubernetes node-problem-detector release metadata - https://github.com/kubernetes/node-problem-detector/releases

## Issues Found
- The Amazon Linux user data example was a plain shell script. AWS documents that Amazon Linux user data in launch templates used with managed node groups must use MIME multi-part format, so the example was updated to include MIME headers and a shellscript part.
- The bootstrap example set a custom `--max-pods` value without disabling bootstrap's automatic max-pods calculation. Added `--use-max-pods false` so the explicit kubelet value is applied as intended.
- The post used an EKS optimized Amazon Linux 2 AMI lookup without noting that AL2 AMIs are no longer published for Kubernetes versions after 1.32. Added a caveat to use AL2023 or Bottlerocket for newer cluster versions.
- The node-problem-detector download URL pointed to a non-existent `node-problem-detector` asset. Replaced it with the current release tarball naming pattern and extraction/install commands.
- The GPU example manually installed NVIDIA drivers and `nvidia-docker`, then restarted Docker. EKS optimized accelerated AMIs already include the NVIDIA drivers and container toolkit, and EKS nodes use containerd. Updated the example to use an EKS optimized accelerated AMI and bootstrap the node.
- The Spot example configured Spot market options in the launch template while also setting the managed node group `capacity_type = "SPOT"`. For EKS managed node groups, Spot capacity should be configured through the node group capacity type; the launch template no longer sets EC2 Spot market options, and the node group now provides multiple instance types.
- Terraform launch template version examples used `"$Latest"` in places that undermined the post's controlled-update guidance. Updated examples to reference `aws_launch_template.eks_nodes.latest_version`.

## Review Notes
- The AWS CLI was not installed in the local environment, so CLI syntax was checked against the official AWS CLI command reference instead of local `aws --help` output.
- The AL2-specific bootstrap examples remain valid for AL2 EKS optimized AMIs where those AMIs are available. For AL2023 launch templates that specify an AMI ID, the equivalent current pattern uses `nodeadm` NodeConfig user data rather than `/etc/eks/bootstrap.sh`.
