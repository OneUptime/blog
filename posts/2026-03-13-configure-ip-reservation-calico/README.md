# Configure IP Reservation in Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: calico, kubernetes, ipam, ip-reservation, networking

Description: Learn how to reserve specific IP addresses in Calico's IPAM to prevent them from being assigned to pods, ensuring certain IPs are kept available for specific use cases.

---

## Introduction

Calico's IPAM system manages IP address allocation for pods automatically, but there are scenarios where you need to reserve specific IPs or ranges from being assigned. This includes reserving addresses for static virtual IPs, keeping IPs aligned with external firewall rules, preventing allocation of broadcast and network addresses, or holding IPs for services that will be deployed later.

Calico provides IP reservation through IPReservation resources (available from Calico v3.22+), which explicitly exclude specific IPs or CIDRs from the IPAM allocation pool. Reserved IPs remain part of the IP pool's CIDR but are never assigned to pods.

This guide covers creating and managing IP reservations in Calico.

## Prerequisites

- Calico v3.22+ installed
- `calicoctl` v3.22+ CLI configured
- An active IP pool from which you want to reserve addresses

## Step 1: Check Current IP Reservations

View any existing IP reservations before creating new ones.

```bash
# List all IP reservations in the cluster
calicoctl get ipreservations -o wide

# Check current IPAM allocations to understand what is in use
calicoctl ipam show --show-blocks

# View specific IP pool to understand available range
calicoctl get ippool default-ipv4-ippool -o yaml
```

## Step 2: Reserve a Single IP Address

Create an IPReservation to prevent a specific IP from being assigned to pods.

```yaml
# reserve-single-ip.yaml
# Reserve 192.168.0.10 — this IP is used by a hardware appliance
apiVersion: projectcalico.org/v3
kind: IPReservation
metadata:
  name: appliance-ip-reservation
spec:
  reservedCIDRs:
  # This specific IP will never be assigned to a Kubernetes pod
  - "192.168.0.10/32"
```

```bash
# Apply the IP reservation
calicoctl apply -f reserve-single-ip.yaml

# Verify the reservation is active
calicoctl get ipreservations

# Confirm the IP is excluded from IPAM allocations
calicoctl ipam show | grep "192.168.0.10"
```

## Step 3: Reserve a Range of IPs

Reserve multiple addresses or a subnet range from the pod pool.

```yaml
# reserve-ip-range.yaml
# Reserve IPs in the .1 to .20 range for infrastructure services
apiVersion: projectcalico.org/v3
kind: IPReservation
metadata:
  name: infrastructure-ip-reservation
spec:
  reservedCIDRs:
  # Reserve the first 20 addresses in each /24 block for infrastructure
  - "192.168.0.0/28"   # .0 - .15
  - "192.168.0.16/30"  # .16 - .19
  # Reserve specific addresses used by monitoring agents
  - "192.168.1.100/32"
  - "192.168.1.101/32"
  - "192.168.1.102/32"
```

```bash
# Apply the range reservation
calicoctl apply -f reserve-ip-range.yaml

# Verify reservations are in place
calicoctl get ipreservations -o yaml
```

## Step 4: Use Reservations with Multiple IP Pools

Apply reservations to specific pools in multi-pool configurations.

```yaml
# reserve-in-specific-pool.yaml
# Reserve gateway IPs from the production pool
apiVersion: projectcalico.org/v3
kind: IPReservation
metadata:
  name: production-gateway-reservation
spec:
  reservedCIDRs:
  # Reserve the first IP in each /26 block for potential gateway use
  # 192.168.0.0/26: reserve .0 (network) and .63 (broadcast are auto-reserved)
  # Additionally reserve .1 and .2 for ingress gateway static IPs
  - "192.168.0.1/32"
  - "192.168.0.2/32"
  - "192.168.64.1/32"
  - "192.168.64.2/32"
  - "192.168.128.1/32"
  - "192.168.128.2/32"
```

## Step 5: Verify Reservation Prevents Allocation

Test that reserved IPs are not assigned to pods.

```bash
# Deploy many pods to drive IP allocation
kubectl run load-test --image=busybox --replicas=20 -- sleep 3600

# Verify none of the reserved IPs were assigned
kubectl get pods -o wide | awk '{print $6}' | grep -E "^192\.168\." | sort -V

# The reserved IPs (192.168.0.1, 192.168.0.2, etc.) should NOT appear
# in the pod IP list regardless of how many pods are running

# Check IPAM to confirm reserved IPs show as "reserved"
calicoctl ipam show --show-blocks | grep -E "reserved|Reserved"
```

## Best Practices

- Create IP reservations before the addresses are ever allocated — reserving already-assigned IPs does not reclaim them
- Document IP reservations with descriptive names explaining why each IP is reserved
- Combine IP reservations with static pod IP annotations for comprehensive IP management
- Review and clean up stale IPReservations when the hardware or service they protected is decommissioned
- Reserve a consistent number of IPs at the start of each pool block to ensure infrastructure IPs are available on new nodes

## Conclusion

Calico IP reservations provide a clean mechanism to keep specific addresses out of the pod IP allocation pool without splitting your IP pool CIDR. By reserving addresses for infrastructure services, static virtual IPs, and known-conflict addresses before they can be allocated to pods, you maintain control over your cluster's IP addressing and prevent hard-to-diagnose conflicts between pod IPs and non-Kubernetes services sharing the same network segment.
