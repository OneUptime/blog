# How to Configure Ceph RGW Master and Secondary Zones

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Zone, Multisite, Object Storage

Description: Learn how to configure Ceph RGW master and secondary zones in Rook, including zone promotion, demotion, and failover procedures for multi-site object storage.

---

## Master vs Secondary Zone

In Ceph RGW multisite:
- **Master zone**: handles metadata operations (bucket creation, user management)
- **Secondary zone**: replicates data and metadata from the master zone

Only one master zone exists per zone group. Secondary zones sync both data and metadata from the master.

## Configuring the Master Zone

When creating the first zone in a zone group, designate it as master:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin zone create \
  --rgw-zonegroup=us \
  --rgw-zone=us-east \
  --master \
  --default \
  --endpoints=http://rgw-us-east:80

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin zonegroup modify \
  --rgw-zonegroup=us \
  --master-zone=us-east

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin period update --commit
```

## Adding the Secondary Zone

On the secondary cluster, add the zone without `--master`:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin zone create \
  --rgw-zonegroup=us \
  --rgw-zone=us-west \
  --access-key=sync-access-key \
  --secret-key=sync-secret-key \
  --endpoints=http://rgw-us-west:80

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin period update --commit
```

## Verifying Zone Configuration

```bash
# View zone group details
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin zonegroup get --rgw-zonegroup=us

# Verify master zone assignment
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin zonegroup get | python3 -c \
  "import sys,json; d=json.load(sys.stdin); print('Master zone:', d['master_zone'])"
```

## Promoting a Secondary Zone to Master

Required during planned failover when the primary data center goes offline:

```bash
# On the cluster hosting us-west
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin zone modify \
  --rgw-zone=us-west \
  --master

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin zonegroup modify \
  --rgw-zonegroup=us \
  --master-zone=us-west

# Commit with --yes-i-really-mean-it when master is unavailable
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin period update --commit \
  --yes-i-really-mean-it
```

## Restoring the Original Master

After the primary data center recovers:

```bash
# Re-sync us-east from the new master us-west
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin zone modify \
  --rgw-zone=us-east \
  --access-key=sync-access-key \
  --secret-key=sync-secret-key

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin period pull \
  --url=http://rgw-us-west:80 \
  --access-key=sync-access-key \
  --secret-key=sync-secret-key

# After sync completes, optionally re-promote us-east
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin zone modify --rgw-zone=us-east --master

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin zonegroup modify \
  --rgw-zonegroup=us \
  --master-zone=us-east

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin period update --commit
```

## Summary

Ceph RGW master and secondary zones define which cluster handles metadata authority. Zone promotion enables planned and emergency failover. After a failover event, re-syncing and optionally restoring the original master requires careful sequencing to avoid data inconsistency between zones.
