# Troubleshoot Cilium on Alibaba Cloud ENI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Alibaba Cloud, ENI, eBPF

Description: A guide to diagnosing and resolving issues when running Cilium with Alibaba Cloud Elastic Network Interface (ENI) IPAM on ACK or self-managed Kubernetes clusters.

---

## Introduction

Cilium supports Alibaba Cloud Elastic Network Interfaces (ENIs) for pod IP address management, enabling pods to receive IPs directly from Alibaba Cloud VPC subnets. This provides native VPC routing without overlay encapsulation, delivering better network performance on Alibaba Cloud infrastructure.

Issues with Cilium ENI mode on Alibaba Cloud often involve ENI attachment limits, IP quota restrictions, RAM role permissions for the Cilium operator, and ENI lifecycle management. Diagnosing these problems requires familiarity with both Cilium's IPAM model and Alibaba Cloud's networking API.

This guide covers the most common issues and provides diagnostic procedures for Cilium ENI mode on Alibaba Cloud.

## Prerequisites

- Kubernetes cluster on Alibaba Cloud (ACK or self-managed ECS)
- Cilium installed with ENI IPAM mode
- `kubectl` with cluster admin access
- `cilium` CLI installed
- Alibaba Cloud CLI (`aliyun`) configured

## Step 1: Verify Cilium ENI Mode Configuration

Confirm Cilium is configured to use Alibaba Cloud ENI for IPAM.

```bash
# Check Cilium ConfigMap for ENI IPAM settings
kubectl get configmap cilium-config -n kube-system -o yaml | \
  grep -E "ipam|eni|alibaba"

# Verify Cilium operator is running and healthy
kubectl get pods -n kube-system -l name=cilium-operator

# Check Cilium operator logs for ENI-related activity
kubectl logs -n kube-system -l name=cilium-operator | \
  grep -E "eni|alibaba|ERROR" | tail -30
```

## Step 2: Diagnose ENI Attachment Failures

Investigate cases where ENIs fail to attach to ECS instances.

```bash
# Check Cilium node status for ENI attachment info
kubectl get ciliumnode <node-name> -o yaml | grep -A20 "eni:"

# Look for ENI errors in the Cilium operator logs
kubectl logs -n kube-system -l name=cilium-operator | \
  grep -E "failed|attachment|quota|limit"

# Check current ENI count on a node
# (via Alibaba Cloud Console or CLI)
aliyun ecs DescribeNetworkInterfaces \
  --InstanceId <ecs-instance-id> \
  --RegionId <region-id>
```

## Step 3: Resolve IP Quota and ENI Limit Issues

Address limitations on the number of ENIs or IPs per instance.

```bash
# Check the maximum ENIs and IPs per ENI for your ECS instance type
# Different instance families have different limits
# c6.large: max 2 ENIs, 6 IPs per ENI
# g6.4xlarge: max 8 ENIs, 20 IPs per ENI

# Check current IP allocation
kubectl get ciliumnode <node-name> -o yaml | \
  grep -A30 "status:" | grep -E "used|available"

# If hitting limits, consider upgrading ECS instance type
# or reducing max pods per node
kubectl get node <node-name> -o jsonpath='{.status.capacity.pods}'
```

## Step 4: Verify RAM Role Permissions

Ensure the ECS instances have the required RAM role permissions for ENI operations.

```bash
# Check if the ECS instance has a RAM role attached
aliyun ecs DescribeInstanceAttribute \
  --InstanceId <ecs-instance-id> \
  --RegionId <region-id> | jq '.RamRoleName'

# The RAM role needs the following permissions:
# - ecs:CreateNetworkInterface
# - ecs:AttachNetworkInterface
# - ecs:DescribeNetworkInterfaces
# - ecs:AssignPrivateIpAddresses
# - ecs:UnassignPrivateIpAddresses
# - ecs:DeleteNetworkInterface

# Check for permission errors in Cilium operator logs
kubectl logs -n kube-system -l name=cilium-operator | grep -i "permission\|forbidden\|auth"
```

## Step 5: Test Pod Connectivity in ENI Mode

Validate that pods receive IPs from the correct VPC subnet and can communicate.

```bash
# Check that pods are receiving IPs from the expected VPC subnet
kubectl get pods --all-namespaces -o wide | head -20

# Test connectivity between pods
kubectl run eni-test-1 --rm -it --image=busybox -- \
  ping -c 3 <pod-ip-on-different-node>

# Verify pods have direct VPC routing (no overlay)
kubectl exec <pod-name> -- traceroute <external-ip>
# Should show direct routing through VPC without encapsulation

# Run Cilium connectivity test
cilium connectivity test
```

## Best Practices

- Choose ECS instance types with sufficient ENI and IP limits for your pod density
- Monitor ENI utilization and set alerts before reaching instance type limits
- Use Cilium's pre-allocation settings to warm up ENI IPs before pod scheduling
- Ensure RAM role policies are correct before deploying Cilium-ENI operations fail silently without permissions
- Test ENI behavior during scale-out events to validate automatic ENI attachment

## Conclusion

Cilium's ENI IPAM mode on Alibaba Cloud provides native VPC networking for pods, but requires careful attention to instance type limits, RAM role permissions, and ENI lifecycle management. By systematically checking ENI attachment, IP quota, and permission configuration, you can resolve most issues and maintain reliable pod networking on Alibaba Cloud.
