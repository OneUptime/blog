# Migrate IP Reservation in Calico Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: calico, ipam, ip-reservation, kubernetes, migration, networking, ip-management

Description: Learn how to safely migrate IP reservations in Calico when changing reserved CIDR ranges, moving to a new IP pool, or restructuring your IP reservation strategy.

---

## Introduction

Calico's IPReservation resource prevents specific IP addresses from being allocated to pods, protecting reserved IPs for infrastructure services, monitoring agents, or external integrations. When migrating IP pools or restructuring your network, reserved IPs often need to change too.

Migrating IP reservations incorrectly can result in Calico assigning reserved IPs to pods, causing conflicts with the services that depend on those IPs. A safe migration ensures that old reservations remain in place while new ones are established, with a validation step before removing the old reservations.

This guide covers auditing current IP reservations, creating new reservations for a migrated IP pool, and safely transitioning between reservation sets.

## Prerequisites

- Kubernetes cluster with Calico v3.x
- `calicoctl` CLI configured
- Documentation of which IPs are reserved and why
- Cluster admin permissions

## Step 1: Audit Current IP Reservations

Review all existing IP reservations to understand what is being protected and for what reason.

```bash
# List all current IP reservations
calicoctl get ipreservation -o yaml

# Check which IPs in the reservations are currently in use vs. truly reserved
calicoctl ipam show --show-blocks

# Cross-reference reservations with running services
kubectl get services --all-namespaces -o wide | grep -E "ExternalIP|ClusterIP"
```

## Step 2: Plan the New Reservation Set

Map old reserved IPs to their equivalents in the new IP pool, documenting the purpose of each reservation.

```yaml
# Reference: IP reservation migration mapping
#
# OLD POOL: 10.244.0.0/16
#   10.244.0.1    - Gateway / router (DO NOT ALLOCATE)
#   10.244.0.2    - DNS resolver
#   10.244.0.10   - Monitoring agent (Prometheus node exporter)
#   10.244.255.254 - Broadcast (DO NOT ALLOCATE)
#
# NEW POOL: 172.16.0.0/16
#   172.16.0.1    - Gateway / router (DO NOT ALLOCATE)
#   172.16.0.2    - DNS resolver
#   172.16.0.10   - Monitoring agent
#   172.16.255.254 - Broadcast (DO NOT ALLOCATE)
```

## Step 3: Create New IP Reservations for the New Pool

Before migrating workloads, establish the reservations for the new pool so Calico never allocates those IPs.

```yaml
# calico-ipam/new-ip-reservations.yaml - IP reservations for the new pool CIDR
apiVersion: projectcalico.org/v3
kind: IPReservation
metadata:
  name: new-pool-reservations
spec:
  reservedCIDRs:
    # Reserve gateway IP in the new pool
    - "172.16.0.1/32"
    # Reserve DNS resolver IP
    - "172.16.0.2/32"
    # Reserve the monitoring agent IP
    - "172.16.0.10/32"
    # Reserve the broadcast address
    - "172.16.255.254/32"
    # Reserve the entire first /27 for infrastructure services
    - "172.16.0.0/27"
```

```bash
# Apply the new IP reservations
calicoctl apply -f new-ip-reservations.yaml

# Verify the reservations are in effect
calicoctl get ipreservation -o yaml
```

## Step 4: Migrate Workloads and Validate

After establishing reservations in the new pool, migrate workloads and verify that reserved IPs are not being allocated.

```bash
# Deploy a test pod to verify it does NOT receive a reserved IP
kubectl run ipam-test --image=busybox --restart=Never -- sleep 60

# Check the pod's IP address
kubectl get pod ipam-test -o jsonpath='{.status.podIP}'

# Verify the IP is not in the reserved ranges
# It should NOT be 172.16.0.1, 172.16.0.2, 172.16.0.10, etc.

# Attempt to manually allocate a reserved IP to confirm it is blocked
calicoctl ipam check --show-problem-ips

# Clean up
kubectl delete pod ipam-test
```

## Step 5: Remove Old IP Reservations

After all workloads have migrated to the new pool and the old pool is deleted, remove the old reservations.

```bash
# Confirm no pods are still using IPs from the old pool
calicoctl ipam show --show-blocks | grep "10.244"

# Delete the old IP reservations only after old pool is removed
calicoctl delete ipreservation old-pool-reservations

# Verify only the new reservations remain
calicoctl get ipreservation -o yaml
```

## Best Practices

- Document the purpose of every IP reservation so future engineers understand why certain IPs are protected
- Create new reservations before disabling old pools to prevent race conditions during allocation
- Use CIDR notation (e.g., `/27`) to reserve entire ranges rather than listing individual addresses when protecting infrastructure subnets
- Reserve network and broadcast addresses in every IP pool to prevent Calico from allocating unusable addresses
- Run `calicoctl ipam check` after migration to confirm no reserved IPs were accidentally allocated
- Store IP reservation YAML in Git and manage it with Flux CD for version control and audit trails

## Conclusion

Safely migrating Calico IP reservations requires creating new reservations before decommissioning old ones and validating that Calico respects the reservations before completing the migration. This defensive approach ensures that infrastructure services depending on reserved IPs are never disrupted by accidental IPAM allocation during network migrations.
