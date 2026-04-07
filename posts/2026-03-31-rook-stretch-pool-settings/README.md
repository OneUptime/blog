# How to Configure Stretch Pool Settings in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Pool, Stretch Cluster, High Availability

Description: Configure stretch pool settings in Ceph for multi-site or multi-zone deployments to ensure data availability across failure domains.

---

Ceph stretch cluster mode enables data to survive the loss of an entire datacenter site. Stretch pools use a specialized CRUSH rule that distributes data across two distinct zones, ensuring reads and writes can continue even if one zone becomes completely unavailable.

## Prerequisites for Stretch Pools

Stretch cluster mode requires:
- Exactly two datacenters (or availability zones)
- A tiebreaker monitor in a third site or separate failure domain
- Minimum 2 OSDs per datacenter
- Ceph Pacific (16.x) or later

## Configure the Stretch Cluster

First, set up the CRUSH map with two datacenter buckets and a tiebreaker monitor:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- bash -c "
  # Create datacenter CRUSH buckets
  ceph osd crush add-bucket datacenter1 datacenter
  ceph osd crush add-bucket datacenter2 datacenter

  # Move hosts into their respective datacenters
  ceph osd crush move host1 datacenter=datacenter1
  ceph osd crush move host2 datacenter=datacenter1
  ceph osd crush move host3 datacenter=datacenter2
  ceph osd crush move host4 datacenter=datacenter2
"
```

## Enable Stretch Mode

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph mon enable-msgr2

kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph mon set_location <tiebreaker-mon-name> datacenter=tiebreaker

kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph mon enable_stretch_mode <tiebreaker-mon-name> \
  stretch_rule datacenter
```

## Configure a Stretch Pool via Rook

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: stretch-pool
  namespace: rook-ceph
spec:
  failureDomain: datacenter
  replicated:
    size: 4
    requireSafeReplicaSize: true
    replicasPerFailureDomain: 2
    subFailureDomain: host
  stretchCluster:
    failureDomainLabel: datacenter
    subFailureDomain: host
    zones:
    - name: datacenter1
      arbiter: false
    - name: datacenter2
      arbiter: false
```

Key fields:
- `replicasPerFailureDomain: 2` - two replicas in each datacenter
- `subFailureDomain: host` - within each DC, replicas go to different hosts
- `size: 4` - total of 4 replicas (2 per DC)

## Verify Stretch Pool CRUSH Rule

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd crush rule dump stretch_rule
```

## Check Stretch Mode Status

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd dump | grep stretch_mode
```

## Monitor Cross-Datacenter Replication

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph pg ls | grep -E "(active|degraded)" | head -20
```

If one datacenter goes offline, pools should enter a `degraded` but still `active` state:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph health detail
```

Expected output during partial outage:

```text
HEALTH_WARN
    1/2 sites down; cluster is degraded
    Degraded data redundancy
```

## Summary

Stretch pool settings in Ceph distribute replicas across two failure domains (datacenters) to survive complete site failures. Configure the stretch cluster mode with datacenter CRUSH buckets and a tiebreaker monitor, then create pools with `replicasPerFailureDomain` set to the desired replicas per site. Monitor with `ceph health detail` to detect site-level outages.
