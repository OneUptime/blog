# Validation Summary: How to Use Ansible to Create AWS EKS Clusters

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- amazon.aws Ansible collection
- community.aws Ansible collection
- AWS EKS
- AWS IAM
- AWS CLI
- Kubernetes
- kubectl
- EKS managed node groups
- EKS add-ons

## Sources Consulted
- Ansible community.aws collection index: https://docs.ansible.com/projects/ansible/latest/collections/community/aws/index.html
- Ansible community.aws.eks_cluster module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/aws/eks_cluster_module.html
- Ansible community.aws.eks_nodegroup module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/aws/eks_nodegroup_module.html
- Ansible amazon.aws collection index: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/index.html
- Ansible amazon.aws.iam_role module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/iam_role_module.html
- AWS EKS Kubernetes version lifecycle: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- AWS EKS cluster IAM role documentation: https://docs.aws.amazon.com/eks/latest/userguide/cluster-iam-role.html
- AWS EKS node IAM role documentation: https://docs.aws.amazon.com/eks/latest/userguide/create-node-role.html
- AWS EKS add-ons documentation: https://docs.aws.amazon.com/eks/latest/userguide/eks-add-ons.html
- AWS EKS create add-on documentation: https://docs.aws.amazon.com/eks/latest/userguide/creating-an-add-on.html
- AWS CLI create-addon command reference: https://docs.aws.amazon.com/cli/latest/reference/eks/create-addon.html
- AWS CLI update-kubeconfig command reference: https://docs.aws.amazon.com/cli/latest/reference/eks/update-kubeconfig.html
- AWS CLI addon-active waiter reference: https://docs.aws.amazon.com/cli/latest/reference/eks/wait/addon-active.html

## Issues Found
- The prerequisites listed Ansible 2.14+ and only Python boto3. The current community.aws collection documents ansible-core 2.17.0 or newer, and the EKS modules require boto3 and botocore 1.34.0 or newer. Updated the prerequisite bullets.
- The examples used Kubernetes version 1.29, which is no longer listed by AWS as available in standard or extended support on May 26, 2026. Updated the examples to use EKS 1.34, which is currently in standard support.
- The subnet examples used placeholder names such as `subnet-private-az-a`, but the Ansible EKS modules require subnet IDs. Replaced them with ID-shaped subnet placeholders.
- The node IAM role examples used `AmazonEC2ContainerRegistryReadOnly`. AWS's current EKS node IAM role documentation uses `AmazonEC2ContainerRegistryPullOnly` for node image pull permissions. Updated both role examples.
- The add-on examples pinned old add-on versions and checked for `ACTIVE` in `create-addon` output even though add-on creation is asynchronous and compatible add-on versions should be selected from AWS's supported versions. Removed fixed add-on versions, added conflict handling, and added the documented `aws eks wait addon-active` waiter.

## Review Notes
The remaining Ansible module names, IAM trust policies, managed node group parameters, AWS CLI `update-kubeconfig` command, and deletion order are consistent with the official documentation. The examples still use placeholder AWS account, subnet, role, and security group IDs that readers must replace with real resources.
