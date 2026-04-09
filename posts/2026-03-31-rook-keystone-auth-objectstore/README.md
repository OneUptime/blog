# How to Set Up Keystone Authentication for Rook Object Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Keystone, Authentication

Description: Learn how to configure Rook object store with OpenStack Keystone authentication, enabling token-based access control for S3 and Swift API endpoints.

---

## What Is Keystone Authentication for RGW

Ceph RGW supports OpenStack Keystone as an identity backend. When Keystone auth is enabled, RGW validates tokens issued by Keystone rather than its own internal user database. This is useful in environments where:

- OpenStack and Kubernetes share infrastructure and want unified authentication
- Enterprise SSO is managed through Keystone
- Swift API clients expect Keystone token authentication

## Prerequisites

You need a running Keystone endpoint reachable from the Rook cluster. Note your Keystone admin URL and credentials. Modern Ceph RGW only supports Keystone v3.

## Creating the Keystone Credentials Secret

Store Keystone connection details as a Kubernetes secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keystone-auth
  namespace: rook-ceph
type: Opaque
stringData:
  keystone_url: "https://keystone.example.com:5000"
  keystone_admin_user: "admin"
  keystone_admin_password: "adminpassword"
  keystone_admin_tenant: "admin"
  keystone_accepted_roles: "Member,admin"
  keystone_token_cache_size: "1000"
```

## Configuring RGW for Keystone via Ceph Config

Apply Keystone settings to the RGW configuration using the Rook toolbox:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash

ceph config set client.rgw rgw_keystone_url https://keystone.example.com:5000
ceph config set client.rgw rgw_keystone_admin_user admin
ceph config set client.rgw rgw_keystone_admin_password adminpassword
ceph config set client.rgw rgw_keystone_admin_tenant admin
ceph config set client.rgw rgw_keystone_admin_domain default
ceph config set client.rgw rgw_keystone_accepted_roles "Member,admin"
ceph config set client.rgw rgw_keystone_token_cache_size 1000
ceph config set client.rgw rgw_s3_auth_use_keystone true
```

## Configuring via CephObjectStore rgwConfig

In Rook, you can also specify RGW config overrides directly in the CephObjectStore spec:

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
    port: 80
    instances: 2
    rgwConfig:
      rgw_keystone_url: "https://keystone.example.com:5000"
      rgw_keystone_admin_user: "admin"
      rgw_keystone_accepted_roles: "Member,admin"
      rgw_s3_auth_use_keystone: "true"
      rgw_keystone_implicit_tenants: "true"
```

## Testing Keystone Auth

Get a Keystone token and use it to access the object store:

```bash
# Get a Keystone token
TOKEN=$(curl -s -X POST https://keystone.example.com:5000/v3/auth/tokens \
  -H "Content-Type: application/json" \
  -d '{"auth":{"identity":{"methods":["password"],"password":{"user":{"name":"testuser","password":"testpass","domain":{"name":"Default"}}}},"scope":{"project":{"name":"testproject","domain":{"name":"Default"}}}}}' \
  -i | grep "X-Subject-Token" | awk '{print $2}')

# Use token with S3 (requires token-based auth enabled)
curl -H "X-Auth-Token: $TOKEN" \
  http://rook-ceph-rgw-my-store.rook-ceph.svc:80/
```

## Verifying Tenant Mapping

When `rgw_keystone_implicit_tenants: true` is set, Keystone projects are automatically mapped to RGW tenants. Check the mapping:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin user list
```

Keystone users appear automatically after their first authenticated request.

## Summary

Keystone authentication for Rook object store is configured through Ceph RGW config settings, either applied via `ceph config set` commands or through the `rgwConfig` section of the CephObjectStore CRD. Enable `rgw_s3_auth_use_keystone` and `rgw_keystone_implicit_tenants` to allow Keystone tokens for S3 access. Test by obtaining a Keystone token and making authenticated API calls to the RGW endpoint.
