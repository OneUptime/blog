# How to Configure Network-Based Access Control (CIDR) in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Network

Description: Learn how to restrict Ceph user access to specific network address ranges using CIDR notation in capability strings for additional security in Rook clusters.

---

## Network-Based Access Control in CephX

CephX supports an optional network restriction in capability strings that limits which client IP addresses can use a given set of permissions. This adds a network-layer control on top of the key-based authentication, so even if a key is stolen, it can only be used from authorized IP ranges.

This is configured in the OSD capability string using CIDR notation.

## Syntax for Network Restrictions

The network restriction is appended to the capability string using the `network` keyword:

```bash
ceph auth get-or-create client.restricted-net \
  mon 'allow r' \
  osd 'allow rw pool=mypool network 192.168.1.0/24'
```

This user can only access `mypool` from IP addresses within the `192.168.1.0/24` subnet.

## Combining Network and Pool Restrictions

You can combine pool restrictions, namespace restrictions, and network restrictions:

```bash
ceph auth get-or-create client.secure-app \
  mon 'allow r' \
  osd 'allow rw pool=apppool network 10.0.1.0/24'
```

## Multiple Network Rules

To allow access from multiple subnets with different permissions:

```bash
ceph auth get-or-create client.multi-net \
  mon 'allow r' \
  osd 'allow rw pool=data network 10.0.1.0/24, allow r pool=data network 10.0.2.0/24'
```

The first rule grants full read-write access from `10.0.1.0/24`, while the second grants read-only access from `10.0.2.0/24`.

## Use Cases in Rook Environments

Network-based access control is useful in Kubernetes environments where:

- Compute nodes (Kubernetes workers) are on one subnet and should have read-write access
- Management nodes are on a different subnet and should have read-only access
- External clients on a DMZ subnet should have limited pool access

## Kubernetes Pod CIDR Considerations

In Kubernetes, pod IP addresses come from the pod CIDR range configured for the cluster. When using Rook with network-based caps, find the pod CIDR:

```bash
kubectl cluster-info dump | grep -m1 cluster-cidr
```

Then configure the cap to allow that range:

```bash
ceph auth get-or-create client.k8s-app \
  mon 'allow r' \
  osd 'allow rw pool=appdata network 10.244.0.0/16'
```

Where `10.244.0.0/16` is the pod CIDR for your cluster.

## Verifying Network Restrictions

To test a network restriction, attempt to access Ceph from a host outside the allowed CIDR:

```bash
# From an unauthorized host
rados --name client.restricted-net --keyring /tmp/restricted.keyring \
  -p mypool ls
```

Expected error:

```text
error listing mypool: (1) Operation not permitted
```

When connecting from within the authorized CIDR, the command succeeds.

## Current Capability After Setting Network Restriction

Inspect the stored capability to verify the network rule:

```bash
ceph auth get client.restricted-net
```

Sample output:

```text
[client.restricted-net]
    key = AQD...==
    caps mon = "allow r"
    caps osd = "allow rw pool=mypool network 192.168.1.0/24"
```

## Limitations of Network-Based Caps

Network-based caps have some limitations to be aware of:

- The restriction applies to the IP address seen by the OSD or monitor, which may be the node IP in Kubernetes environments, not the pod IP
- With NAT or proxy configurations, the source IP may be the node or load balancer address
- Network policies (Kubernetes NetworkPolicy or Calico) provide complementary and often easier-to-manage network isolation

Consider using network-based caps together with Kubernetes NetworkPolicy for defense in depth.

## Summary

Ceph supports CIDR-based network restrictions in OSD capability strings using the `network` keyword. This adds a second layer of access control - even if a key leaks, it can only be used from authorized IP ranges. In Rook-managed Kubernetes clusters, use the pod CIDR range in the capability string and combine with Kubernetes NetworkPolicy for layered security.
