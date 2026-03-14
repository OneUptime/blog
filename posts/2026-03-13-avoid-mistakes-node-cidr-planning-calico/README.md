# Avoid Mistakes in Node CIDR Planning for Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Node-cidr, IPAM, Kubernetes, Networking, Planning

Description: Learn how to plan your Kubernetes node CIDR and pod CIDR correctly when using Calico, avoiding the overlaps, sizing errors, and topology mismatches that cause routing and IP allocation failures.

---

## Introduction

Node CIDR planning for Calico involves more than just picking a pod CIDR. You must coordinate the node network CIDR (the IPs assigned to the Kubernetes nodes themselves), the pod CIDR (where Calico allocates pod IPs), the service CIDR (for ClusterIP services), and any external CIDRs you plan to use for load balancers or floating IPs.

Mistakes in CIDR planning often only surface at scale: when you try to add more nodes and run out of node IPs, when pod and node CIDRs overlap and cause silent routing failures, or when you discover your pod CIDR conflicts with on-premises infrastructure after hundreds of pods are already running.

## Prerequisites

- Calico CNI v3.x (or planning a new installation)
- `calicoctl` CLI
- Network team input on VPC/on-premises CIDRs
- Cluster sizing requirements

## Step 1: Map All CIDRs Before Provisioning

The first step is a complete CIDR inventory. All ranges must be non-overlapping.

```bash
# CIDR planning worksheet - fill in your values before creating the cluster
cat << 'EOF'
=== CIDR Planning Worksheet ===

Node CIDR (Kubernetes nodes):      ________________
  Example: 10.0.1.0/24 (254 nodes max)

Pod CIDR (Calico IP pool):         ________________
  Example: 10.244.0.0/16 (65,534 IPs)
  Rule: Must NOT overlap with Node CIDR

Service CIDR (ClusterIP services): ________________
  Example: 10.96.0.0/12 (1,048,574 IPs)
  Rule: Must NOT overlap with Pod or Node CIDRs

VPC CIDR (cloud provider):         ________________
  Rule: None of the above should overlap with this

On-premises CIDR (if applicable):  ________________
  Rule: None of the above should overlap with this

Load Balancer IPs (if needed):     ________________
  Example: 203.0.113.0/24
EOF
```

## Step 2: Calculate Required Node and Pod CIDR Sizes

Size each CIDR based on your cluster's maximum scale requirements.

```bash
# Node CIDR sizing calculation
PLANNED_MAX_NODES=100
# A /24 provides 254 usable IPs - sufficient for 100 nodes
# A /22 provides 1,022 usable IPs - for 500+ node clusters
# Rule: Node CIDR should accommodate max_nodes * 2 for replacement headroom
echo "For ${PLANNED_MAX_NODES} nodes:"
echo "  Minimum node CIDR: /$(python3 -c \"import math; print(32 - math.ceil(math.log2(${PLANNED_MAX_NODES} * 2)))\")"

# Pod CIDR sizing calculation
PLANNED_MAX_PODS=$((PLANNED_MAX_NODES * 110))  # 110 pods per node default
echo ""
echo "For ${PLANNED_MAX_PODS} total pods:"
echo "  Minimum pod CIDR: /$(python3 -c \"import math; print(32 - math.ceil(math.log2(${PLANNED_MAX_PODS} * 3)))\")"
# Multiply by 3 for headroom: existing pods + rolling update pods + future growth
```

## Step 3: Validate CIDR Non-Overlap

Before provisioning, verify all selected CIDRs are non-overlapping.

```python
#!/usr/bin/env python3
# scripts/validate-cidrs.py
# Validates that all planned CIDRs are non-overlapping

import ipaddress
import sys

# Replace with your planned CIDRs
planned_cidrs = {
    "node_cidr": "10.0.1.0/24",
    "pod_cidr": "10.244.0.0/16",
    "service_cidr": "10.96.0.0/12",
    "vpc_cidr": "10.0.0.0/16",
    "on_premises": "192.168.0.0/16",
}

networks = {name: ipaddress.ip_network(cidr) for name, cidr in planned_cidrs.items()}
errors = []

# Check all pairs for overlap
names = list(networks.keys())
for i, name1 in enumerate(names):
    for name2 in names[i+1:]:
        if networks[name1].overlaps(networks[name2]):
            errors.append(f"OVERLAP: {name1} ({planned_cidrs[name1]}) overlaps with {name2} ({planned_cidrs[name2]})")

if errors:
    print("VALIDATION FAILED:")
    for e in errors:
        print(f"  {e}")
    sys.exit(1)
else:
    print("VALIDATION PASSED: All CIDRs are non-overlapping")
```

## Step 4: Configure Calico With the Validated CIDRs

Use the validated CIDRs when configuring Kubernetes and Calico.

```yaml
# ippool-validated.yaml
# Calico IP pool using the validated pod CIDR
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  # Use the validated pod CIDR from your planning worksheet
  cidr: 10.244.0.0/16
  # blockSize based on max_pods_per_node (110 default: use /25 = 128 IPs)
  blockSize: 25
  ipipMode: Never
  vxlanMode: CrossSubnet
  natOutgoing: true
  disabled: false
```

```bash
# When bootstrapping with kubeadm, pass the validated pod and service CIDRs
kubeadm init \
  --pod-network-cidr=10.244.0.0/16 \     # Must match Calico IPPool CIDR
  --service-cidr=10.96.0.0/12 \
  --kubernetes-version=1.29.0
```

## Step 5: Post-Provisioning CIDR Verification

After cluster creation, verify all CIDRs are configured as planned.

```bash
# Verify pod CIDR matches Calico configuration
kubectl cluster-info dump | grep -E "cluster-cidr|pod-network-cidr"
calicoctl get ippool -o wide

# Verify service CIDR
kubectl cluster-info dump | grep service-cluster-ip-range

# Confirm node IPs are in the expected node CIDR
kubectl get nodes -o wide | awk '{print $6}' | tail -n +2

# Check for any unexpected overlaps after provisioning
python3 scripts/validate-cidrs.py
```

## Best Practices

- Complete CIDR planning before cluster provisioning - none of these settings can be changed without full cluster recreation.
- Always involve your network team in CIDR planning to account for VPN routes, on-premises connectivity, and future expansions.
- Reserve at least 20% of each CIDR range for future growth and rolling update overhead.
- Document your CIDR allocation decisions in a network allocation register that is updated when new clusters are created.
- Use non-RFC-1918 ranges (e.g., `100.64.0.0/10` - IANA Shared Address Space) for pod CIDRs when all RFC-1918 space is in use.

## Conclusion

Node CIDR planning is a pre-provisioning decision with permanent consequences - misconfigured CIDRs require cluster recreation to fix. By completing a CIDR inventory, sizing each range for planned maximum scale, validating non-overlap programmatically, and documenting your allocation decisions, you avoid the class of networking failures that only appear when clusters grow or when connectivity to on-premises resources is needed.
