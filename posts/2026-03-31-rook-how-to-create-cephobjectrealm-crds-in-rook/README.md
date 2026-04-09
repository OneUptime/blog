# How to Create CephObjectRealm CRDs in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Object Storage, Multisite, Realm, Kubernetes

Description: Learn how to create and manage CephObjectRealm CRDs in Rook, which define the top-level namespace for Ceph RGW multisite replication configurations.

---

## Overview

A CephObjectRealm is the top-level organizational unit in Ceph RGW multisite. It defines a globally unique namespace that can span multiple zone groups and zones across different Ceph clusters. All multisite configurations are scoped to a realm.

When you create a CephObjectRealm in Rook, the operator:
1. Creates the realm in the Ceph cluster
2. Makes the realm available for zone group and zone CRDs to reference

## Creating a CephObjectRealm

The CephObjectRealm CRD is intentionally simple - it mainly serves as a reference point for zone groups:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectRealm
metadata:
  name: my-realm
  namespace: rook-ceph
spec: {}
```

Apply the manifest:

```bash
kubectl apply -f realm.yaml
```

Check the status:

```bash
kubectl -n rook-ceph get cephobjectrealm my-realm
```

Expected output:

```text
NAME       PHASE
my-realm   Ready
```

## Verifying Realm Creation in Ceph

Confirm the realm was created in the Ceph cluster:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin realm list
```

Expected output:

```text
{
    "default_info": "...",
    "realms": [
        "my-realm"
    ]
}
```

Get detailed realm information:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin realm get --rgw-realm=my-realm
```

Output shows the realm ID and epoch:

```text
{
    "id": "abc12345-...",
    "name": "my-realm",
    "current_period": "...",
    "epoch": 1
}
```

## Exporting a Realm for Secondary Sites

Once the realm is established, export it to configure secondary clusters:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin realm export --rgw-realm=my-realm
```

Save the output as a JSON file and apply it to secondary clusters using `realm import`.

## Using the Realm in Zone Groups

Reference the realm in a CephObjectZoneGroup:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectZoneGroup
metadata:
  name: my-zonegroup
  namespace: rook-ceph
spec:
  realm: my-realm
```

And in zones:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectZone
metadata:
  name: zone-us-east
  namespace: rook-ceph
spec:
  zoneGroup: my-zonegroup
  metadataPool:
    replicated:
      size: 3
  dataPool:
    replicated:
      size: 3
```

## Deleting a CephObjectRealm

Before deleting a realm, you must delete all dependent resources in order:

```bash
# Delete in reverse dependency order
kubectl -n rook-ceph delete cephobjectstore my-store
kubectl -n rook-ceph delete cephobjectzone zone-us-east
kubectl -n rook-ceph delete cephobjectzonegroup my-zonegroup
kubectl -n rook-ceph delete cephobjectrealm my-realm
```

## Listing All Realm Resources

Get a view of the complete multisite hierarchy:

```bash
kubectl -n rook-ceph get cephobjectrealm,cephobjectzonegroup,cephobjectzone
```

## Summary

The CephObjectRealm CRD in Rook defines the top-level namespace for RGW multisite replication. Creating a realm is the first step in building a multisite configuration - it establishes the shared namespace that zone groups and zones reference. The realm is then exported to secondary clusters, enabling them to join the same replication topology.
