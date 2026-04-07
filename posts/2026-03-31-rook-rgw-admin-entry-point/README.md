# How to Set Admin Entry Point Configuration in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Admin, API, Configuration

Description: Configure the RGW admin API entry point path and access controls to securely expose Ceph RGW administrative operations.

---

Ceph RGW exposes an administrative REST API at a configurable URL path. This API allows managing users, buckets, usage, and more. Securing and correctly configuring its entry point is essential for production deployments.

## The Admin Entry Point Parameter

`rgw_admin_entry` controls the URL path prefix for the admin API. The default is `admin`.

```bash
# Check current admin entry
ceph config get client.rgw rgw_admin_entry
```

The admin API is accessible at: `http://rgw-host/<rgw_admin_entry>/...`

## Changing the Admin Entry Point

```bash
# Change from default 'admin' to 'rgw-admin'
ceph config set client.rgw rgw_admin_entry rgw-admin

# Disable the admin API by removing it from enabled APIs
ceph config set client.rgw rgw_enable_apis "s3,swift,swift_auth"
```

## Common Admin API Endpoints

Once configured, available endpoints include:

```bash
BASE="http://rook-ceph-rgw-my-store.rook-ceph.svc/admin"

# Get cluster info
curl "$BASE/info" -H "Authorization: AWS4-HMAC-SHA256 ..."

# List all users
curl "$BASE/metadata/user" -H "Authorization: ..."

# Get user info
curl "$BASE/user?uid=testuser" -H "Authorization: ..."

# List buckets
curl "$BASE/bucket" -H "Authorization: ..."
```

## Securing the Admin API

Best practices for production:

1. **Restrict by IP** - Use a network policy to only allow admin access from trusted sources
2. **Use a separate endpoint** - Expose admin on a different port or internal-only service
3. **Rotate admin keys** - Regularly rotate the credentials used for admin API calls

```yaml
# Kubernetes NetworkPolicy to restrict admin API access
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: rgw-admin-access
  namespace: rook-ceph
spec:
  podSelector:
    matchLabels:
      app: rook-ceph-rgw
  ingress:
  - from:
    - podSelector:
        matchLabels:
          role: admin-client
    ports:
    - protocol: TCP
      port: 8080
```

## Using radosgw-admin Instead

For cluster-internal operations, prefer `radosgw-admin` over the HTTP admin API:

```bash
# Create a user
radosgw-admin user create --uid=newuser --display-name="New User" --email=new@example.com

# List buckets
radosgw-admin bucket list

# Get usage stats
radosgw-admin usage show --uid=testuser
```

## Applying in Rook

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-config-override
  namespace: rook-ceph
data:
  config: |
    [client.rgw.my-store.a]
    rgw_admin_entry = admin
    rgw_enable_apis = s3,swift,swift_auth,admin
```

## Summary

The RGW admin API entry point is controlled by `rgw_admin_entry` (default: `admin`) and is included in `rgw_enable_apis` by default. If you override `rgw_enable_apis`, ensure `admin` is in the list to keep the admin API enabled. In production, restrict access to the admin API using Kubernetes NetworkPolicies and prefer `radosgw-admin` for cluster-internal management tasks.
