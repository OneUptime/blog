# How to Prevent CIDRNotAvailable Errors with Calico and kubeadm

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubeadm, CIDR, IPAM, Kubernetes, Prevention, Capacity Planning

Description: Proactive strategies to prevent CIDRNotAvailable errors from occurring in Calico-based Kubernetes clusters provisioned with kubeadm.

---

## Introduction

CIDRNotAvailable errors in Calico and kubeadm clusters are preventable. These errors typically occur due to CIDR mismatches during initial setup, insufficient address space for cluster growth, or IPAM block fragmentation over time. By following consistent configuration practices and planning for capacity, operators can avoid these issues entirely.

Prevention is always preferable to remediation because CIDRNotAvailable errors directly impact pod scheduling. When pods cannot obtain IP addresses, deployments stall, autoscaling fails, and workloads experience downtime.

This guide covers the proactive measures you should take during initial cluster setup and ongoing operations to ensure CIDR-related failures never occur.

## Prerequisites

- Kubernetes cluster provisioned with kubeadm (or planning to provision one)
- Calico as the CNI plugin
- `kubectl` and `calicoctl` CLI tools installed
- Understanding of IP address management concepts

## Aligning CIDRs During Cluster Initialization

The most important prevention step happens at cluster creation time. Ensure the pod CIDR is consistent across all components:

```bash
# During kubeadm init, specify the pod network CIDR
kubeadm init --pod-network-cidr=10.244.0.0/16

# Verify it was set correctly
kubectl get configmap -n kube-system kubeadm-config -o yaml | grep podSubnet
```

When installing Calico, use the same CIDR:

```yaml
# calico-ippool.yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  cidr: 10.244.0.0/16
  ipipMode: Always
  natOutgoing: true
  nodeSelector: all()
  blockSize: 26
```

Create a checklist for new cluster provisioning:

```bash
# Verification script to run after cluster initialization
echo "=== CIDR Alignment Check ==="
KUBEADM_CIDR=$(kubectl get configmap -n kube-system kubeadm-config -o jsonpath='{.data.ClusterConfiguration}' | grep podSubnet | awk '{print $2}')
CALICO_CIDR=$(calicoctl get ippools -o jsonpath='{.items[0].spec.cidr}')
CONTROLLER_CIDR=$(kubectl get pod -n kube-system -l component=kube-controller-manager -o yaml | grep cluster-cidr | awk -F= '{print $2}')

echo "kubeadm:     $KUBEADM_CIDR"
echo "Calico:      $CALICO_CIDR"
echo "Controller:  $CONTROLLER_CIDR"

if [ "$KUBEADM_CIDR" = "$CALICO_CIDR" ]; then
  echo "PASS: CIDRs are aligned"
else
  echo "FAIL: CIDR mismatch detected"
fi
```

## Sizing the CIDR for Growth

Plan the pod CIDR to accommodate future growth:

```bash
# Calculate required address space
# /16 = 65,536 addresses (supports ~1000 nodes with /24 per node)
# /14 = 262,144 addresses (supports ~4000 nodes)
# /12 = 1,048,576 addresses (supports ~16000 nodes)

# Consider pods per node (default max is 110)
# Nodes planned: 200
# Pods per node: 110
# Total IPs needed: 22,000
# Recommended: /16 with room to spare
```

Choose a block size appropriate for your pod density:

```bash
# Block size determines IPs per node allocation
# /26 = 64 IPs per block (default, good for most clusters)
# /27 = 32 IPs per block (saves space, more route entries)
# /28 = 16 IPs per block (very dense clusters with many nodes)
```

## Avoiding CIDR Conflicts

Prevent overlaps with existing network infrastructure:

```bash
# Document all CIDR ranges in use
echo "=== Network CIDR Inventory ==="
echo "Pod CIDR:     10.244.0.0/16"
echo "Service CIDR: 10.96.0.0/12"
echo "Node network: 192.168.1.0/24"
echo "VPN range:    172.16.0.0/12"

# Verify no overlaps exist
# Use an IP calculator or script to check for range overlaps
```

## Implementing IPAM Garbage Collection

Prevent stale IPAM allocations from accumulating:

```bash
# Regular check for leaked IP addresses
calicoctl ipam check

# Automate with a CronJob
```

```yaml
# ipam-gc-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: calico-ipam-check
  namespace: calico-system
spec:
  schedule: "0 */6 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: calico-node
          containers:
          - name: ipam-check
            image: calico/ctl:v3.27.0
            command: ["calicoctl", "ipam", "check"]
          restartPolicy: OnFailure
```

## Setting Up Capacity Alerts

Configure alerts before CIDR exhaustion occurs:

```bash
# Check current utilization percentage
TOTAL=$(calicoctl ipam show | grep "Total" | awk '{print $2}')
USED=$(calicoctl ipam show | grep "In use" | awk '{print $2}')
echo "IPAM utilization: $USED / $TOTAL"
```

Create a monitoring script:

```bash
#!/bin/bash
# ipam-capacity-check.sh
THRESHOLD=80

TOTAL=$(calicoctl ipam show 2>/dev/null | grep -i "total" | awk '{print $2}')
USED=$(calicoctl ipam show 2>/dev/null | grep -i "in use" | awk '{print $2}')

if [ -n "$TOTAL" ] && [ "$TOTAL" -gt 0 ]; then
  PERCENT=$((USED * 100 / TOTAL))
  if [ "$PERCENT" -ge "$THRESHOLD" ]; then
    echo "WARNING: IPAM utilization at ${PERCENT}% ($USED/$TOTAL)"
  else
    echo "OK: IPAM utilization at ${PERCENT}%"
  fi
fi
```

## Standardizing Cluster Provisioning

Use infrastructure-as-code to ensure consistent CIDR configuration:

```bash
# Store cluster configuration in version control
cat > cluster-config.yaml <<EOF
apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
networking:
  podSubnet: "10.244.0.0/16"
  serviceSubnet: "10.96.0.0/12"
controllerManager:
  extraArgs:
    allocate-node-cidrs: "true"
    cluster-cidr: "10.244.0.0/16"
    node-cidr-mask-size: "24"
EOF
```

## Verification

Verify your prevention measures are in place:

```bash
# Run the full prevention checklist
echo "1. CIDR alignment: "
kubectl get configmap -n kube-system kubeadm-config -o yaml | grep podSubnet
calicoctl get ippools -o wide

echo "2. IPAM health: "
calicoctl ipam check

echo "3. Capacity headroom: "
calicoctl ipam show

echo "4. All nodes have CIDRs: "
kubectl get nodes -o custom-columns=NAME:.metadata.name,CIDR:.spec.podCIDR
```

## Troubleshooting

**Prevention measures already missed**: If the cluster is already running with misaligned CIDRs, refer to the fix guide for remediation steps before implementing prevention measures.

**Unable to change CIDR after initialization**: kubeadm's pod CIDR cannot be changed after initialization without cluster recreation. Add a second Calico IPPool instead.

**Block size too large for node count**: If you run many nodes with few pods each, consider using a smaller block size to avoid exhausting the CIDR through block allocation overhead.

## Conclusion

Preventing CIDRNotAvailable errors requires discipline at cluster provisioning time and ongoing capacity monitoring. By aligning CIDRs across all components from the start, sizing the address space for growth, avoiding network overlaps, and monitoring IPAM utilization, operators can ensure that pod IP allocation never becomes a bottleneck. Encode these practices into your provisioning automation and runbooks to maintain consistency across all clusters.
