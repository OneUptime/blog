# Checking Cilium Requirements for EKS (Amazon Elastic Kubernetes Service)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, EKS, AWS, Requirements, eBPF

Description: A comprehensive checklist of requirements for installing Cilium on AWS EKS, covering node type, kernel version, VPC CNI configuration, and IAM permissions.

---

## Introduction

Installing Cilium on EKS requires understanding how AWS's networking model interacts with Cilium's requirements. EKS uses the AWS VPC CNI plugin by default, which allocates pod IPs from the VPC subnet. When integrating Cilium, you can either chain Cilium with the AWS VPC CNI (to add policy enforcement while keeping VPC-native IPs) or replace the VPC CNI with Cilium's own IPAM. Each approach has different requirements.

This guide covers all requirements for both approaches: the EKS version compatibility, node OS and kernel requirements, IAM permissions, security group configuration, and VPC CIDR planning. Checking these requirements before installation prevents the most common EKS-specific Cilium failures.

## Prerequisites

- AWS CLI installed and configured
- `eksctl` or AWS Console access
- `kubectl` configured to the EKS cluster

## Step 1: Check EKS Version Compatibility

```bash
# Check EKS cluster version
kubectl version --short | grep Server

# Or with AWS CLI
aws eks describe-cluster --name my-cluster --query "cluster.version" --output text

# Cilium supports EKS 1.24+
# Recommended: EKS 1.27+
```

## Step 2: Check Node AMI and Kernel Version

```bash
# Check node kernel versions
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.nodeInfo.kernelVersion}{"\n"}{end}'

# EKS AL2 (Amazon Linux 2) nodes: kernel 5.10
# EKS AL2023 nodes: kernel 6.1
# Bottlerocket: kernel 5.15+

# Bottlerocket provides the newest kernels and is recommended for Cilium
aws eks list-addons --cluster-name my-cluster

# Create a managed node group with Bottlerocket
eksctl create nodegroup \
  --cluster my-cluster \
  --name bottlerocket-group \
  --node-ami-family Bottlerocket \
  --instance-types m5.xlarge \
  --nodes 3
```

## Step 3: VPC CNI Mode Decision

```bash
# Option A: Cilium + AWS VPC CNI chaining (recommended for existing clusters)
# - Keeps VPC-native pod IPs
# - Adds Cilium policy enforcement
# Requires: AWS VPC CNI v1.11+

# Check VPC CNI version
kubectl get pod -n kube-system -l k8s-app=aws-node -o jsonpath='{.items[0].spec.containers[0].image}'

# Option B: Cilium IPAM mode (replaces VPC CNI)
# - Cilium manages pod IPs independently
# - Full Cilium feature set
# Requires: Disable VPC CNI first

# Check current CNI
kubectl get ds -n kube-system aws-node
```

## Step 4: Security Group Requirements

```bash
# Required ports for Cilium:
# - UDP 8472 (VXLAN) or UDP 6081 (Geneve) for overlay mode
# - TCP 4240 for health checks
# - TCP 4244 for Hubble (optional)

# Check existing security group for worker nodes
CLUSTER_SG=$(aws eks describe-cluster \
  --name my-cluster \
  --query "cluster.resourcesVpcConfig.clusterSecurityGroupId" \
  --output text)

aws ec2 describe-security-groups \
  --group-ids $CLUSTER_SG \
  --query "SecurityGroups[].IpPermissions[]" \
  --output json

# Add required rules
aws ec2 authorize-security-group-ingress \
  --group-id $CLUSTER_SG \
  --protocol udp \
  --port 8472 \
  --source-group $CLUSTER_SG
```

## Step 5: Check IAM Permissions for ENI Mode

If using Cilium's ENI IPAM mode, additional IAM permissions are required:

```bash
# Required IAM permissions for Cilium ENI mode:
# ec2:DescribeNetworkInterfaces
# ec2:AttachNetworkInterface
# ec2:CreateNetworkInterface
# ec2:DeleteNetworkInterface
# ec2:DescribeSubnets
# ec2:DescribeVpcs

# Check node role permissions
NODE_ROLE=$(aws eks describe-nodegroup \
  --cluster-name my-cluster \
  --nodegroup-name my-nodegroup \
  --query "nodegroup.nodeRole" \
  --output text | awk -F'/' '{print $NF}')

aws iam list-attached-role-policies --role-name $NODE_ROLE
```

## Step 6: VPC CIDR Planning

```bash
# Check VPC CIDR for pod IP planning
aws ec2 describe-vpcs \
  --vpc-ids $(aws eks describe-cluster --name my-cluster --query "cluster.resourcesVpcConfig.vpcId" --output text) \
  --query "Vpcs[].CidrBlock" \
  --output text

# Check subnet availability
aws ec2 describe-subnets \
  --filters Name=vpc-id,Values=$VPC_ID \
  --query "Subnets[].{Subnet:SubnetId, AZ:AvailabilityZone, Available:AvailableIpAddressCount}" \
  --output table
```

## EKS + Cilium Requirements Summary

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| EKS version | 1.24 | 1.27+ |
| Kernel version | 5.4 | 5.15+ |
| Node AMI | AL2 | AL2023 or Bottlerocket |
| VPC CNI version | 1.11 (chaining mode) | 1.16+ |
| Subnets | Available IPs in each AZ | 256+ IPs per subnet |

## Conclusion

EKS provides good support for Cilium through either CNI chaining (for existing clusters) or native Cilium IPAM (for new clusters). The key requirements are node kernel version (Bottlerocket provides the best support), security group configuration (overlay mode needs UDP ports open), and VPC subnet planning (sufficient IP space for your pod density). Verifying each of these before installation ensures a smooth deployment.
