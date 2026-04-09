# How to Configure LDAP Backend Authentication for Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, LDAP, Authentication

Description: Learn how to configure Ceph RADOS Gateway to authenticate users against an LDAP directory, enabling centralized identity management for S3 access.

---

## Overview

Ceph RGW supports LDAP as an authentication backend, allowing organizations to use their existing directory services (Active Directory, OpenLDAP) to control S3 access. In LDAP mode, RGW validates S3 access tokens by checking credentials against the LDAP server rather than its local user database.

## Step 1 - Prerequisites

Ensure you have:
- A running LDAP server (OpenLDAP or Active Directory)
- Ceph Jewel (10.2.0) or later
- A service account in LDAP for RGW to use for bind operations

```bash
# Verify RGW version
radosgw --version
```

## Step 2 - Configure LDAP Settings in ceph.conf

```ini
# /etc/ceph/ceph.conf additions for the RGW instance
[client.rgw.mystore]
rgw_ldap_uri = ldap://ldap.example.com:389
rgw_ldap_binddn = cn=rgw-service,ou=serviceaccounts,dc=example,dc=com
rgw_ldap_secret = /etc/ceph/ldap_secret
rgw_ldap_searchdn = ou=users,dc=example,dc=com
rgw_ldap_dnattr = uid
rgw_ldap_searchfilter = (objectClass=inetOrgPerson)
rgw_s3_auth_use_ldap = true
```

The file `/etc/ceph/ldap_secret` should contain the LDAP bind password in plaintext.

For Rook-managed RGW, patch the Ceph config override:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-mgr-a -- ceph config set client.rgw.my-store \
  rgw_ldap_uri "ldap://ldap.example.com:389"
kubectl -n rook-ceph exec deploy/rook-ceph-mgr-a -- ceph config set client.rgw.my-store \
  rgw_ldap_binddn "cn=rgw-service,ou=serviceaccounts,dc=example,dc=com"
kubectl -n rook-ceph exec deploy/rook-ceph-mgr-a -- ceph config set client.rgw.my-store \
  rgw_ldap_secret "/etc/ceph/ldap_secret"
kubectl -n rook-ceph exec deploy/rook-ceph-mgr-a -- ceph config set client.rgw.my-store \
  rgw_ldap_searchdn "ou=users,dc=example,dc=com"
kubectl -n rook-ceph exec deploy/rook-ceph-mgr-a -- ceph config set client.rgw.my-store \
  rgw_ldap_dnattr "uid"
kubectl -n rook-ceph exec deploy/rook-ceph-mgr-a -- ceph config set client.rgw.my-store \
  rgw_s3_auth_use_ldap "true"
```

## Step 3 - Create the LDAP Bind Password Secret

Store the LDAP bind password in a file and make it available to the RGW pod:

```bash
# Create a Kubernetes secret containing the bind password
kubectl -n rook-ceph create secret generic rgw-ldap-secret \
  --from-literal=ldap-secret=mysecretpassword
```

The secret must be mounted as a file at the path specified by `rgw_ldap_secret` (e.g., `/etc/ceph/ldap_secret`) in the RGW pod.

```yaml
# CephObjectStore definition
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: my-store
  namespace: rook-ceph
spec:
  gateway:
    port: 80
    instances: 1
  # Use config overrides for LDAP settings
```

## Step 4 - Configure LDAP TLS (Recommended)

For production, always use LDAPS:

```bash
# Configure LDAPS endpoint
kubectl -n rook-ceph exec deploy/rook-ceph-mgr-a -- ceph config set client.rgw.my-store \
  rgw_ldap_uri "ldaps://ldap.example.com:636"

# Mount the CA certificate in the RGW pod
kubectl -n rook-ceph create configmap ldap-ca-cert \
  --from-file=ca.crt=/path/to/ldap-ca.crt
```

## Step 5 - Test LDAP Authentication

RGW's LDAP backend uses the `radosgw-token` utility to encode LDAP credentials into an S3 access token. The token is then used as the S3 access key with standard S3 v2/v4 signature authentication.

Generate a token:

```bash
# Set LDAP credentials as environment variables
export RGW_ACCESS_KEY_ID="jsmith"
export RGW_SECRET_ACCESS_KEY="userpass"

# Generate the LDAP token
radosgw-token --encode --ttype=ldap
```

Use the generated token as the `AWS_ACCESS_KEY_ID` and set `AWS_SECRET_ACCESS_KEY` to an empty string:

```bash
# Test with the AWS CLI
export AWS_ACCESS_KEY_ID="<token from radosgw-token>"
export AWS_SECRET_ACCESS_KEY=""
aws --endpoint-url http://rgw.example.com:7480 s3 ls
```

## Step 6 - Troubleshoot LDAP Issues

```bash
# Enable debug logging for RGW LDAP
kubectl -n rook-ceph exec deploy/rook-ceph-mgr-a -- ceph config set client.rgw.my-store \
  debug_rgw 20

# Check RGW logs for LDAP errors
kubectl -n rook-ceph logs -l app=rook-ceph-rgw --tail=100 | grep -i ldap

# Test LDAP bind manually
ldapsearch -H ldap://ldap.example.com:389 \
  -D "cn=rgw-service,ou=serviceaccounts,dc=example,dc=com" \
  -w mysecretpassword \
  -b "ou=users,dc=example,dc=com" \
  "(uid=jsmith)"
```

## Summary

LDAP authentication for Ceph RGW centralizes identity management by delegating credential validation to your directory service. Configuration requires setting the LDAP URI, bind credentials, and search parameters in the Ceph config. Using LDAPS with certificate validation and storing the bind password in a Kubernetes secret ensures security in production environments.
