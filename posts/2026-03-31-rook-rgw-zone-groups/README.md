# How to Configure Zone Groups in Ceph RGW Multisite

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Zone Group, Multisite, Object Storage

Description: Learn how to configure zone groups in Ceph RGW multisite to group geographically co-located zones, define routing policies, and manage inter-region replication.

---

## What Are Zone Groups

Zone groups (formerly regions) represent geographic regions in Ceph's multisite hierarchy. Each zone group:
- Contains one or more zones (individual Ceph clusters)
- Has a master zone that handles metadata writes
- Replicates data between zones within the group

## Creating a Zone Group

```bash
# Create the US zone group
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin zonegroup create \
  --rgw-realm=mycompany \
  --rgw-zonegroup=us \
  --endpoints=http://rgw-us-east:80,http://rgw-us-west:80 \
  --master \
  --default

# Create the EU zone group
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin zonegroup create \
  --rgw-realm=mycompany \
  --rgw-zonegroup=eu \
  --endpoints=http://rgw-eu-west:80
```

## Adding Zones to a Zone Group

```bash
# Add primary zone to US zone group
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin zone create \
  --rgw-realm=mycompany \
  --rgw-zonegroup=us \
  --rgw-zone=us-east \
  --master --default \
  --endpoints=http://rgw-us-east:80

# Add secondary zone to US zone group
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin zone create \
  --rgw-realm=mycompany \
  --rgw-zonegroup=us \
  --rgw-zone=us-west \
  --endpoints=http://rgw-us-west:80

# Add zone to EU zone group
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin zone create \
  --rgw-realm=mycompany \
  --rgw-zonegroup=eu \
  --rgw-zone=eu-west \
  --endpoints=http://rgw-eu-west:80
```

## Configuring Zone Group Placement Targets

Define where data lands by default within a zone group:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin zonegroup placement add \
  --rgw-zonegroup=us \
  --placement-id=default-placement \
  --storage-class=STANDARD

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin zone placement add \
  --rgw-zone=us-east \
  --placement-id=default-placement \
  --data-pool=us-east.rgw.buckets.data \
  --index-pool=us-east.rgw.buckets.index \
  --data-extra-pool=us-east.rgw.buckets.non-ec
```

## Viewing Zone Group Configuration

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin zonegroup get --rgw-zonegroup=us | python3 -m json.tool

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin zonegroup list
```

## Commit Changes

After any zone group modification, commit the period:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin period update --rgw-realm=mycompany --commit
```

## Summary

Zone groups organize Ceph RGW zones by geography, defining endpoints, placement targets, and master zone assignments per region. A well-designed zone group hierarchy with clear US and EU groups enables geo-targeted data placement while providing cross-zone replication for redundancy within each region.
