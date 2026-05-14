# Validation Summary: Checking Cilium Requirements for EKS (Amazon Elastic Kubernetes Service)

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Amazon EKS
- AWS VPC CNI
- AWS EC2 security groups
- AWS IAM
- eBPF
- Bottlerocket
- Amazon Linux 2023

## Sources Consulted
- Cilium Kubernetes requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements/
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium AWS VPC CNI chaining documentation: https://docs.cilium.io/en/latest/installation/cni-chaining-aws-cni/
- Cilium AWS ENI IPAM documentation: https://docs.cilium.io/en/latest/network/concepts/ipam/eni/
- Cilium EKS test matrix: https://raw.githubusercontent.com/cilium/cilium/1.19.4/.github/actions/eks/k8s-versions.yaml
- Amazon EKS Kubernetes version lifecycle: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- Amazon EKS AL2023 migration documentation: https://docs.aws.amazon.com/eks/latest/userguide/al2023.html
- Amazon EKS Bottlerocket node documentation: https://docs.aws.amazon.com/eks/latest/userguide/launch-node-bottlerocket.html
- Kubernetes kubectl version reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/

## Issues Found
- The post used `kubectl version --short`, but current kubectl documentation lists `kubectl version` with `-o json` or `-o yaml` output and no `--short` option. Changed the command to `kubectl version -o json`.
- The post claimed "Cilium supports EKS 1.24+" and recommended EKS 1.27+. Current Cilium and EKS support data has moved on; Cilium 1.19 EKS tests cover Kubernetes 1.32-1.35, and EKS standard support currently covers newer versions. Replaced the hard-coded outdated guidance with support-matrix guidance.
- The kernel summary listed 5.4 as the minimum. Cilium 1.19 system requirements require Linux kernel 5.10 or equivalent. Updated the minimum to 5.10.
- The post treated AL2 as the baseline node AMI. AWS has stopped publishing EKS-optimized AL2 AMIs, and AL2023/Bottlerocket are the current options for supported EKS versions. Updated the AMI guidance.
- The AWS VPC CNI chaining minimum was listed as v1.11. Cilium documentation requires AWS VPC CNI v1.11.2 or newer for compatibility. Updated the minimum.
- The ENI IAM permissions list was incomplete. Added the required Cilium ENI EC2 permissions and separated conditional permissions from required permissions.
- The VPC CIDR planning snippet used `$VPC_ID` without defining it. Added a `VPC_ID` assignment before the subnet query.
- The conclusion said Bottlerocket provides the best Cilium support. Reworded it to say AL2023 and Bottlerocket provide current EKS support.

## Review Notes
The security group port guidance is accurate for Cilium overlay mode, but production clusters should verify whether they use overlay, direct routing, Hubble Relay, WireGuard, IPsec, or Cilium health ICMP checks before applying a minimal rule set.
