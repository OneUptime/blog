# Avoid Mistakes When Reserving IPs in Calico IPAM

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, IPAM, Ip-reservation, Kubernetes, Networking, Static-ip

Description: Learn how to correctly reserve specific IP addresses in Calico IPAM to prevent conflicts with infrastructure services, load balancers, and monitoring systems - and avoid the common mistakes that...

---

## Introduction

In most Kubernetes clusters, there are IP addresses within the pod CIDR range that must not be assigned to pods - reserved for infrastructure services, monitoring probes, network appliances, or legacy systems that already use those IPs. Without proper IP reservation in Calico, these addresses may be assigned to pods, causing silent IP conflicts that manifest as intermittent connectivity failures.

Calico provides IP reservation through the `IPAMConfig` resource and the `calicoctl ipam` command, but using it incorrectly leads to reservations not being honored or causing unexpected IPAM behavior. This guide covers the correct approach.

## Prerequisites

- Calico v3.20+ (IPAMConfig support for reservations)
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

## Step 2: Reserve IPs Using `calicoctl ipam`

Use `calicoctl ipam release` with a handle to mark specific IPs as reserved without assigning them to pods.

```bash
# Reserve a specific IP address by allocating it with a reserved handle
# This prevents Calico from assigning this IP to a pod
calicoctl ipam reserve --ip=10.244.0.1 --handle="reserved-lb-vip-01"
calicoctl ipam reserve --ip=10.244.0.2 --handle="reserved-lb-vip-02"
calicoctl ipam reserve --ip=10.244.0.3 --handle="reserved-monitoring"

# Verify the reservations are in place
calicoctl ipam show --show-reserved

# Check a specific IP's allocation status
calicoctl ipam show --ip=10.244.0.1
```

## Step 3: Reserve an Entire IP Range

For larger reservations (e.g., reserving the first /27 of a pool for infrastructure), use a script to reserve each IP.

```bash
#!/bin/bash
# scripts/reserve-ip-range.sh
# Reserves all IPs in a CIDR range from Calico IPAM
# Usage: ./reserve-ip-range.sh <cidr> <handle-prefix>

CIDR="${1:-10.244.0.0/28}"
HANDLE_PREFIX="${2:-reserved-infra}"

# Generate all IPs in the CIDR range using python3
IPS=$(python3 -c "
import ipaddress
network = ipaddress.ip_network('${CIDR}')
for ip in network.hosts():
    print(str(ip))
")

for IP in ${IPS}; do
  HANDLE="${HANDLE_PREFIX}-${IP//./-}"
  echo "Reserving ${IP} with handle ${HANDLE}..."
  calicoctl ipam reserve --ip="${IP}" --handle="${HANDLE}" || \
    echo "WARNING: Could not reserve ${IP} (may already be allocated)"
done

echo "Reservation complete. Verifying..."
calicoctl ipam show --show-reserved
```

## Step 4: Handle Reservations in IP Pool Design

A better long-term approach is to exclude reserved IPs at the IP pool level using `allowedUses`.

```yaml
# ippool-with-exclusion.yaml
# Configure the IP pool to exclude specific ranges using disabledBy annotation
# Note: Calico doesn't support CIDR exclusions natively in IPPool
# The recommended approach is to split pools to avoid problematic ranges

# If IPs 10.244.0.0/28 must be reserved, create the pool starting after that range
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  # Start the pool after the reserved range
  # Reserved: 10.244.0.0/28 (10.244.0.0 - 10.244.0.15)
  # Pod pool: 10.244.0.16/28 to 10.244.255.255
  cidr: 10.244.16.0/20             # Starts after the reserved /28
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

# Show IPAM reservation status
calicoctl ipam show --show-reserved
```

## Best Practices

- Document all reserved IPs in your cluster runbook before reserving them.
- Use meaningful handle names (`reserved-monitoring-prometheus`, not `reserved-1`) to identify the purpose of each reservation.
- Prefer pool design that excludes reserved ranges by CIDR split over individual IP reservation when possible.
- Audit reservations quarterly to release handles for IPs that no longer need to be reserved.
- Add IP reservation as a step in your new cluster setup checklist.

## Conclusion

IP reservation in Calico is a safety mechanism that prevents pod IP conflicts with infrastructure services sharing the pod CIDR space. By using `calicoctl ipam reserve` with named handles, or by designing IP pools that exclude reserved ranges entirely, you protect against the silent conflicts that only manifest as intermittent connectivity failures under load.
