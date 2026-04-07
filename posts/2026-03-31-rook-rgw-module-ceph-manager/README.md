# How to Configure the RGW Module in Ceph Manager

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, RGW, Object Storage, S3

Description: Learn how to configure the Ceph Manager RGW module to manage RADOS Gateway instances for S3-compatible object storage deployments.

---

The Ceph Manager RGW (RADOS Gateway) module provides management capabilities for object storage gateways. It integrates with the Orchestrator interface to deploy, scale, and manage RGW instances that expose S3 and Swift-compatible endpoints.

## Enabling the RGW Module

The RGW module is enabled by default in most Ceph deployments. Verify its status:

```bash
ceph mgr module ls | grep rgw
```

Enable it if needed:

```bash
ceph mgr module enable rgw
```

## Creating an Object Store Realm

Before deploying RGW instances, create the realm, zone group, and zone hierarchy:

```bash
# Create realm
radosgw-admin realm create --rgw-realm=production --default

# Create zone group
radosgw-admin zonegroup create --rgw-zonegroup=us --master --default

# Create zone
radosgw-admin zone create --rgw-zonegroup=us --rgw-zone=us-east --master --default

# Commit the period
radosgw-admin period update --rgw-realm=production --commit
```

## Deploying RGW via the Orchestrator

Use the orchestrator module to deploy RGW daemons:

```bash
ceph orch apply rgw production.us.us-east --placement="2" --port=8080
```

This deploys two RGW instances for the specified zone.

## Managing RGW in Rook

In a Rook-managed cluster, define the object store as a custom resource:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: my-store
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3
  dataPool:
    replicated:
      size: 3
  gateway:
    port: 8080
    instances: 2
```

Apply and verify the store:

```bash
kubectl apply -f object-store.yaml
kubectl -n rook-ceph get cephobjectstore
```

## Listing RGW Services

View deployed RGW daemons:

```bash
ceph orch ps --daemon-type rgw
```

```text
NAME              HOST     STATUS   REFRESHED
rgw.production.0  node-1   running  10s ago
rgw.production.1  node-2   running  10s ago
```

## Creating an S3 User

Create a user to test the endpoint:

```bash
radosgw-admin user create --uid=testuser --display-name="Test User"
```

Test S3 access using the AWS CLI:

```bash
AWS_ACCESS_KEY_ID=<access_key> \
AWS_SECRET_ACCESS_KEY=<secret_key> \
aws s3 ls --endpoint-url http://192.168.1.10:8080
```

## Summary

The Ceph Manager RGW module works alongside the Orchestrator module to manage RADOS Gateway deployments. Creating realms, zone groups, and zones establishes the object storage topology, while `ceph orch apply rgw` or Rook `CephObjectStore` custom resources handle daemon placement and scaling.
