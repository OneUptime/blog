# How to Configure Ceph RGW as OpenStack Swift Replacement

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, OpenStack, Swift, RGW, Object Storage, S3

Description: Replace OpenStack Swift with Ceph RGW as the object storage backend, using the Swift-compatible API to maintain compatibility with existing applications.

---

Ceph RGW provides a Swift-compatible REST API that allows you to drop it in as a replacement for OpenStack Swift. This guide covers configuring RGW for Swift API compatibility and integrating it with OpenStack Keystone for authentication.

## Why Replace Swift with Ceph RGW

- Unified object storage serving both S3 and Swift APIs simultaneously
- Simpler operations - one storage system instead of two
- Better scalability with RADOS backend
- Native integration with other Ceph pools (RBD, CephFS)

## Step 1: Enable Swift API on RGW

In your Ceph configuration, ensure RGW is configured to serve Swift requests:

```ini
# /etc/ceph/ceph.conf
[client.rgw.myzone]
rgw_frontends = beast port=7480
rgw_swift_versioning_enabled = true
rgw_swift_account_in_url = true
```

## Step 2: Integrate RGW with Keystone

For OpenStack compatibility, configure RGW to authenticate against Keystone:

```ini
[client.rgw.myzone]
rgw_keystone_url = https://keystone.example.com:5000
rgw_keystone_api_version = 3
rgw_keystone_admin_domain = Default
rgw_keystone_admin_project = service
rgw_keystone_admin_user = rgw
rgw_keystone_admin_password = <rgw-service-password>
rgw_keystone_accepted_roles = member,admin,_member_
rgw_keystone_token_cache_size = 500
rgw_s3_auth_use_keystone = true
```

## Step 3: Register RGW as a Keystone Service

```bash
# Create the Swift service in Keystone
openstack service create --name swift \
  --description "Ceph Object Storage (Swift API)" \
  object-store

# Create the endpoint
openstack endpoint create --region RegionOne \
  object-store public http://rgw.example.com:7480/swift/v1/AUTH_%\(project_id\)s

openstack endpoint create --region RegionOne \
  object-store internal http://rgw.example.com:7480/swift/v1/AUTH_%\(project_id\)s
```

## Step 4: Create the RGW Service Account in Keystone

```bash
openstack user create --domain default \
  --password <rgw-password> rgw

openstack role add --project service \
  --user rgw admin
```

## Step 5: Test Swift API Compatibility

```bash
# Install python-swiftclient
pip install python-swiftclient python-keystoneclient

# Get an auth token and list containers
swift \
  --os-auth-url https://keystone.example.com:5000/v3 \
  --os-project-name myproject \
  --os-username myuser \
  --os-password mypassword \
  --os-user-domain-name Default \
  --os-project-domain-name Default \
  --auth-version 3 \
  list

# Create a container and upload an object
swift ... post mycontainer
swift ... upload mycontainer /etc/hosts
swift ... list mycontainer
```

## Step 6: Configure OpenStack Services to Use RGW

Update `glance-api.conf` to use the Swift store pointing at RGW:

```ini
[glance_store]
stores = swift
default_store = swift
swift_store_auth_version = 3
swift_store_auth_address = https://keystone.example.com:5000/v3
swift_store_user = service:rgw
swift_store_key = <rgw-password>
swift_store_container = glance
swift_store_create_container_on_put = true
```

## Summary

Ceph RGW can serve as a drop-in replacement for OpenStack Swift by exposing a Swift-compatible API and integrating with Keystone for authentication. After registering RGW as the object-store service in Keystone and configuring the appropriate RGW settings, existing applications using the Swift API continue to work without code changes. This consolidates object storage onto a single Ceph cluster serving both S3 and Swift clients simultaneously.
