# How to Configure Object Store Multisite with Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Multisite, Object Storage, RGW, Kubernetes

Description: Configure Ceph RGW multisite replication across multiple Rook clusters using realms, zone groups, and zones for geo-distributed object storage.

---

## Overview

Ceph RGW multisite enables object data replication across multiple Ceph clusters in different geographic locations. The hierarchy is: Realm - ZoneGroup - Zone. A realm is the top-level namespace, a zone group contains one or more zones, and a zone maps to a Ceph cluster. Rook manages this through `CephObjectRealm`, `CephObjectZoneGroup`, and `CephObjectZone` CRDs.

## Multisite Hierarchy

```text
Realm: my-realm
  ZoneGroup: us-east
    Zone: us-east-1 (primary)
    Zone: us-east-2 (secondary)
```

## Step 1 - Create the Realm

On the primary cluster:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectRealm
metadata:
  name: my-realm
  namespace: rook-ceph
```

```bash
kubectl apply -f realm.yaml
```

## Step 2 - Create the ZoneGroup

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectZoneGroup
metadata:
  name: us-east
  namespace: rook-ceph
spec:
  realm: my-realm
```

```bash
kubectl apply -f zonegroup.yaml
```

## Step 3 - Create the Primary Zone

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectZone
metadata:
  name: us-east-1
  namespace: rook-ceph
spec:
  zoneGroup: us-east
  metadataPool:
    replicated:
      size: 3
  dataPool:
    replicated:
      size: 3
  preservePoolsOnDelete: true
```

```bash
kubectl apply -f zone-primary.yaml
```

## Step 4 - Create the Object Store with Zone Reference

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: my-store
  namespace: rook-ceph
spec:
  zone:
    name: us-east-1
  gateway:
    port: 80
    instances: 2
```

```bash
kubectl apply -f object-store.yaml
```

## Step 5 - Get the Realm Token for Secondary Cluster

```bash
kubectl -n rook-ceph get secret my-realm-keys -o yaml
```

Extract the realm access key and secret. Transfer these secrets to the secondary cluster.

## Step 6 - Configure Secondary Cluster

On the secondary cluster, create the realm using the pull configuration:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectRealm
metadata:
  name: my-realm
  namespace: rook-ceph
spec:
  pull:
    endpoint: http://primary-rgw-endpoint:80
```

Create the matching ZoneGroup on the secondary cluster:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectZoneGroup
metadata:
  name: us-east
  namespace: rook-ceph
spec:
  realm: my-realm
```

Create the secondary Zone:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectZone
metadata:
  name: us-east-2
  namespace: rook-ceph
spec:
  zoneGroup: us-east
  metadataPool:
    replicated:
      size: 3
  dataPool:
    replicated:
      size: 3
```

Create the Object Store on the secondary cluster referencing the secondary zone:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: my-store
  namespace: rook-ceph
spec:
  zone:
    name: us-east-2
  gateway:
    port: 80
    instances: 2
```

## Verify Multisite Replication

Check synchronization status from the primary:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin sync status
```

Expected output showing data sync:

```text
          realm 12345678 (my-realm)
      zonegroup 87654321 (us-east)
           zone abcdef12 (us-east-1)
  metadata sync no sync (zone is master)
      data sync source: us-east-2/us-east
                        syncing
                        full sync: 0/128 shards
                        incremental sync: 128/128 shards
                        data is caught up with source
```

## Summary

Rook multisite uses three CRDs in a hierarchy: `CephObjectRealm`, `CephObjectZoneGroup`, and `CephObjectZone`. The primary zone creates the realm and zone group, generates credentials, and the secondary cluster pulls the realm configuration before creating its own zone. Once configured, RGW synchronizes bucket data and metadata across zones automatically, enabling geo-distributed object storage with active-active or active-passive replication.
