# Troubleshoot IP Reservation in Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, IPAM, IP Reservation, Networking, Troubleshooting

Description: A guide to diagnosing and resolving issues with IP address reservation in Calico IPAM, covering reserved IP ranges, annotation-based reservations, and conflicts with reserved addresses.

---

## Introduction

Calico's IPAM system allows specific IP addresses to be reserved so they are never assigned to pods. This is useful for reserving IPs for infrastructure services (like load balancers), avoiding conflicts with existing network equipment, or maintaining consistent IPs for specific workloads that external systems depend on.

When IP reservation is misconfigured or IP conflicts occur, symptoms range from pods receiving unexpected IP addresses to pod startup failures if all available IPs are either reserved or allocated. Reserved IPs that overlap with active pod assignments or external infrastructure can cause conflicts that are difficult to diagnose without understanding Calico's reservation model.

This guide covers how to configure, inspect, and troubleshoot IP reservations in Calico.

## Prerequisites

- `calicoctl` CLI installed
- `kubectl` access to the cluster
- Calico 3.21 or later with Calico IPAM

## Step 1: Check Current IP Reservations

Calico supports IP reservations through the `IPReservation` resource (Calico 3.21+). Start by listing all active reservations.

List current IP reservations:

```bash
# List all IPReservation resources (Calico 3.21+)

calicoctl get ipreservation -o yaml

# Confirm the IP pools that Calico IPAM is allocating from
calicoctl get ippool -o yaml

# Show the full IPAM allocation to see which IPs are in use
calicoctl ipam show --show-blocks
```

## Step 2: Create an IP Reservation for Infrastructure IPs

If IP reservations are missing and pods are receiving IPs that conflict with infrastructure, create IPReservation resources to exclude those addresses from allocation.

Reserve a specific IP range from Calico IPAM:

```yaml
# ip-reservation.yaml - Reserve IPs used by infrastructure components
apiVersion: projectcalico.org/v3
kind: IPReservation
metadata:
  name: infrastructure-ips
spec:
  reservedCIDRs:
    # Reserve the first 8 IPs in the pool for infrastructure use
    - "10.244.0.0/29"
    # Reserve a specific IP used by a load balancer
    - "10.244.100.50/32"
```

```bash
# Apply the IP reservation
calicoctl apply -f ip-reservation.yaml

# Verify the reservation was created
calicoctl get ipreservation infrastructure-ips -o yaml
```

## Step 3: Resolve Conflicts Between Reserved and Allocated IPs

If an IP was allocated to a pod before a reservation was created, a conflict exists. Calico will not automatically reclaim the IP - the pod must be restarted to receive a new address.

Identify and resolve IP conflicts:

```bash
# Check which pods currently hold IPs that are in the reserved range
kubectl get pods -A -o json | jq -r '.items[] | select(.status.podIP != null) | select(.status.podIP | test("^10\\.244\\.0\\.[0-7]$|^10\\.244\\.100\\.50$")) | "\(.metadata.namespace)/\(.metadata.name) \(.status.podIP)"'

# Check IPAM allocation for specific IPs that should be reserved
calicoctl ipam show --ip=10.244.0.5
calicoctl ipam show --ip=10.244.100.50

# Check IPAM datastore consistency against Kubernetes
calicoctl ipam check

# For a conflicting pod, delete and let it restart with a new IP
kubectl delete pod <pod-name> -n <namespace>

# After restart, verify the pod received a non-reserved IP
kubectl get pod <pod-name> -n <namespace> -o wide
```

## Step 4: Verify Pod IP Assignment Respects Reservations

After applying reservations, confirm that new pods do not receive reserved IPs.

Test IP assignment with reservations in place:

```bash
# Deploy a test pod and check its assigned IP
kubectl run reservation-test --image=nginx --restart=Never
kubectl get pod reservation-test -o wide

# Confirm the assigned IP is outside all reserved ranges
ASSIGNED_IP=$(kubectl get pod reservation-test -o jsonpath='{.status.podIP}')
echo "Assigned IP: $ASSIGNED_IP"

# Check that the assigned IP is not in any reserved CIDR
calicoctl get ipreservation -o yaml | grep -A5 "reservedCIDRs"

# Clean up test pod
kubectl delete pod reservation-test
```

## Best Practices

- Create IP reservations before deploying workloads that depend on specific IPs to avoid conflict cleanup
- Keep reservations small; reserving a significant portion of an IP pool can make Calico slower when searching for free IPAM blocks
- Use `IPReservation` resources (Calico 3.21+) rather than relying on manual cleanup or out-of-band tracking
- Document all IP reservations and their purpose in your network infrastructure runbook
- Monitor IPAM utilization closely after adding reservations to ensure sufficient IPs remain available

## Conclusion

IP reservations in Calico prevent specific addresses from being assigned to pods, protecting infrastructure IPs from accidental use. When reservations conflict with existing pod assignments, systematic identification of conflicting pods and their restart resolves the issue. Creating reservations proactively before deploying infrastructure components is the most reliable approach to avoiding IP conflicts in Calico-managed clusters.
