# Validate Cilium Requirements on EKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, EKS, AWS, eBPF

Description: A comprehensive guide to validating that your Amazon EKS cluster meets all requirements for running Cilium, including Kubernetes version, node OS, IAM permissions, and VPC configuration.

---

## Introduction

Amazon EKS has specific requirements for running Cilium successfully, particularly around node group configuration, Kubernetes API server access, and AWS IAM permissions for ENI-based IPAM. Meeting these prerequisites is essential before deploying Cilium, as misconfigurations at the infrastructure level can cause Cilium agents to fail silently or fall back to degraded operating modes.

EKS adds complexity because AWS manages the control plane, and Cilium must work within AWS networking constraints like VPC routing, security groups, and ENI limits. Validating requirements covers both the Kubernetes layer (versions, RBAC) and the AWS infrastructure layer (IAM, VPC, instance type).

## Prerequisites

- EKS cluster (or planned EKS cluster configuration)
- `aws` CLI configured with cluster access
- `eksctl` CLI (optional but recommended)
- `kubectl` configured to access the cluster

## Step 1: Validate Kubernetes and EKS Version

```bash
# Check Kubernetes version

kubectl version

# Check the Kubernetes compatibility matrix for your target Cilium version.
# For example, Cilium 1.19 is tested with Kubernetes 1.31-1.34.
# Check EKS available versions
aws eks describe-cluster-versions --region us-east-1 \
  --query "clusterVersions[*].{version:clusterVersion,status:versionStatus}" \
  --output text 2>/dev/null | head -5

# Get current EKS cluster version
aws eks describe-cluster --name <cluster-name> \
  --query "cluster.version" --output text
```

## Step 2: Validate Node OS and Kernel Version

```bash
# Check kernel versions on worker nodes
kubectl get nodes -o jsonpath=\
'{range .items[*]}{.metadata.name}: {.status.nodeInfo.kernelVersion}, {.status.nodeInfo.osImage}{"\n"}{end}'

# Cilium requires Linux kernel 5.10+ or an equivalent vendor kernel.
# Current EKS AL2023 and Bottlerocket AMIs use newer 6.x kernels.
# Legacy EKS-optimized Amazon Linux 2 AMIs used kernel 5.10, but EKS stopped
# publishing new AL2 AMIs after November 26, 2025.

# Check AMI version used by node groups
aws eks describe-nodegroup \
  --cluster-name <cluster> \
  --nodegroup-name <nodegroup> \
  --query "nodegroup.releaseVersion" --output text
```

## Step 3: Validate IAM Permissions for Cilium ENI Mode

If using Cilium's AWS ENI IPAM mode, specific IAM permissions are required.

```bash
# Get the node IAM role
NODE_ROLE=$(aws eks describe-nodegroup \
  --cluster-name <cluster> \
  --nodegroup-name <nodegroup> \
  --query "nodegroup.nodeRole" --output text)

echo "Node IAM Role: $NODE_ROLE"

# Check attached policies for required ENI permissions
aws iam list-attached-role-policies \
  --role-name $(basename $NODE_ROLE) \
  --query "AttachedPolicies[*].PolicyName" --output table

# Also check inline policies if your role uses them
aws iam list-role-policies \
  --role-name $(basename $NODE_ROLE) \
  --query "PolicyNames" --output table
```

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeNetworkInterfaces",
        "ec2:CreateNetworkInterface",
        "ec2:AttachNetworkInterface",
        "ec2:DeleteNetworkInterface",
        "ec2:ModifyNetworkInterfaceAttribute",
        "ec2:AssignPrivateIpAddresses",
        "ec2:UnassignPrivateIpAddresses",
        "ec2:DescribeSubnets",
        "ec2:DescribeSecurityGroups",
        "ec2:DescribeVpcs",
        "ec2:DescribeRouteTables",
        "ec2:DescribeInstances",
        "ec2:DescribeInstanceTypes",
        "ec2:DescribeTags",
        "ec2:CreateTags"
      ],
      "Resource": "*"
    }
  ]
}
```

## Step 4: Check VPC and Subnet Configuration

```bash
# Verify subnet has sufficient IP space for ENI allocations
aws ec2 describe-subnets \
  --filters "Name=tag:kubernetes.io/cluster/<cluster-name>,Values=*" \
  --query "Subnets[*].{id:SubnetId,available:AvailableIpAddressCount,cidr:CidrBlock}" \
  --output table

# Check ENI limits for the instance type used by worker nodes
# e.g., m5.xlarge supports up to 4 ENIs with 15 IPv4 addresses each
aws ec2 describe-instance-types \
  --instance-types m5.xlarge \
  --query "InstanceTypes[0].NetworkInfo.{maxENIs:MaximumNetworkInterfaces,ipsPerENI:Ipv4AddressesPerInterface}"
```

## Step 5: Validate Security Group Rules

```bash
# Check security group rules allow Cilium inter-node communication
# Cilium uses VXLAN (UDP 8472) or Geneve (UDP 6081) for overlay
aws ec2 describe-security-groups \
  --group-ids <node-security-group-id> \
  --query "SecurityGroups[0].IpPermissions" \
  --output table
```

## Best Practices

- Use Bottlerocket or Amazon Linux 2023 nodes for best Cilium kernel support on EKS
- Attach the minimum required IAM policy for ENI operations - avoid AmazonEC2FullAccess
- Ensure subnets have enough free IPs for the expected pod density when using ENI mode
- Patch the `aws-node` DaemonSet to stop managing ENIs when switching from AWS VPC CNI to Cilium ENI mode
- Test requirements in a dedicated EKS test cluster before modifying production

## Conclusion

Validating Cilium requirements on EKS prevents deployment failures and degraded functionality caused by infrastructure gaps. By systematically checking Kubernetes version, kernel compatibility, IAM permissions, VPC configuration, and security groups, you ensure your EKS cluster is fully prepared to run Cilium with all intended features active.
