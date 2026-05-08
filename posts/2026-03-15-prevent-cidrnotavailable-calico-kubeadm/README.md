# How to Prevent CIDRNotAvailable Errors with Calico and kubeadm

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubeadm, CIDR, IPAM, Kubernetes, Prevention, Capacity Planning

Description: Proactive strategies to prevent CIDRNotAvailable errors from occurring in Calico-based Kubernetes clusters provisioned with kubeadm.

---

## Introduction

CIDRNotAvailable errors in Calico and kubeadm clusters are preventable. These errors typically occur when Kubernetes node CIDR allocation is enabled but the configured cluster CIDR is missing, too small, or exhausted. Calico IPAM does not use `Node.spec.podCIDR` for pod IP allocation, but Calico IPPools should still be kept within the Kubernetes pod CIDR because other Kubernetes components use that range to identify pod addresses. By following consistent configuration practices and planning for capacity, operators can avoid these issues entirely.

Prevention is always preferable to remediation because node CIDR exhaustion and pod IPPool exhaustion can both affect cluster growth. When pods cannot obtain IP addresses, deployments stall, autoscaling fails, and workloads experience downtime.

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

When installing Calico, use the same CIDR or a subset of it:

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
  echo "CHECK: Confirm the Calico pool is a subset of the kubeadm pod CIDR"
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

## Implementing IPAM Leak Detection

Detect stale IPAM allocations before they accumulate:

```bash
# Regular check for leaked IP addresses
calicoctl ipam check

# To clean up leaked addresses, lock the datastore, generate a report,
# review it, release the leaked addresses, and unlock the datastore:
calicoctl datastore migrate lock
calicoctl ipam check -o report.json
calicoctl ipam release --from-report report.json
calicoctl datastore migrate unlock
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

Run any automated release workflow separately and with change-control, because datastore locking pauses new pod launches and releasing addresses that are still in use can disrupt workloads.

## Setting Up Capacity Alerts

Configure alerts before CIDR exhaustion occurs:

```bash
# Check current utilization percentage
read TOTAL USED <<EOF
$(calicoctl ipam show | awk -F'|' '/IP Pool/ {gsub(/ /, "", $4); gsub(/^ +| +$/, "", $5); split($5, a, " "); total += $4; used += a[1]} END {print total + 0, used + 0}')
EOF
echo "IPAM utilization: $USED / $TOTAL"
```

Create a monitoring script:

```bash
#!/bin/bash
# ipam-capacity-check.sh
THRESHOLD=80

read TOTAL USED <<EOF
$(calicoctl ipam show 2>/dev/null | awk -F'|' '/IP Pool/ {gsub(/ /, "", $4); gsub(/^ +| +$/, "", $5); split($5, a, " "); total += $4; used += a[1]} END {print total + 0, used + 0}')
EOF

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
apiVersion: kubeadm.k8s.io/v1beta4
kind: ClusterConfiguration
networking:
  podSubnet: "10.244.0.0/16"
  serviceSubnet: "10.96.0.0/12"
controllerManager:
  extraArgs:
    - name: allocate-node-cidrs
      value: "true"
    - name: cluster-cidr
      value: "10.244.0.0/16"
    - name: node-cidr-mask-size
      value: "24"
EOF
```

If you use Calico IPAM and do not need Kubernetes to allocate node CIDRs, you can instead set `allocate-node-cidrs` to `"false"` to avoid unused Kubernetes node CIDR allocations and the related `CIDRNotAvailable` events.

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

echo "4. Node CIDR allocation status: "
kubectl get nodes -o custom-columns=NAME:.metadata.name,CIDR:.spec.podCIDR
```

## Troubleshooting

**Prevention measures already missed**: If the cluster is already running with misaligned CIDRs, refer to the fix guide for remediation steps before implementing prevention measures.

**Unable to change CIDR after initialization**: kubeadm does not provide a simple in-place workflow for changing the original pod CIDR after initialization. If you use Calico IPAM, add a new Calico IPPool within the intended pod address space and migrate workloads carefully.

**Block size too large for node count**: If you run many nodes with few pods each, consider using a smaller block size to avoid exhausting the CIDR through block allocation overhead.

## Conclusion

Preventing CIDRNotAvailable errors requires discipline at cluster provisioning time and ongoing capacity monitoring. By keeping Calico IPPools within the Kubernetes pod CIDR from the start, sizing the address space for growth, avoiding network overlaps, and monitoring IPAM utilization, operators can ensure that pod IP allocation never becomes a bottleneck. Encode these practices into your provisioning automation and runbooks to maintain consistency across all clusters.
