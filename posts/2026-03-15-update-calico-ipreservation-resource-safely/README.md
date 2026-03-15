# How to Update the Calico IPReservation Resource Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, IPReservation, Kubernetes, Networking, IPAM, Migration, DevOps

Description: Safely update Calico IPReservation resources to add or remove reserved IPs without causing allocation conflicts.

---

## Introduction

IPReservation resources need to be updated as your network evolves. New infrastructure components may require reserved IPs, decommissioned systems may free up addresses, or IP planning changes may require adjusting reserved ranges. Each update must be handled carefully to avoid creating conflicts with already-allocated pod IPs.

The key risk when updating reservations is the timing between removing a reservation and existing allocations. If you remove a reservation while a pod already has that IP through a different mechanism, you may create a silent conflict when Calico later assigns the same IP to another pod.

This guide covers safe procedures for adding, removing, and reorganizing IPReservation resources in a running cluster.

## Prerequisites

- A Kubernetes cluster with Calico installed (v3.22 or later)
- `kubectl` and `calicoctl` configured with cluster admin access
- Existing IPReservation resources in your cluster
- A record of which IPs are in use by external systems

## Adding New Reserved IPs

Adding IPs to an existing reservation is the safest operation. No running pods are affected:

```bash
# Back up the current reservation
calicoctl get ipreservation infrastructure-reservations -o yaml > reservation-backup.yaml
```

Update the reservation to include new IPs:

```yaml
apiVersion: projectcalico.org/v3
kind: IPReservation
metadata:
  name: infrastructure-reservations
spec:
  reservedCIDRs:
    - 10.244.0.1/32
    - 10.244.0.2/32
    - 10.244.0.3/32
    - 10.244.0.10/32
    - 10.244.0.11/32
    - 10.244.0.20/32
    - 10.244.0.21/32
```

Apply the update:

```bash
calicoctl apply -f reservation-updated.yaml
```

If any pods already hold newly reserved IPs, they keep those IPs until they restart. New pods will not receive those IPs.

## Checking for Conflicts Before Adding Reservations

Before reserving an IP, check whether it is already allocated:

```bash
# Check if a specific IP is currently assigned
calicoctl ipam show --ip=10.244.0.20

# Find all pod IPs in the cluster
kubectl get pods -A -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name}{"\t"}{.status.podIP}{"\n"}{end}' | grep "10.244.0.20"
```

If the IP is already allocated to a pod, you have two options:

1. Add the reservation and restart the affected pod so it gets a new IP
2. Wait for the pod to naturally terminate before adding the reservation

## Removing Reserved IPs Safely

Removing IPs from a reservation makes them available for pod allocation. Verify the IP is no longer needed externally:

```bash
# Verify the IP is not in use externally
ping -c 3 10.244.0.3
arping -c 3 10.244.0.3
```

Then update the reservation:

```yaml
apiVersion: projectcalico.org/v3
kind: IPReservation
metadata:
  name: infrastructure-reservations
spec:
  reservedCIDRs:
    - 10.244.0.1/32
    - 10.244.0.2/32
    - 10.244.0.10/32
    - 10.244.0.11/32
```

```bash
calicoctl apply -f reservation-reduced.yaml
```

## Splitting Reservations for Better Organization

Reorganize a single large reservation into multiple purpose-specific ones:

```bash
# Step 1: Create the new specific reservations first
cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: IPReservation
metadata:
  name: gateway-reservations
spec:
  reservedCIDRs:
    - 10.244.0.1/32
    - 10.244.64.1/32
---
apiVersion: projectcalico.org/v3
kind: IPReservation
metadata:
  name: dns-reservations
spec:
  reservedCIDRs:
    - 10.244.0.10/32
    - 10.244.0.11/32
EOF

# Step 2: Delete the old combined reservation
calicoctl delete ipreservation infrastructure-reservations
```

Always create the new reservations before deleting the old one to ensure continuous protection.

## Replacing a Reservation Entirely

When you need to overwrite all reserved CIDRs:

```bash
# Back up first
calicoctl get ipreservation load-balancer-vips -o yaml > lb-vips-backup.yaml

# Apply the replacement
cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: IPReservation
metadata:
  name: load-balancer-vips
spec:
  reservedCIDRs:
    - 10.244.100.0/27
EOF
```

This replaces the previous /28 range with a /27 range, doubling the reserved space.

## Verification

After any update, verify the reservation state:

```bash
# List all active reservations
calicoctl get ipreservations -o yaml

# Verify IPAM respects the changes
calicoctl ipam show

# Test allocation avoids reserved IPs
for i in $(seq 1 5); do
  kubectl run test-$i --image=busybox --restart=Never -- sleep 60
done
kubectl get pods -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.podIP}{"\n"}{end}' | grep test-

# Clean up test pods
kubectl delete pod -l run --field-selector=status.phase=Succeeded
```

## Troubleshooting

- If removing a reservation causes IP conflicts, immediately re-add the reservation and investigate which external system holds the IP
- When splitting reservations, always apply new ones before deleting old ones to avoid a gap
- Use `calicoctl ipam show --ip=<address>` to check the allocation status of any specific IP
- If reserved IPs appear in pod assignments, check that the IPReservation resource applied successfully with `calicoctl get ipreservation <name> -o yaml`
- Keep backups of all reservation configs in version control for audit and rollback purposes

## Conclusion

Updating Calico IPReservation resources is straightforward when you follow the principle of additive changes first. Always add new reservations before removing old ones, verify IPs are not in use before unreserving them, and maintain backups for rollback. Organizing reservations by purpose makes ongoing maintenance more manageable as your network infrastructure evolves.
