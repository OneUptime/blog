# Troubleshoot Cilium Requirements on Amazon EKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, EKS, AWS, EBPF

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
- Node IAM role with `AmazonEKSWorkerNodePolicy` and `AmazonEKS_CNI_Policy`

## Step 1: Verify Kernel Version on EKS Nodes

Cilium requires Linux kernel 4.9.17 or later; eBPF-based features require 5.10+. EKS managed node groups use Amazon Linux 2 (kernel 5.10) or Bottlerocket by default, but custom AMIs may not meet this requirement.

Check the kernel version across all nodes:

```bash
# List kernel versions for all nodes in the cluster
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.nodeInfo.kernelVersion}{"\n"}{end}'
```

Expected output should show kernel 5.10.x or higher for full eBPF support. If any node shows 4.x, update the AMI in your managed node group or launch template.

## Step 2: Check AWS VPC CNI Status

On EKS, AWS VPC CNI (aws-node DaemonSet) must be removed or disabled before installing Cilium in standalone mode. If you plan to use chaining mode, it must remain running.

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

Cilium on EKS needs specific EC2 permissions to manage ENIs and security groups when using ENI mode. Missing permissions cause silent failures where pods cannot communicate across nodes.

Use the AWS CLI to confirm your node role has the required policies attached:

```bash
# Retrieve the IAM role name from a running node's instance profile
NODE_INSTANCE=$(aws ec2 describe-instances \
  --filters "Name=tag:kubernetes.io/cluster/<cluster-name>,Values=owned" \
  --query 'Reservations[0].Instances[0].IamInstanceProfile.Arn' \
  --output text)

# List policies attached to the role
aws iam list-attached-role-policies --role-name <node-role-name> --output table
```

## Step 4: Run Cilium Pre-flight Check

The Cilium CLI includes a built-in preflight check that validates connectivity and system requirements before full installation.

Run the preflight check against your EKS cluster:

```bash
# Execute the Cilium preflight check; this deploys temporary pods to validate requirements
cilium install --dry-run-helm-values

# Run the connectivity test after installation to verify end-to-end health
cilium connectivity test
```

## Best Practices

- Always use EKS-optimized AMIs (Amazon Linux 2023 or Bottlerocket) for best kernel compatibility
- Enable EKS Pod Identity or IRSA for Cilium's AWS API access rather than node-level IAM roles in production
- Set `eks.amazonaws.com/compute-type: ec2` on node groups to avoid Fargate nodes, which do not support Cilium
- Use managed node groups with launch templates to pin AMI versions and prevent unexpected kernel downgrades
- Monitor `cilium-agent` logs in CloudWatch when running EKS with Container Insights enabled

## Conclusion

Validating Cilium requirements on EKS before installation saves significant debugging time. The key checkpoints are kernel version, VPC CNI coexistence, IAM permissions, and the Cilium preflight connectivity test. With these confirmed, you can proceed with a confident installation knowing the environment meets all prerequisites.
