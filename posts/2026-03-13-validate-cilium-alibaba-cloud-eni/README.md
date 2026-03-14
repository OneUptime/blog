# Validate Cilium on Alibaba Cloud ENI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Alibaba Cloud, ENI, EBPF

Description: Learn how to validate Cilium's Alibaba Cloud ENI (Elastic Network Interface) IPAM mode, ensuring pod IPs are correctly allocated from VPC ENIs and that network connectivity is functioning properly.

---

## Introduction

Cilium supports Alibaba Cloud's Elastic Network Interface (ENI) mode for IP address management, allowing pods to receive IP addresses directly from VPC network interfaces attached to ECS instances. This provides native VPC networking for pods, eliminating overlay network overhead and enabling direct communication with other VPC resources.

In ENI mode, Cilium interacts with the Alibaba Cloud API to allocate secondary IP addresses on ENIs attached to Kubernetes nodes. Each pod gets a VPC-native IP that is directly routable within the VPC without encapsulation. Validating this setup requires checking both the cloud infrastructure layer (ENI attachments and IP allocations) and the Kubernetes networking layer (Cilium endpoint status and connectivity).

This guide covers the validation steps for Cilium ENI mode on Alibaba Cloud, from infrastructure checks to end-to-end connectivity testing.

## Prerequisites

- ACK (Alibaba Cloud Container Service for Kubernetes) cluster or self-managed cluster on ECS
- Cilium deployed with `ipam: eni` mode
- `kubectl` cluster-admin access
- `cilium` CLI installed
- Alibaba Cloud CLI (`aliyun`) configured (optional, for cloud-side validation)

## Step 1: Verify Cilium ENI IPAM Configuration

Confirm that Cilium is configured to use ENI mode for IP allocation.

```bash
# Check the Cilium ConfigMap for IPAM mode
kubectl -n kube-system get configmap cilium-config \
  -o jsonpath='{.data.ipam}'

# Expected output: "eni"

# Verify ENI-specific configuration keys
kubectl -n kube-system get configmap cilium-config -o yaml | \
  grep -E "eni|alibaba|instance-tags"
```

## Step 2: Inspect CiliumNode ENI Status

Check that each node has ENIs attached and IPs allocated.

```bash
# List all CiliumNode objects with ENI details
kubectl get ciliumnodes -o yaml | grep -A 20 "eni:"

# Check a specific node's ENI allocation status
kubectl get ciliumnode <node-name> \
  -o jsonpath='{.status.eni}' | python3 -m json.tool
```

## Step 3: Validate Pod IP Allocation from VPC

Confirm that pod IPs fall within the VPC ENI subnet range.

```bash
# List all pod IPs
kubectl get pods -A -o wide --no-headers | awk '{print $7}' | sort -u

# Verify these IPs are in the expected VPC subnet (e.g., 172.16.0.0/16)
# Each pod IP should match an ENI secondary IP on its node

# Check ENI secondary IPs from the Cilium operator logs
kubectl -n kube-system logs -l name=cilium-operator --tail=100 | \
  grep -i "eni\|allocation\|release"
```

## Step 4: Check Cilium Endpoint Status

```bash
# Verify all endpoints are in "ready" state
kubectl get ciliumendpoints -A | grep -v "ready"

# If any endpoints are not ready, inspect the specific endpoint
kubectl describe ciliumendpoint <endpoint-name> -n <namespace>
```

## Step 5: Run Connectivity Tests

```bash
# Run Cilium connectivity tests to validate ENI-based networking
cilium connectivity test --test '/pod-to-pod' --test '/pod-to-service'

# Test DNS resolution (critical for service discovery)
kubectl run dns-test --image=busybox:1.36 --restart=Never -- \
  nslookup kubernetes.default.svc.cluster.local
kubectl logs dns-test && kubectl delete pod dns-test
```

## Best Practices

- Ensure ECS instance types support sufficient ENI secondary IPs for your pods-per-node target
- Monitor ENI quota limits in your Alibaba Cloud account to prevent allocation failures
- Use the `--eni-tags` Cilium option to tag ENIs for cost allocation and resource tracking
- Size VPC subnets generously - ENI mode consumes one IP per pod from the VPC subnet
- Enable the Cilium operator's ENI release mechanism to return IPs when pods are deleted

## Conclusion

Validating Cilium on Alibaba Cloud ENI requires checking both the cloud-side IP allocation and the Kubernetes-side endpoint status. When ENI mode is correctly configured, pods receive VPC-native IPs that provide low-latency, high-performance networking without overlay overhead. Systematic validation confirms that the ENI allocation pipeline is functioning end-to-end.
