# How to Handle Ceph Recovery When Datacenter is Lost

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Disaster Recovery, Datacenter, Multi-Site, Storage

Description: Learn how to handle Ceph cluster recovery when an entire datacenter is lost, covering single-site failures, multi-site replication, and failover strategies.

---

## Single-Site vs. Multi-Site Ceph

Recovery strategy after losing a datacenter depends entirely on your architecture:

- **Single-site cluster**: All data is in one datacenter. Losing it means total data loss unless backups or replicas exist elsewhere.
- **Stretch cluster**: Monitors and OSDs span two datacenters with a tiebreaker. One datacenter loss is survivable.
- **Multi-site RGW**: Object storage replicated between sites via zone groups.

## Single-Site Failure: Assessment

If your Ceph cluster was in a single datacenter that is now unavailable:

```bash
# Check if any monitors are reachable
ceph mon stat

# If no response, the cluster is inaccessible
```

Recovery options:
1. Wait for the datacenter to be restored (power, network, hardware)
2. Restore from offsite backups
3. Failover to a DR site if pre-provisioned

## Stretch Cluster Failover

For clusters configured as stretch clusters with dual-datacenter topology:

```bash
# Check stretch mode status
ceph osd dump | grep stretch

# If one site is lost and tiebreaker mon is available:
ceph mon set_location mon-tiebreaker datacenter=arbiter
```

After datacenter B fails, the cluster automatically enters degraded stretch mode if the tiebreaker monitor is reachable:

```bash
# Cluster enters degraded stretch mode automatically
# Verify cluster status - expect HEALTH_WARN with stretch mode degraded
ceph -s

# Confirm monitors still have quorum
ceph mon stat

# Check OSD status for the surviving datacenter
ceph osd tree
```

## Multi-Site RGW Failover

For object storage with multi-site zones configured:

```bash
# Check zone health
radosgw-admin zone get
radosgw-admin sync status
```

Fail over to the secondary zone:

```bash
# On secondary site, promote zone and zonegroup to master
radosgw-admin zone modify --rgw-zone=secondary --master
radosgw-admin zonegroup modify --rgw-zonegroup=default --master
radosgw-admin period update --commit
```

Update DNS or load balancer to point to secondary RGW endpoints.

## RBD Mirroring Failover

For block storage with RBD mirroring between sites:

```bash
# Check mirroring status
rbd mirror pool status replicapool

# On secondary site, promote primary images
rbd mirror image promote replicapool/myimage --force
```

Verify image is writable:

```bash
rbd info replicapool/myimage | grep mirroring
```

## Rebuilding After Datacenter Recovery

When the lost datacenter comes back online:

```bash
# For stretch cluster, re-integrate lost site
ceph osd crush add-bucket datacenter-b datacenter
ceph osd crush move node-b1 root=default datacenter=datacenter-b

# Verify CRUSH map
ceph osd crush tree
```

Let recovery proceed:

```bash
ceph osd set noout
# Bring up OSDs gradually
ceph osd in osd.<id>
watch -n 5 ceph -s
ceph osd unset noout
```

## Rook Stretch Cluster Configuration

Configure a stretch cluster in Rook:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  mon:
    count: 5
    stretchCluster:
      failureDomainLabel: topology.kubernetes.io/zone
      subFailureDomain: host
      zones:
      - name: zone-a
        arbiter: false
      - name: zone-b
        arbiter: false
      - name: zone-c
        arbiter: true
```

## Summary

Surviving a datacenter loss requires advance preparation - either through stretch clusters, multi-site RGW zones, or RBD mirroring. Single-site clusters without off-site replication face complete data loss when their datacenter is destroyed. After recovery, gradually reintegrating the lost site using `noout` flags and CRUSH map updates allows controlled data rebalancing. Rook's stretch cluster support enables declarative multi-datacenter resilience in Kubernetes environments.
