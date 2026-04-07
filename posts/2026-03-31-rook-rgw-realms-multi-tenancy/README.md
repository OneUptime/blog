# How to Set Up Ceph RGW Realms for Multi-Tenancy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Realm, Multi-Tenancy, Object Storage

Description: Learn how to configure Ceph RGW realms for multi-tenancy, enabling isolated S3 namespaces, separate user pools, and independent replication policies per tenant.

---

## What Is an RGW Realm

A Ceph RGW realm is the top-level container for the multisite hierarchy. Each realm has:
- Its own set of zone groups and zones
- Independent user namespaces
- Separate metadata and data pools
- Independent replication policies

Using multiple realms enables true multi-tenancy where tenants are isolated at the storage infrastructure level.

## Creating Multiple Realms

```bash
# Create realm for Tenant A
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin realm create --rgw-realm=tenant-a

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin zonegroup create \
  --rgw-realm=tenant-a \
  --rgw-zonegroup=tenant-a-us \
  --master --default

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin zone create \
  --rgw-realm=tenant-a \
  --rgw-zonegroup=tenant-a-us \
  --rgw-zone=tenant-a-primary \
  --master --default

# Create realm for Tenant B
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin realm create --rgw-realm=tenant-b

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin zonegroup create \
  --rgw-realm=tenant-b \
  --rgw-zonegroup=tenant-b-eu \
  --master --default

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin zone create \
  --rgw-realm=tenant-b \
  --rgw-zonegroup=tenant-b-eu \
  --rgw-zone=tenant-b-primary \
  --master --default

# Commit period changes for both realms
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin period update --commit --rgw-realm=tenant-a

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin period update --commit --rgw-realm=tenant-b
```

## Deploying Separate RGW Instances per Realm

Create separate CephObjectStore resources per realm in Rook:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: tenant-a-store
  namespace: rook-ceph
spec:
  gateway:
    port: 8080
    instances: 2
  zone:
    name: tenant-a-primary
---
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: tenant-b-store
  namespace: rook-ceph
spec:
  gateway:
    port: 8081
    instances: 2
  zone:
    name: tenant-b-primary
```

## Creating Users Within a Realm

Users are scoped to a realm. Specify the realm when creating users:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin --rgw-realm=tenant-a user create \
  --uid=alice \
  --display-name="Alice" \
  --access-key=alice-key \
  --secret-key=alice-secret

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin --rgw-realm=tenant-b user create \
  --uid=bob \
  --display-name="Bob" \
  --access-key=bob-key \
  --secret-key=bob-secret
```

Users from tenant-a cannot access buckets in tenant-b's realm.

## Routing Requests to the Right Realm

Configure the RGW to serve the correct realm based on the endpoint:

```yaml
# In the Rook CephObjectStore for tenant-a
spec:
  gateway:
    port: 8080
    # Clients connect to tenant-a-endpoint:8080
```

Use an ingress or load balancer to route based on hostname:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: rgw-multitenancy
spec:
  rules:
  - host: s3.tenant-a.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: rook-ceph-rgw-tenant-a-store
            port:
              number: 8080
  - host: s3.tenant-b.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: rook-ceph-rgw-tenant-b-store
            port:
              number: 8081
```

## Summary

Ceph RGW realms provide strong multi-tenancy isolation by creating separate namespaces for users, buckets, and replication policies. Each tenant gets its own RGW endpoint, zone configuration, and user database, with no cross-tenant data visibility or access.
