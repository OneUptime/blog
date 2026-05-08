# Validation Summary: Validate Cilium Requirements on EKS

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- Amazon EKS
- AWS CLI
- Amazon EC2 ENIs
- IAM
- eBPF

## Sources Consulted
- Cilium Kubernetes requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements/
- Cilium system requirements and firewall rules: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium AWS ENI IPAM required privileges: https://docs.cilium.io/en/stable/network/concepts/ipam/eni/
- Cilium EKS installation guidance: https://docs.cilium.io/en/stable/installation/k8s-install-helm/
- Kubernetes kubectl version command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Amazon EKS Kubernetes version lifecycle: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- AWS CLI EKS describe-cluster-versions reference: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/eks/describe-cluster-versions.html
- AWS CLI EKS describe-addon-versions reference: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/eks/describe-addon-versions.html
- Amazon EKS AL2 AMI deprecation FAQ: https://docs.aws.amazon.com/eks/latest/userguide/eks-ami-deprecation-faqs.html
- Amazon EC2 general purpose instance network specifications: https://docs.aws.amazon.com/ec2/latest/instancetypes/gp.html

## Issues Found
- Replaced `kubectl version --short` with `kubectl version` because current kubectl documentation no longer lists the `--short` flag.
- Replaced the EKS available-version command from `aws eks describe-addon-versions` to `aws eks describe-cluster-versions`, because `describe-addon-versions` returns add-on compatibility information, not the EKS cluster version catalog.
- Updated the Cilium Kubernetes version note from a broad `Cilium 1.15+ requires Kubernetes 1.21+` claim to a version-specific compatibility reminder with the current Cilium 1.19 tested Kubernetes range.
- Updated node OS/kernel guidance to reflect Cilium's current kernel requirement and Amazon EKS's Amazon Linux 2 AMI publishing cutoff after November 26, 2025.
- Added `aws iam list-role-policies` so inline role policies are included in the IAM validation path.
- Expanded the Cilium ENI IAM policy example to include missing EC2 actions documented by Cilium, including route table description, network interface attribute modification, tagging, tag description, and instance type description.
- Corrected the `m5.xlarge` ENI example from 15 ENIs to 4 ENIs with 15 IPv4 addresses per interface.
- Replaced the fixed `100+ free IPs per node` subnet guidance with capacity-based guidance, because the required free IP count depends on pod density and instance ENI/IP limits.
- Changed the best practice about disabling `aws-node` to patching the DaemonSet for Cilium ENI mode, matching the current Cilium EKS installation guidance.

## Review Notes
The subnet tag query is a reasonable starting point, but in production reviews it is also worth checking the exact subnet IDs used by each node group because subnet tagging conventions can vary by cluster creation method.
