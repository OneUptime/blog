# Troubleshoot Cilium Requirements on Amazon EKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, EKS, AWS, eBPF

Description: A practical guide to verifying and troubleshooting Cilium installation requirements on Amazon EKS, covering node IAM roles, kernel versions, and VPC CNI compatibility.

---

## Introduction

Amazon EKS has specific configuration requirements before Cilium can be installed as the CNI plugin. Unlike self-managed clusters, EKS ships with the AWS VPC CNI by default, which must either be replaced or configured for chaining before Cilium can operate correctly.

Understanding these requirements before installation prevents the most common failure modes: pods stuck in Pending state, node connectivity issues, and failed health checks. Many EKS-specific problems stem from the interaction between AWS VPC CNI, the Cilium agent, and the underlying EC2 networking stack.

This guide walks through validating each prerequisite systematically so you can identify exactly where a gap exists before spending time on deeper debugging.

## Prerequisites

- `kubectl` configured with access to your EKS cluster
- `cilium` CLI installed (`cilium version` should return without error)
- `aws` CLI configured with appropriate permissions
- Node IAM role with `AmazonEKSWorkerNodePolicy`; for ENI mode, the Cilium operator also needs the required EC2 permissions for ENI allocation

## Step 1: Verify Kernel Version on EKS Nodes

Cilium requires Linux kernel 5.10 or later, or an equivalent vendor kernel such as RHEL 8.10's 4.18 kernel. EKS managed node groups on Kubernetes 1.30 or newer default to Amazon Linux 2023, and Amazon Linux 2 AMIs use kernel 5.10 by default, but custom AMIs may not meet this requirement.

Check the kernel version across all nodes:

```bash
# List kernel versions for all nodes in the cluster

kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.nodeInfo.kernelVersion}{"\n"}{end}'
```

Expected output should show kernel 5.10.x or higher, unless you are using a distribution kernel that Cilium documents as equivalent. If any node uses an unsupported kernel, update the AMI in your managed node group or launch template.

## Step 2: Check AWS VPC CNI Status

On EKS, AWS VPC CNI (aws-node DaemonSet) must be prevented from managing pod networking before installing Cilium in ENI mode. If you plan to use AWS VPC CNI chaining mode, it must remain running.

Verify the current state of the aws-node DaemonSet:

```bash
# Check if the AWS VPC CNI DaemonSet is running
kubectl -n kube-system get daemonset aws-node

# For standalone Cilium mode, patch aws-node to prevent scheduling
kubectl -n kube-system patch daemonset aws-node \
  --type='strategic' \
  -p='{"spec":{"template":{"spec":{"nodeSelector":{"io.cilium/aws-node-enabled":"true"}}}}}'
```

## Step 3: Validate Node IAM Permissions

Cilium on EKS needs specific EC2 permissions to manage ENIs and security groups when using ENI mode. Missing permissions can prevent the Cilium operator from creating or attaching ENIs, which leaves pod IP allocation and connectivity broken.

Use the AWS CLI to find the node role and confirm the expected policies are attached. If you use IRSA or EKS Pod Identity for the Cilium operator, check that role instead for Cilium's ENI permissions:

```bash
# Retrieve the IAM role name from a running node's instance profile
INSTANCE_PROFILE_ARN=$(aws ec2 describe-instances \
  --filters "Name=tag:kubernetes.io/cluster/<cluster-name>,Values=owned" "Name=instance-state-name,Values=running" \
  --query 'Reservations[].Instances[?IamInstanceProfile!=`null`].IamInstanceProfile.Arn | [0]' \
  --output text)
INSTANCE_PROFILE_NAME=${INSTANCE_PROFILE_ARN##*/}
NODE_ROLE_NAME=$(aws iam get-instance-profile \
  --instance-profile-name "$INSTANCE_PROFILE_NAME" \
  --query 'InstanceProfile.Roles[0].RoleName' \
  --output text)

# List policies attached to the role
aws iam list-attached-role-policies --role-name "$NODE_ROLE_NAME" --output table
```

## Step 4: Run Cilium Health Checks

The Cilium CLI can validate installation health and cluster connectivity after Cilium is installed.

Run the health checks against your EKS cluster:

```bash
# Wait for Cilium components to report healthy
cilium status --wait

# Run the connectivity test after installation to verify end-to-end health
cilium connectivity test
```

## Best Practices

- Always use EKS-optimized AMIs (Amazon Linux 2023 or Bottlerocket) for best kernel compatibility
- Enable EKS Pod Identity or IRSA for Cilium's AWS API access rather than node-level IAM roles in production
- Ensure Cilium DaemonSet pods run on EC2-backed nodes and are not selected by Fargate profiles
- Use managed node groups with launch templates to pin AMI versions and prevent unexpected kernel downgrades
- Monitor `cilium-agent` logs in CloudWatch when running EKS with Container Insights enabled

## Conclusion

Validating Cilium requirements on EKS before installation saves significant debugging time. The key checkpoints are kernel version, VPC CNI coexistence, IAM permissions, and Cilium health and connectivity checks. With these confirmed, you can proceed with a confident installation knowing the environment meets all prerequisites.
