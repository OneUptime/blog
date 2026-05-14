# Avoid Mistakes When Reserving IPs in Calico IPAM

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, IPAM, Ip-reservation, Kubernetes, Networking, Static-ip

Description: Learn how to correctly reserve specific IP addresses in Calico IPAM to prevent conflicts with infrastructure services, load balancers, and monitoring systems - and avoid the common mistakes that...

---

## Introduction

In most Kubernetes clusters, there are IP addresses within the pod CIDR range that must not be assigned to pods - reserved for infrastructure services, monitoring probes, network appliances, or legacy systems that already use those IPs. Without proper IP reservation in Calico, these addresses may be assigned to pods, causing silent IP conflicts that manifest as intermittent connectivity failures.

Calico provides IP reservation through the `IPReservation` resource, but using it incorrectly leads to reservations not being honored or causing unexpected IPAM behavior. This guide covers the correct approach.

## Prerequisites

- Calico v3.20+ (`IPReservation` support for reservations)
- `calicoctl` CLI v3.20+
- A list of IP addresses within your pod CIDR that must be reserved
- `kubectl` with cluster access

## Step 1: Identify IPs That Need to Be Reserved

Before configuring reservations, enumerate all IPs in your pod CIDR that are in use by non-pod workloads.

```bash
# Check which IPs in your pod CIDR are currently allocated

calicoctl ipam show --show-blocks

# Check for external services/appliances using IPs in the pod CIDR range
# (this should not happen in a well-designed network, but exists in legacy setups)
# Scan the pod CIDR for responding hosts
nmap -sn 10.244.0.0/24 | grep "Nmap scan report"

# Check if any Calico IP blocks include IPs used by infrastructure
# For example, if your load balancer uses 10.244.0.1-5, those need to be reserved
```

## Step 2: Reserve IPs Using `IPReservation`

Create an `IPReservation` resource to mark specific IPs as reserved without assigning them to pods.

```yaml
# reserved-infra-ips.yaml
# This prevents Calico from automatically assigning these IPs to pods
apiVersion: projectcalico.org/v3
kind: IPReservation
metadata:
  name: reserved-infra-ips
spec:
  reservedCIDRs:
    - 10.244.0.1/32
    - 10.244.0.2/32
    - 10.244.0.3/32
```

```bash
# Apply the reservation
calicoctl apply -f reserved-infra-ips.yaml

# Verify the reservation resource is in place
calicoctl get ipreservation reserved-infra-ips -o yaml

# Check a specific IP's allocation status
calicoctl ipam show --ip=10.244.0.1
```

## Step 3: Reserve an Entire IP Range

For larger reservations (e.g., reserving the first /27 of a pool for infrastructure), add the CIDR to the same `IPReservation` resource.

```yaml
# reserved-infra-range.yaml
apiVersion: projectcalico.org/v3
kind: IPReservation
metadata:
  name: reserved-infra-range
spec:
  reservedCIDRs:
    - 10.244.0.0/27
```

```bash
calicoctl apply -f reserved-infra-range.yaml
calicoctl get ipreservation reserved-infra-range -o yaml
```

## Step 4: Handle Reservations in IP Pool Design

A better long-term approach is to avoid putting reserved ranges in an automatic workload IP pool at all when the range aligns cleanly with CIDR boundaries.

```yaml
# ippool-with-exclusion.yaml
# Note: Calico doesn't support CIDR exclusions natively in IPPool
# The recommended approach is to split pools to avoid problematic ranges

# If IPs 10.244.0.0/20 must be reserved, create workload pools outside that range
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  # Start the pool after the reserved range
  # Reserved: 10.244.0.0/20 (10.244.0.0 - 10.244.15.255)
  # Pod pool: 10.244.16.0/20 (10.244.16.0 - 10.244.31.255)
  cidr: 10.244.16.0/20             # Starts after the reserved /20
  blockSize: 26
  ipipMode: Never
  vxlanMode: CrossSubnet
  natOutgoing: true
  disabled: false
```

## Step 5: Verify No Conflicts After Reservation

After setting up reservations, verify that no pods have been assigned the reserved IPs.

```bash
# Check if any pod has been assigned a reserved IP
RESERVED_IPS=("10.244.0.1" "10.244.0.2" "10.244.0.3")

for IP in "${RESERVED_IPS[@]}"; do
  CONFLICTING_POD=$(kubectl get pods -A -o wide | grep "${IP}" | awk '{print $1, $2}')
  if [ -n "${CONFLICTING_POD}" ]; then
    echo "CONFLICT: IP ${IP} is assigned to pod: ${CONFLICTING_POD}"
  else
    echo "OK: IP ${IP} is not assigned to any pod"
  fi
done

# Show IP reservation status
calicoctl get ipreservation reserved-infra-ips -o yaml
```

## Best Practices

- Document all reserved IPs in your cluster runbook before reserving them.
- Use meaningful `IPReservation` names (`reserved-monitoring-prometheus`, not `reserved-1`) to identify the purpose of each reservation.
- Prefer pool design that excludes reserved ranges by CIDR split over individual IP reservation when possible.
- Audit reservations quarterly to remove IPs that no longer need to be reserved.
- Add IP reservation as a step in your new cluster setup checklist.

## Conclusion

IP reservation in Calico is a safety mechanism that prevents pod IP conflicts with infrastructure services sharing the pod CIDR space. By using `IPReservation` resources, or by designing IP pools that exclude reserved ranges entirely, you protect against the silent conflicts that only manifest as intermittent connectivity failures under load.
