# How to Configure Swift Settings in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, RGW, Swift, OpenStack

Description: Configure Ceph RGW Swift-compatible settings including ACLs, tenant accounts, URL formats, and object versioning for OpenStack Swift API compatibility.

---

## RGW Swift API Overview

Ceph RGW provides an OpenStack Swift-compatible API in addition to the S3 API. Both APIs share the same underlying storage. Swift configuration covers authentication methods, URL formats, ACL handling, tenant management, and object versioning.

## Configuring Swift URL Format

Swift URLs use a different path structure than S3. Configure the URL format:

```bash
# Set the Swift URL prefix
ceph config set client.rgw rgw_swift_url_prefix swift

# Full URL: http://rgw.example.com/swift/v1/<account>/<container>/<object>
```

For a custom URL:

```bash
ceph config set client.rgw rgw_swift_url http://swift.example.com
```

## Swift Authentication Configuration

RGW supports multiple Swift authentication methods:

### Keystone Authentication (OpenStack)

```bash
# Enable Keystone auth
ceph config set client.rgw rgw_keystone_url http://keystone.example.com:5000
ceph config set client.rgw rgw_keystone_admin_token <admin-token>
ceph config set client.rgw rgw_keystone_accepted_roles "member,_member_"
ceph config set client.rgw rgw_keystone_token_cache_size 500
ceph config set client.rgw rgw_keystone_revocation_interval 900
```

### Tempauth (Simple Auth for Testing)

```bash
# Configure tempauth users
ceph config set client.rgw rgw_swift_auth_entry auth
# Create the user and a Swift subuser with a Swift key:
radosgw-admin user create --uid=testuser \
  --display-name="Test User" \
  --email=test@example.com
radosgw-admin subuser create --uid=testuser \
  --subuser=testuser:swift --access=full
radosgw-admin key create --subuser=testuser:swift \
  --key-type=swift --gen-secret
```

## Tenant Configuration

Swift uses tenants (equivalent to S3 accounts or Keystone projects) to isolate namespaces:

```bash
# Create a tenanted user
radosgw-admin user create \
  --tenant=myorg \
  --uid=alice \
  --display-name="Alice" \
  --email=alice@myorg.com

# The user's Swift account path becomes:
# /swift/v1/myorg:alice/<container>/...
```

Enable tenant handling:

```bash
# Enforce tenant-scoped accounts
ceph config set client.rgw rgw_keystone_implicit_tenants true
```

## Swift ACL Configuration

Swift ACL controls access to containers:

```bash
# Via Swift API - set container ACL
swift post mycontainer --read-acl ".r:*"  # Public read
swift post mycontainer --read-acl "myorg:alice,myorg:bob"  # Specific users
swift post mycontainer --write-acl "myorg:alice"  # Write access
```

Configure ACL settings in RGW:

```bash
# Include Swift account name in the URL path
ceph config set client.rgw rgw_swift_account_in_url true

# Enforce Content-Length header in Swift API responses
ceph config set client.rgw rgw_swift_enforce_content_length true
```

## Object Versioning

Swift supports container-level object versioning, where overwritten objects are preserved in an archive container:

```bash
# Enable versioning on a container
swift post mycontainer -H "X-Versions-Location: mycontainer-archive"

# Create the archive container
swift post mycontainer-archive

# Now, overwriting an object in mycontainer saves the old version in mycontainer-archive
swift upload mycontainer myfile.txt      # version 1
swift upload mycontainer myfile.txt      # version 2 - version 1 saved to archive
```

Configure RGW versioning settings:

```bash
# Swift versioning is enabled per-container via headers, no global config needed
# Verify objects in archive
swift list mycontainer-archive
```

## CORS Configuration for Swift

Enable CORS for web browser access to Swift containers:

```bash
# Set CORS headers on a container
swift post mycontainer \
  -H "X-Container-Meta-Access-Control-Allow-Origin: https://myapp.example.com" \
  -H "X-Container-Meta-Access-Control-Max-Age: 3600"
```

## Large Object Support

Swift uses Static Large Objects (SLO) or Dynamic Large Objects (DLO) for files larger than 5 GiB:

```bash
# Upload a large file using segments
swift upload --segment-size=104857600 --segment-container=mycontainer-segments \
  mycontainer largefile.bin

# Configure internal RADOS I/O chunk size (not Swift segment size)
ceph config set client.rgw rgw_max_chunk_size 524288  # 512 KiB
```

## Configuring Swift in ceph.conf

A complete Swift-relevant configuration block:

```text
[client.rgw.myrgw]
rgw_frontends = beast port=7480
rgw_swift_url = http://swift.example.com
rgw_swift_url_prefix = swift
rgw_swift_auth_entry = auth
rgw_swift_account_in_url = true
rgw_swift_enforce_content_length = true
rgw_keystone_url = http://keystone.example.com:5000
rgw_keystone_admin_token = mytoken
rgw_keystone_accepted_roles = member,_member_,admin
rgw_keystone_implicit_tenants = true
rgw_keystone_token_cache_size = 1000
```

## Testing Swift API Access

```bash
# Install python-swiftclient
pip install python-swiftclient

# Test connection
swift --auth-version 3 \
  --os-auth-url http://keystone.example.com:5000/v3 \
  --os-project-name myorg \
  --os-project-domain-name default \
  --os-username alice \
  --os-user-domain-name default \
  --os-password mypassword \
  list

# Or with tempauth
swift --auth http://rgw.example.com:7480/auth/v1 \
  --user testuser:swift \
  --key mypassword \
  list
```

## Summary

Ceph RGW Swift configuration covers URL format (`rgw_swift_url_prefix`), authentication method (Keystone or tempauth), tenant isolation (`rgw_keystone_implicit_tenants`), and container-level ACLs and versioning. OpenStack deployments typically use Keystone authentication with implicit tenants mapped to Keystone projects. Object versioning is enabled per-container using Swift headers (`X-Versions-Location`). Testing with `python-swiftclient` provides quick validation of Swift API compatibility.
