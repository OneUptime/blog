# Validation Summary: Troubleshoot Cilium Requirements on Amazon EKS

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Amazon EKS
- Amazon VPC CNI
- AWS IAM
- AWS ENI IPAM
- eBPF

## Sources Consulted
- Cilium System Requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium Installation using Helm, EKS section: https://docs.cilium.io/en/stable/installation/k8s-install-helm/
- Cilium AWS ENI IPAM documentation: https://docs.cilium.io/en/latest/network/concepts/ipam/eni/
- Cilium CLI `install` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_install/
- Cilium CLI `status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium CLI `connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Amazon EKS Amazon VPC CNI best practices: https://docs.aws.amazon.com/eks/latest/best-practices/vpc-cni.html
- Amazon EKS VPC CNI user guide: https://docs.aws.amazon.com/eks/latest/userguide/managing-vpc-cni.html
- Amazon EKS optimized AMI documentation: https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami.html
- Amazon Linux 2 kernel documentation: https://docs.aws.amazon.com/linux/al2/ug/aml2-kernel.html
- Amazon EKS Fargate documentation: https://docs.aws.amazon.com/eks/latest/userguide/fargate.html

## Issues Found
- The post stated that Cilium requires Linux kernel 4.9.17 or later and that eBPF-based features require 5.10+. Current Cilium documentation lists Linux kernel 5.10 or an equivalent vendor kernel as the supported requirement, so the kernel guidance was updated.
- The post said EKS managed node groups use Amazon Linux 2 by default. Current EKS documentation says Kubernetes 1.30 or newer defaults new managed node groups to Amazon Linux 2023, so the AMI guidance was updated.
- The prerequisite list implied that `AmazonEKS_CNI_Policy` on the node role is sufficient for Cilium. Cilium ENI mode requires specific EC2 permissions for the Cilium operator, so the wording now distinguishes the node role from the operator role.
- The IAM example saved an instance profile ARN in a variable named `NODE_INSTANCE` and then used a placeholder role name. The example now resolves the instance profile name and derives the actual IAM role name before listing attached policies.
- The post described `cilium install --dry-run-helm-values` as a preflight check that deploys temporary pods. The Cilium CLI documentation says this command only prints non-default Helm values without installing resources, so the section now uses `cilium status --wait` and `cilium connectivity test`.
- The Fargate best-practice bullet said to set `eks.amazonaws.com/compute-type: ec2` on node groups. That annotation/label is used for workload scheduling contexts such as Fargate or EKS Auto Mode, not as a general node group setting, so it was changed to advising that Cilium DaemonSet pods run on EC2-backed nodes and are not selected by Fargate profiles.

## Review Notes
AWS documentation notes that Amazon VPC CNI is the only CNI plugin officially supported by Amazon EKS for nodes running on AWS infrastructure, while Cilium documents EKS installation paths. Future revisions should make that support boundary explicit if the guide is intended for production support planning.
