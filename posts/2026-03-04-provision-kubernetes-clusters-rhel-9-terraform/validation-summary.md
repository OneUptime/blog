# Validation Summary: How to Provision Kubernetes Clusters on RHEL with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Terraform
- AWS provider for Terraform
- terraform-aws-modules VPC module
- terraform-aws-modules EKS module
- Amazon EKS
- Kubernetes
- kubeadm
- CRI-O
- Flannel CNI

## Sources Consulted
- Amazon EKS Kubernetes version lifecycle: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- Amazon EKS optimized AMIs: https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-amis.html
- Amazon EKS launch template and custom AMI requirements: https://docs.aws.amazon.com/eks/latest/userguide/launch-templates.html
- terraform-aws-modules EKS module documentation: https://github.com/terraform-aws-modules/terraform-aws-eks
- terraform-aws-modules EKS v21 provider requirements: https://github.com/terraform-aws-modules/terraform-aws-eks/blob/v21.20.0/versions.tf
- terraform-aws-modules VPC v6 provider requirements: https://github.com/terraform-aws-modules/terraform-aws-vpc/blob/v6.5.1/versions.tf
- Kubernetes kubeadm installation documentation: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/
- Kubernetes kubeadm cluster creation documentation: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/
- CRI-O packaging documentation: https://github.com/cri-o/packaging
- Flannel installation documentation: https://github.com/flannel-io/flannel
- Red Hat guidance for official RHEL AMI owner ID: https://access.redhat.com/solutions/99333

## Issues Found
- The EKS example used Kubernetes `1.28`, which is no longer listed as an available EKS standard or extended support version on May 15, 2026. Updated the EKS and kubeadm examples to Kubernetes `1.35`, which is in EKS standard support.
- The EKS section claimed to provision RHEL worker nodes, but the managed node group example did not provide a valid RHEL custom AMI launch-template/bootstrap path. Changed the heading and node group name to managed workers and set the supported EKS optimized AL2023 AMI type.
- The EKS module example used the older v19 input names and AWS provider `~> 5.0`. Updated the module to v21-style inputs, added the required Terraform version, and changed the AWS provider constraint to `>= 6.28` to match the module requirement.
- The VPC module was pinned to v5 while the updated AWS provider is v6. Updated the VPC module constraint to `~> 6.0`.
- The RHEL kubeadm bootstrap installed `containerd` with `dnf install -y containerd` without configuring a package source that provides it on RHEL. Replaced that with CRI-O, using the CRI-O RPM repository and service name.
- The Kubernetes yum repository omitted the recommended `exclude` line and package install override. Added `exclude=kubelet kubeadm kubectl cri-tools kubernetes-cni` and `--disableexcludes=kubernetes`.
- The RHEL kubeadm bootstrap omitted the SELinux permissive configuration documented for kubeadm on Red Hat based distributions. Added `setenforce 0` and the persistent `/etc/selinux/config` update.
- The kubeadm deployment command did not specify the CRI socket after switching to CRI-O and did not configure kubectl or install a pod network add-on. Added the CRI-O socket, kubeconfig setup, and Flannel installation for the `10.244.0.0/16` pod CIDR.

## Review Notes
- The self-hosted Terraform example still assumes an existing EC2 key pair named `my-keypair` and default networking/security group behavior. A production-ready version should explicitly define VPC placement and security group rules for SSH and Kubernetes node traffic.
- Terraform was not installed in the local environment, so I could not run `terraform fmt` or `terraform validate`; the snippets were reviewed against current official module and Kubernetes documentation instead.
