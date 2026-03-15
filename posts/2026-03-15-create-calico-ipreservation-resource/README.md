# How to Create the Calico IPReservation Resource

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, IPReservation, Kubernetes, Networking, IPAM, IP Management

Description: Learn how to create Calico IPReservation resources to reserve specific IP addresses and prevent them from being assigned to pods.

---

## Introduction

The IPReservation resource in Calico allows you to reserve specific IP addresses or CIDR ranges so they are never assigned to pods by the Calico IPAM. This is essential when certain IPs within your pool CIDR are already in use by external systems, load balancers, or legacy infrastructure.

Without IP reservations, Calico may assign an IP that conflicts with an existing device on your network. This leads to connectivity failures that are difficult to diagnose because the conflict may not be immediately apparent.

This guide covers creating IPReservation resources for various scenarios, from reserving single addresses to blocking entire ranges within your IPPool CIDRs.

## Prerequisites

- A Kubernetes cluster with Calico installed (v3.22 or later for IPReservation support)
- `kubectl` and `calicoctl` configured with cluster admin access
- An existing IPPool configured in your cluster
- Knowledge of which IPs need to be excluded from pod allocation

## Understanding IPReservation Fields

The IPReservation resource has a straightforward spec:

- **metadata.name**: A unique name for the reservation
- **spec.reservedCIDRs**: A list of CIDRs or individual IPs (as /32 or /128) to reserve

Reserved IPs must fall within an existing IPPool CIDR to have any effect.

## Reserving Individual IP Addresses

To reserve specific IPs that are used by network infrastructure:

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
```

Apply the reservation:

```bash
calicoctl apply -f ip-reservation.yaml
```

## Reserving a CIDR Range

When a range of IPs is used by external systems, reserve the entire block:

```yaml
apiVersion: projectcalico.org/v3
kind: IPReservation
metadata:
  name: external-services-range
spec:
  reservedCIDRs:
    - 10.244.1.0/24
    - 10.244.2.0/25
```

This prevents Calico from assigning any of the 384 IPs in these two ranges to pods.

## Reserving Gateway and DNS Addresses

Network gateways and DNS servers often use predictable IPs that must be protected:

```yaml
apiVersion: projectcalico.org/v3
kind: IPReservation
metadata:
  name: network-infra-reservations
spec:
  reservedCIDRs:
    - 10.244.0.1/32
    - 10.244.64.1/32
    - 10.244.128.1/32
    - 10.244.0.10/32
    - 10.244.0.11/32
```

## Multiple Reservations for Different Purposes

Organize reservations by purpose using separate resources:

```yaml
apiVersion: projectcalico.org/v3
kind: IPReservation
metadata:
  name: load-balancer-vips
spec:
  reservedCIDRs:
    - 10.244.100.0/28
---
apiVersion: projectcalico.org/v3
kind: IPReservation
metadata:
  name: database-static-ips
spec:
  reservedCIDRs:
    - 10.244.50.10/32
    - 10.244.50.11/32
    - 10.244.50.12/32
---
apiVersion: projectcalico.org/v3
kind: IPReservation
metadata:
  name: monitoring-range
spec:
  reservedCIDRs:
    - 10.244.200.0/26
```

Apply all at once:

```bash
calicoctl apply -f reservations/
```

## Reserving IPs in IPv6 Pools

IPReservation works with IPv6 addresses as well:

```yaml
apiVersion: projectcalico.org/v3
kind: IPReservation
metadata:
  name: ipv6-infrastructure
spec:
  reservedCIDRs:
    - fd00:10:244::1/128
    - fd00:10:244::2/128
    - fd00:10:244:1::/96
```

## Verification

Confirm your reservations are active:

```bash
# List all reservations
calicoctl get ipreservations -o wide

# View details of a specific reservation
calicoctl get ipreservation infrastructure-reservations -o yaml

# Check IPAM to verify reserved IPs are excluded
calicoctl ipam show

# Test that a reserved IP is not assigned
kubectl run test-pod --image=busybox --restart=Never -- sleep 3600
kubectl get pod test-pod -o jsonpath='{.status.podIP}'
```

Verify the assigned IP does not fall within any reserved range.

## Troubleshooting

- If a pod receives a reserved IP, the reservation may have been created after the IP was already allocated. Restart the pod to trigger reallocation
- Verify the reserved CIDR falls within an active IPPool using `calicoctl get ippools -o wide`
- Check for typos in CIDR notation. A /32 reserves one IP while a /24 reserves 256
- If reservations seem ignored, verify your Calico version supports IPReservation (v3.22+)
- List all current allocations to find conflicts: `calicoctl ipam show --show-blocks`

## Conclusion

Calico IPReservation resources provide a clean way to prevent IP conflicts between pod allocations and existing network infrastructure. By organizing reservations into logical groups and applying them before deploying workloads, you ensure that Calico IPAM never assigns an IP that belongs to another system. Review your network inventory and create reservations for all known static IPs within your pool CIDRs.
