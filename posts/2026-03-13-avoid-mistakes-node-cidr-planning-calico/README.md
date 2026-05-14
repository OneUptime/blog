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

The first step is a complete CIDR inventory. Kubernetes pod and service ranges must be non-overlapping, and they must not conflict with any reachable infrastructure networks. Node IPs normally come from the VPC or datacenter subnet, so the node subnet should be contained in the infrastructure network rather than treated as a separate, non-overlapping range.

```bash
# CIDR planning worksheet - fill in your values before creating the cluster

cat << 'EOF'
=== CIDR Planning Worksheet ===

Node CIDR (Kubernetes nodes):      ________________
  Example: 10.0.1.0/24 (254 nodes max)
  Rule: Usually a subnet inside the VPC or datacenter network

Pod CIDR (Calico IP pool):         ________________
  Example: 10.244.0.0/16 (65,534 IPs)
  Rule: Must NOT overlap with Node, Service, VPC, or on-premises CIDRs

Service CIDR (ClusterIP services): ________________
  Example: 10.96.0.0/12 (1,048,574 IPs)
  Rule: Must NOT overlap with Pod, Node, VPC, or on-premises CIDRs

VPC CIDR (cloud provider):         ________________
  Rule: Node subnet should be inside this range; Pod and Service CIDRs should not overlap with it

On-premises CIDR (if applicable):  ________________
  Rule: Pod and Service CIDRs should not overlap with this if networks are routed together

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
echo "  Minimum node CIDR: /$(python3 -c 'import math, sys; print(32 - math.ceil(math.log2(int(sys.argv[1]) * 2)))' "${PLANNED_MAX_NODES}")"

# Pod CIDR sizing calculation
PLANNED_MAX_PODS=$((PLANNED_MAX_NODES * 110))  # 110 pods per node default
echo ""
echo "For ${PLANNED_MAX_PODS} total pods:"
echo "  Minimum pod CIDR: /$(python3 -c 'import math, sys; print(32 - math.ceil(math.log2(int(sys.argv[1]) * 3)))' "${PLANNED_MAX_PODS}")"
# Multiply by 3 for headroom: existing pods + rolling update pods + future growth
```

## Step 3: Validate CIDR Non-Overlap

Before provisioning, verify all selected CIDRs have the expected relationship to each other.

```python
#!/usr/bin/env python3
# scripts/validate-cidrs.py
# Validates that planned Kubernetes CIDRs do not conflict with routed networks

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

# Node IPs should be allocated from the VPC/datacenter network.
if not networks["node_cidr"].subnet_of(networks["vpc_cidr"]):
    errors.append(
        f"INVALID: node_cidr ({planned_cidrs['node_cidr']}) is not inside "
        f"vpc_cidr ({planned_cidrs['vpc_cidr']})"
    )

# Pod and Service CIDRs must not conflict with node or routed infrastructure CIDRs.
for name1, name2 in [
    ("pod_cidr", "node_cidr"),
    ("pod_cidr", "service_cidr"),
    ("pod_cidr", "vpc_cidr"),
    ("pod_cidr", "on_premises"),
    ("service_cidr", "node_cidr"),
    ("service_cidr", "vpc_cidr"),
    ("service_cidr", "on_premises"),
]:
    if networks[name1].overlaps(networks[name2]):
        errors.append(f"OVERLAP: {name1} ({planned_cidrs[name1]}) overlaps with {name2} ({planned_cidrs[name2]})")

if errors:
    print("VALIDATION FAILED:")
    for e in errors:
        print(f"  {e}")
    sys.exit(1)
else:
    print("VALIDATION PASSED: Kubernetes CIDRs do not conflict with routed networks")
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
  # blockSize can only be set when the pool is created. Keep the default /26
  # unless you have planned the route-scaling and per-node allocation tradeoffs.
  blockSize: 26
  ipipMode: Never
  vxlanMode: CrossSubnet
  natOutgoing: true
  disabled: false
```

```bash
# When bootstrapping with kubeadm, pass the validated pod and service CIDRs
# The pod network CIDR must match Calico's IPPool CIDR.
kubeadm init \
  --pod-network-cidr=10.244.0.0/16 \
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

- Complete CIDR planning before cluster provisioning - changing pod and service CIDRs later is disruptive, and changing Calico IP pools requires a planned migration.
- Always involve your network team in CIDR planning to account for VPN routes, on-premises connectivity, and future expansions.
- Reserve at least 20% of each CIDR range for future growth and rolling update overhead.
- Document your CIDR allocation decisions in a network allocation register that is updated when new clusters are created.
- Use non-RFC-1918 ranges (e.g., `100.64.0.0/10` - IANA Shared Address Space) for pod CIDRs when all RFC-1918 space is in use.

## Conclusion

Node CIDR planning is a pre-provisioning decision with permanent consequences - misconfigured CIDRs require cluster recreation to fix. By completing a CIDR inventory, sizing each range for planned maximum scale, validating non-overlap programmatically, and documenting your allocation decisions, you avoid the class of networking failures that only appear when clusters grow or when connectivity to on-premises resources is needed.
