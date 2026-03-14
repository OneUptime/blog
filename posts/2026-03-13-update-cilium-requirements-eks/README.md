# Update Cilium Requirements on EKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, EKS, AWS, EBPF

Description: A guide to reviewing and updating Cilium's system and cluster requirements on Amazon EKS, covering node group OS versions, kernel compatibility, and AWS-specific networking prerequisites.

---

## Introduction

Amazon EKS presents unique requirements for Cilium due to AWS's VPC-native networking model and the Amazon Linux 2 vs Bottlerocket node options. EKS clusters running the Amazon VPC CNI (aws-node) require specific steps to chain with Cilium or replace it entirely, and each path has different prerequisites.

EKS Kubernetes version support windows, node AMI selections, and instance type capabilities all affect Cilium compatibility. For example, running Cilium's eBPF dataplane on EKS requires Bottlerocket or Amazon Linux 2023 nodes with kernel 5.10+ - older Amazon Linux 2 instances may have kernel 4.14 which limits available Cilium features.

This guide covers how to verify and update your EKS cluster to meet Cilium's requirements, including node group configuration, kernel verification, and AWS-specific networking settings.

## Prerequisites

- EKS cluster (managed or self-managed node groups)
- `aws` CLI configured with appropriate IAM permissions
- `eksctl` installed (optional but helpful)
- `kubectl` configured for the EKS cluster
- `cilium` CLI installed

## Step 1: Check EKS Cluster Kubernetes Version

Cilium supports specific Kubernetes version ranges. Verify your EKS cluster version.

```bash
# Check current EKS cluster version
aws eks describe-cluster \
  --name <cluster-name> \
  --region <region> \
  --query "cluster.version" -o text

# Check Cilium's supported Kubernetes versions
# Visit: https://docs.cilium.io/en/stable/concepts/kubernetes/compatibility/

# Update EKS to a supported version if needed
aws eks update-cluster-version \
  --name <cluster-name> \
  --region <region> \
  --kubernetes-version 1.29
```

## Step 2: Verify Node Group AMI and Kernel Version

Check that node AMIs meet Cilium's minimum kernel requirements.

```bash
# Get kernel version from all nodes
kubectl get nodes \
  -o custom-columns="NODE:.metadata.name,KERNEL:.status.nodeInfo.kernelVersion,OS:.status.nodeInfo.osImage"

# For Cilium eBPF features, need kernel 5.3+ (Bottlerocket or AL2023)
# For basic Cilium, need kernel 4.9+
# Amazon Linux 2: kernel 4.14 (limited features)
# Amazon Linux 2023: kernel 6.1 (full feature support)
# Bottlerocket: kernel 5.10+ (full feature support)
```

## Step 3: Update Node Groups to Use Compatible AMI

Update node groups to use Amazon Linux 2023 or Bottlerocket for full Cilium support.

```bash
# Create a new managed node group with Amazon Linux 2023
aws eks create-nodegroup \
  --cluster-name <cluster-name> \
  --nodegroup-name cilium-nodes \
  --node-role <node-iam-role-arn> \
  --subnets <subnet-id-1> <subnet-id-2> \
  --instance-types t3.medium \
  --ami-type AL2023_x86_64_STANDARD \
  --scaling-config minSize=1,maxSize=5,desiredSize=3 \
  --region <region>

# Verify new nodes meet kernel requirements
kubectl get nodes -l eks.amazonaws.com/nodegroup=cilium-nodes \
  -o custom-columns="NODE:.metadata.name,KERNEL:.status.nodeInfo.kernelVersion"
```

## Step 4: Configure VPC CNI for Cilium Chaining or Replacement

Decide whether to chain Cilium with the AWS VPC CNI or replace it.

```bash
# Option A: Chain Cilium with AWS VPC CNI (preserves ENI-based IPAM)
# Verify aws-node daemonset is running
kubectl get ds -n kube-system aws-node

# Option B: Replace AWS VPC CNI with Cilium (requires ENI IPAM disabled)
# Scale down aws-node daemonset before installing Cilium
kubectl scale ds aws-node -n kube-system --replicas=0

# Verify aws-node is fully stopped before proceeding
kubectl get pods -n kube-system | grep aws-node
```

## Step 5: Check Security Group and IAM Requirements

EKS security groups must allow Cilium's inter-node communication ports.

```bash
# Get the cluster security group ID
aws eks describe-cluster \
  --name <cluster-name> \
  --query "cluster.resourcesVpcConfig.clusterSecurityGroupId" -o text

# Allow VXLAN (UDP 8472) between nodes for Cilium VXLAN mode
# Allow health check (TCP 4240) between nodes
# These are typically covered by the EKS cluster security group
aws ec2 authorize-security-group-ingress \
  --group-id <security-group-id> \
  --protocol udp \
  --port 8472 \
  --source-group <security-group-id>
```

## Best Practices

- Use Bottlerocket or Amazon Linux 2023 node AMIs for full Cilium eBPF feature support
- Review the Cilium-EKS compatibility matrix before each Cilium upgrade
- Enable IMDSv2 on EKS nodes (required by Cilium for AWS metadata access)
- Use managed node groups to simplify OS and AMI updates
- Keep aws-node DaemonSet and Cilium versions compatible when chaining

## Conclusion

Meeting Cilium's requirements on EKS centers on choosing the right node AMI for your desired Cilium feature set and configuring VPC networking appropriately. Amazon Linux 2023 and Bottlerocket provide the best kernel support for Cilium's eBPF dataplane. By proactively checking version compatibility and updating node groups before installing or upgrading Cilium, you avoid runtime compatibility issues in production.
