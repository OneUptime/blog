# How to Set Up Ceph RGW Multisite with Two Zones

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Multisite, Object Storage, Kubernetes

Description: Learn how to set up Ceph RGW multisite with two zones using Rook, enabling active-active or active-passive object storage replication across data centers or regions.

---

## What Is RGW Multisite

Ceph RGW multisite provides geo-replication for S3-compatible object storage. A multisite configuration consists of:
- **Realm**: top-level administrative domain
- **Zone Group**: logical grouping of zones (maps to a region)
- **Zone**: individual Ceph cluster endpoint (maps to a data center)

## Architecture for Two Zones

```yaml
Realm: mycompany
  Zone Group: us (us.primary zone + us.secondary zone)
    Zone: us-east (Ceph Cluster A - master zone)
    Zone: us-west (Ceph Cluster B - secondary zone)
```

## Step 1: Create the Realm on Cluster A (Primary)

```bash
# On primary cluster (us-east)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin realm create --rgw-realm=mycompany --default

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin zonegroup create \
  --rgw-zonegroup=us \
  --master \
  --default

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin zone create \
  --rgw-zonegroup=us \
  --rgw-zone=us-east \
  --master \
  --default \
  --endpoints=http://rgw-us-east.example.com

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin period update --commit
```

## Step 2: Create the Sync User

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin user create \
  --uid=zone-sync \
  --display-name="Zone Sync User" \
  --access-key=sync-access-key \
  --secret-key=sync-secret-key \
  --system

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin zone modify \
  --rgw-zone=us-east \
  --access-key=sync-access-key \
  --secret=sync-secret-key

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin period update --commit
```

Save the access key and secret key for use on the secondary cluster.

## Step 3: Configure Rook Object Store for Primary Zone

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: us-east
  namespace: rook-ceph
spec:
  metadataPool:
    failureDomain: host
    replicated:
      size: 3
  dataPool:
    failureDomain: host
    replicated:
      size: 3
  gateway:
    port: 80
    instances: 2
  zone:
    name: us-east
```

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectZone
metadata:
  name: us-east
  namespace: rook-ceph
spec:
  zoneGroup: us
  metadataPool:
    replicated:
      size: 3
  dataPool:
    replicated:
      size: 3
---
apiVersion: ceph.rook.io/v1
kind: CephObjectZoneGroup
metadata:
  name: us
  namespace: rook-ceph
spec:
  realm: mycompany
---
apiVersion: ceph.rook.io/v1
kind: CephObjectRealm
metadata:
  name: mycompany
  namespace: rook-ceph
```

## Step 4: Pull the Realm on Secondary Cluster

On Cluster B (us-west):

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin realm pull \
  --url=http://rgw-us-east.example.com \
  --access-key=sync-access-key \
  --secret=sync-secret-key

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin zone create \
  --rgw-zonegroup=us \
  --rgw-zone=us-west \
  --access-key=sync-access-key \
  --secret=sync-secret-key \
  --endpoints=http://rgw-us-west.example.com

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin period update --commit
```

## Step 5: Verify Sync

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin sync status

# Expected: "sync: ok" and low/zero behind count
```

## Summary

Setting up Ceph RGW multisite with two zones requires creating the realm hierarchy on the primary zone, configuring the sync user, deploying the CephObjectZone CRDs in Rook, pulling the realm on the secondary cluster, and verifying sync status. This enables automatic object replication between data centers.
