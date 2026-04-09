# How to Integrate Ceph RGW with OpenStack Keystone

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Keystone, OpenStack, Authentication

Description: Learn how to integrate Ceph RGW with OpenStack Keystone for centralized identity management, enabling OpenStack users to access RGW with their Keystone credentials.

---

## Overview

Integrating Ceph RGW with OpenStack Keystone allows OpenStack users to authenticate to RGW using their Keystone tokens rather than separate RGW credentials. This is essential in OpenStack environments where Ceph serves as the backend for Swift object storage accessed by Nova, Glance, or Cinder.

## Prerequisites

- A running OpenStack Keystone service
- Ceph RGW deployed and accessible
- Admin credentials for both systems

## Configuring RGW for Keystone

Set the Keystone configuration via the centralized config store:

```bash
# Configure Keystone integration
ceph config set client.rgw rgw_keystone_url "http://keystone-host:5000"
ceph config set client.rgw rgw_keystone_api_version 3
ceph config set client.rgw rgw_keystone_admin_domain Default
ceph config set client.rgw rgw_keystone_admin_project service
ceph config set client.rgw rgw_keystone_admin_user rgw-service
ceph config set client.rgw rgw_keystone_admin_password rgw-password

# Set token cache timeout
ceph config set client.rgw rgw_keystone_token_cache_size 10000
ceph config set client.rgw rgw_keystone_revocation_interval 900

# Accept Keystone users for S3 and Swift
ceph config set client.rgw rgw_keystone_accepted_roles "admin,member"
ceph config set client.rgw rgw_s3_auth_use_keystone true
```

## Creating the RGW Service Account in Keystone

```bash
# Create the RGW service user in Keystone
openstack user create \
  --domain Default \
  --password rgw-password \
  --project service \
  rgw-service

# Grant admin role to allow token validation
openstack role add \
  --project service \
  --user rgw-service \
  admin
```

## Verifying with a Keystone Token

Get a Keystone token and use it with the Swift API:

```bash
# Get a token
TOKEN=$(openstack token issue -f value -c id)
STORAGE_URL="http://rgw-host:80/swift/v1"

# List containers using Keystone token
curl -X GET $STORAGE_URL \
  -H "X-Auth-Token: $TOKEN"

# Create a container
curl -X PUT $STORAGE_URL/mycontainer \
  -H "X-Auth-Token: $TOKEN"
```

## S3 with Keystone via EC2 Credentials

For S3 access, create EC2 credentials in Keystone that map to RGW:

```bash
# Create EC2 credentials for a user
openstack ec2 credentials create --user alice --project myproject

# Output includes:
# access: EC2_ACCESS_KEY
# secret: EC2_SECRET_KEY

# Use these credentials with the S3 API
AWS_ACCESS_KEY_ID=EC2_ACCESS_KEY AWS_SECRET_ACCESS_KEY=EC2_SECRET_KEY \
  aws --endpoint-url http://rgw-host:80 s3 ls
```

## Configuring HTTPS for Keystone Verification

In production, RGW must verify Keystone SSL certificates:

```bash
ceph config set client.rgw rgw_keystone_verify_ssl true
ceph config set client.rgw nss_db_path /var/ceph/nss
```

Import the Keystone CA certificate:

```bash
openssl x509 -in keystone-ca.pem -inform PEM \
  -out keystone-ca.der -outform DER

certutil -d /var/ceph/nss -A -n keystone-ca \
  -t "CT,C,C" -i keystone-ca.der
```

## Summary

Integrating Ceph RGW with Keystone centralizes authentication for OpenStack environments, allowing users to access object storage with their existing Keystone credentials. Configure the Keystone URL and admin credentials on RGW, create a service account in Keystone with token validation permissions, and optionally enable EC2 credential support for S3 API access. Always use HTTPS with certificate verification in production deployments.
