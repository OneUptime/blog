# How to Configure Keystone (OpenStack) Authentication for Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Keystone, OpenStack

Description: Learn how to integrate Ceph RGW with OpenStack Keystone for unified identity management, enabling Swift and S3 access using Keystone tokens.

---

## Overview

OpenStack Keystone integration allows Ceph RGW to authenticate users via Keystone tokens, enabling seamless access from OpenStack workloads to Ceph object storage. This is a common setup in hybrid clouds where OpenStack and Kubernetes share the same Ceph cluster.

## Step 1 - Create a Keystone Service Account for RGW

On your OpenStack/Keystone server:

```bash
# Create a service project for RGW
openstack project create --domain default swift-service

# Create the RGW service user
openstack user create --domain default \
  --password "rgw-service-password" \
  rgw-service

# Assign admin role to the service user
openstack role add --project swift-service \
  --user rgw-service admin

# Create the Swift endpoint (for legacy Swift clients)
openstack service create --name swift --description "Object Storage" object-store
openstack endpoint create --region RegionOne \
  object-store public http://rgw.example.com:7480/swift/v1/AUTH_%\(tenant_id\)s
```

## Step 2 - Configure RGW for Keystone

```bash
# Set Keystone configuration via Ceph CLI
ceph config set client.rgw.my-store rgw_keystone_url "https://keystone.example.com:5000"
ceph config set client.rgw.my-store rgw_keystone_api_version 3
ceph config set client.rgw.my-store rgw_keystone_admin_token ""
ceph config set client.rgw.my-store rgw_keystone_admin_user "rgw-service"
ceph config set client.rgw.my-store rgw_keystone_admin_password "rgw-service-password"
ceph config set client.rgw.my-store rgw_keystone_admin_project "swift-service"
ceph config set client.rgw.my-store rgw_keystone_admin_domain "default"
ceph config set client.rgw.my-store rgw_keystone_accepted_roles "admin,member,_member_"
ceph config set client.rgw.my-store rgw_keystone_token_cache_size 10000
```

## Step 3 - Configure TLS for Keystone Communication

```bash
# Install the Keystone CA certificate on Ceph nodes
cp keystone-ca.crt /etc/pki/tls/certs/keystone-ca.crt
update-ca-trust

# Ensure RGW verifies Keystone's SSL certificate
ceph config set client.rgw.my-store rgw_keystone_verify_ssl true
```

## Step 4 - Configure Rook CephObjectStore for Keystone

```yaml
# Rook CephObjectStore with Keystone integration
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
  # Additional Keystone config via config overrides
```

```bash
# Apply Keystone config via Rook ConfigMap override
kubectl -n rook-ceph exec deploy/rook-ceph-mgr-a -- \
  ceph config set client.rgw.my-store rgw_keystone_url \
  "https://keystone.example.com:5000"
```

## Step 5 - Test Swift Access with Keystone Token

```bash
# Get a Keystone token
TOKEN=$(openstack token issue -f value -c id)

# Test Swift access
curl -H "X-Auth-Token: ${TOKEN}" \
  http://rgw.example.com:7480/swift/v1/

# Test S3 access using EC2 credentials from Keystone
openstack ec2 credentials create
# Use the returned access/secret with any S3 client
```

## Step 6 - Verify User Role Mapping

```bash
# Check which Keystone roles RGW accepts
ceph config get client.rgw.my-store rgw_keystone_accepted_roles

# Enable role mapping for admin users
ceph config set client.rgw.my-store rgw_keystone_accepted_admin_roles "admin"

# Monitor authentication in RGW logs
kubectl -n rook-ceph logs -l app=rook-ceph-rgw \
  --tail=100 | grep -i keystone
```

## Summary

Ceph RGW Keystone integration enables OpenStack users to access object storage using their existing Keystone tokens. The integration requires a dedicated service account in Keystone, RGW configured with the Keystone endpoint and admin credentials, and TLS set up for secure communication. Users can then access RGW via Swift or S3 protocols using their standard OpenStack credentials.
