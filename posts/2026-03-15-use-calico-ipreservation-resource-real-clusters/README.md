# How to Use the Calico IPReservation Resource in Real Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, IPReservation, Kubernetes, Networking, IPAM, Production, IP Management

Description: Practical patterns for using Calico IPReservation resources in production to prevent IP conflicts and manage address space effectively.

---

## Introduction

In real production clusters, the pod IP address space often overlaps with pre-existing network infrastructure. Load balancers, database servers, monitoring appliances, and legacy systems may already occupy IPs within your Calico IPPool CIDR ranges. IPReservation resources ensure these addresses are never handed out to pods.

Beyond conflict prevention, IPReservations are useful for capacity management. By reserving blocks for future infrastructure, you prevent fragmentation and ensure contiguous address space remains available for planned deployments.

This guide covers practical IPReservation patterns drawn from production cluster operations, including integration with infrastructure provisioning and automated reservation management.

## Prerequisites

- A production Kubernetes cluster with Calico CNI (v3.22 or later)
- `kubectl` and `calicoctl` with cluster admin access
- A network inventory documenting all static IP assignments
- Active IPPool resources whose CIDRs may overlap with existing infrastructure

## Reserving IPs for Cloud Load Balancers

Cloud providers often assign internal IPs from ranges that overlap with pod CIDRs. Reserve the ranges used by your load balancers:

```yaml
apiVersion: projectcalico.org/v3
kind: IPReservation
metadata:
  name: cloud-lb-reservations
spec:
  reservedCIDRs:
    - 10.244.10.0/28
    - 10.244.10.16/28
    - 10.244.10.32/28
```

This reserves 48 IPs across three /28 blocks for internal load balancer VIPs.

## Reserving IPs for Database Clusters

Stateful services like databases often need predictable IPs for replication and client configuration:

```yaml
apiVersion: projectcalico.org/v3
kind: IPReservation
metadata:
  name: database-cluster-ips
spec:
  reservedCIDRs:
    - 10.244.50.10/32
    - 10.244.50.11/32
    - 10.244.50.12/32
    - 10.244.50.20/32
    - 10.244.50.21/32
    - 10.244.50.22/32
```

These IPs can then be assigned to database VMs or bare-metal servers that share the same network.

## Network Equipment Reservations

Reserve IPs used by switches, routers, and other network devices:

```yaml
apiVersion: projectcalico.org/v3
kind: IPReservation
metadata:
  name: network-equipment
spec:
  reservedCIDRs:
    - 10.244.0.1/32
    - 10.244.0.2/32
    - 10.244.0.3/32
    - 10.244.64.1/32
    - 10.244.64.2/32
    - 10.244.128.1/32
    - 10.244.128.2/32
```

## Reserving Future Expansion Blocks

Set aside contiguous blocks for planned infrastructure without wasting current capacity:

```yaml
apiVersion: projectcalico.org/v3
kind: IPReservation
metadata:
  name: future-expansion
spec:
  reservedCIDRs:
    - 10.244.240.0/20
```

This reserves the last /20 of a /16 pool for future use. Remove or shrink this reservation when the capacity is needed.

## Automated Reservation with Scripts

Integrate IPReservation management into your infrastructure automation:

```bash
#!/bin/bash
# Script to reserve IPs from a list file
# Each line in the file should contain one IP or CIDR

RESERVATION_NAME="auto-reserved"
IP_LIST_FILE="reserved-ips.txt"

CIDRS=""
while IFS= read -r ip; do
  if [[ -n "$ip" && ! "$ip" =~ ^# ]]; then
    if [[ ! "$ip" =~ / ]]; then
      ip="${ip}/32"
    fi
    CIDRS="$CIDRS    - $ip\n"
  fi
done < "$IP_LIST_FILE"

cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: IPReservation
metadata:
  name: ${RESERVATION_NAME}
spec:
  reservedCIDRs:
$(echo -e "$CIDRS")
EOF
```

## Combining Reservations with IPPool Node Selectors

Use IPReservations alongside zone-specific IPPools for maximum control:

```yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: zone-a-pool
spec:
  cidr: 10.244.0.0/18
  vxlanMode: CrossSubnet
  natOutgoing: true
  nodeSelector: topology.kubernetes.io/zone == "us-east-1a"
  blockSize: 26
---
apiVersion: projectcalico.org/v3
kind: IPReservation
metadata:
  name: zone-a-infra
spec:
  reservedCIDRs:
    - 10.244.0.0/28
    - 10.244.1.0/28
```

This reserves the first 16 IPs of two subnets within zone A's pool for infrastructure use.

## Verification

Validate your production reservation setup:

```bash
# List all reservations
calicoctl get ipreservations

# Verify total reserved count
calicoctl get ipreservations -o yaml | grep -c "/"

# Check that no pods have reserved IPs
RESERVED=$(calicoctl get ipreservation -o jsonpath='{.items[*].spec.reservedCIDRs[*]}')
echo "Reserved ranges: $RESERVED"

# Verify IPAM utilization accounts for reservations
calicoctl ipam show

# Stress test allocation
kubectl create deployment reservation-test --image=busybox --replicas=20 -- sleep 3600
kubectl get pods -l app=reservation-test -o jsonpath='{range .items[*]}{.status.podIP}{"\n"}{end}'
kubectl delete deployment reservation-test
```

## Troubleshooting

- If pods receive reserved IPs during high-churn scenarios, verify the IPReservation resource exists with `calicoctl get ipreservation <name> -o yaml`
- For large clusters, use fewer IPReservation resources with broader CIDRs rather than many resources with individual /32 entries
- If reservations are accidentally deleted, apply them immediately from version control backups
- Monitor for IP conflicts using ARP scans: `arping -D -c 3 <ip>` on each node
- When integrating with Terraform or Pulumi, manage IPReservation resources as part of your infrastructure code to keep them in sync with actual deployments

## Conclusion

Calico IPReservation resources are essential for production clusters that share address space with existing infrastructure. By systematically reserving IPs for load balancers, databases, network equipment, and future expansion, you prevent silent IP conflicts that cause difficult-to-debug connectivity issues. Automate reservation management through infrastructure-as-code practices and maintain a comprehensive network inventory to keep reservations accurate.
