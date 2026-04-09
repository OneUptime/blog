# How to Set Up Failure Domains for Stretch Clusters in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, StretchCluster, FailureDomain, CRUSH

Description: Configure CRUSH failure domains for Rook-Ceph stretch clusters so data replicas are distributed across two datacenters and pools remain writable after a full-site failure.

---

## Failure Domains in a Stretch Context

Standard Ceph replication spreads data across hosts or racks. In a stretch cluster, the primary failure domain is the entire datacenter. Losing one datacenter must not cause data loss or make the cluster read-only (given the arbiter ensures quorum).

Achieving this requires configuring both the CRUSH hierarchy and the pool replication policy to treat each datacenter as an independent failure domain.

## CRUSH Hierarchy for Stretch Clusters

After deploying the stretch cluster with properly labeled nodes, verify the CRUSH hierarchy reflects the two-site layout:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd tree
```

The expected hierarchy:

```text
ID   CLASS  WEIGHT   TYPE NAME
-1          200.000  root default
-10         100.000      datacenter datacenter-a
 -3          50.000          host dc1-node-1
  0  hdd     50.000              osd.0
 -4          50.000          host dc1-node-2
  1  hdd     50.000              osd.1
-11         100.000      datacenter datacenter-b
 -5          50.000          host dc2-node-1
  2  hdd     50.000              osd.2
 -6          50.000          host dc2-node-2
  3  hdd     50.000              osd.3
```

## Creating the Stretch CRUSH Rule

Create a CRUSH rule that places replicas across datacenters:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash
```

```bash
ceph osd crush rule create-replicated stretch-replicated default datacenter
```

This rule starts at the `default` root and distributes replicas across distinct `datacenter` buckets, selecting leaf OSDs within each.

## Pool Configuration for Stretch

Create pools with the stretch rule and appropriate size settings:

```bash
ceph osd pool create rbd-stretch 32 replicated stretch-replicated
ceph osd pool set rbd-stretch size 4
ceph osd pool set rbd-stretch min_size 2
```

`size: 4` places two replicas per datacenter. `min_size: 2` allows writes when one datacenter is offline - the surviving site still has 2 of 4 replicas available, meeting the minimum.

## CephBlockPool CRD with Stretch Failure Domain

Define stretch pools through the CephBlockPool CRD:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: stretch-block-pool
  namespace: rook-ceph
spec:
  failureDomain: datacenter
  replicated:
    size: 4
    requireSafeReplicaSize: true
    replicasPerFailureDomain: 2
    subFailureDomain: host
  deviceClass: hdd
```

`replicasPerFailureDomain: 2` explicitly places two replicas in each datacenter. `subFailureDomain: host` ensures those two replicas land on different hosts within the datacenter.

## Verifying Pool Failure Domain

Confirm the pool uses the correct CRUSH rule:

```bash
ceph osd pool get stretch-block-pool crush_rule
ceph osd crush rule dump stretch-replicated
```

The rule dump should show `step chooseleaf firstn 0 type datacenter` confirming datacenter-level replica separation.

## Testing Datacenter Failure

Simulate a datacenter outage by setting the OSDs in one site `out`:

```bash
ceph osd out osd.2 osd.3
```

Verify the cluster remains writable from the surviving datacenter and that health shows degraded but not down:

```bash
ceph health detail
```

Bring OSDs back in after testing:

```bash
ceph osd in osd.2 osd.3
```

## Summary

Stretch cluster failure domains in Rook require aligning the CRUSH hierarchy, CRUSH rules, and pool configuration to treat each datacenter as an independent replication target. Using `replicasPerFailureDomain: 2` with `subFailureDomain: host` ensures two replicas in each site on separate hosts, providing both datacenter-level and host-level fault tolerance simultaneously.
