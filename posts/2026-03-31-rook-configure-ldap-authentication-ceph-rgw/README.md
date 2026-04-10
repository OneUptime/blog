# How to Configure LDAP Authentication for Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, LDAP, Authentication, Security

Description: Learn how to configure LDAP authentication for Ceph RGW, enabling users to authenticate to S3 object storage using their existing directory service credentials.

---

## Overview

Ceph RGW supports LDAP-based authentication for the S3 API, allowing users to authenticate using their existing corporate directory credentials (Active Directory, OpenLDAP) rather than separate RGW access keys. RGW maps LDAP users to internal RGW users, making it easier to manage access at scale using existing identity infrastructure.

## How LDAP Authentication Works in RGW

RGW's LDAP authentication works through a token-based mechanism:
1. The user generates a base64-encoded token containing their LDAP username and password using the `radosgw-token` utility
2. The token is used as the S3 access key when making requests
3. RGW extracts the credentials from the token and searches the LDAP directory using the configured service account
4. If a matching LDAP entry is found, RGW binds using the user's credentials from the token
5. If the bind succeeds, the request proceeds with the mapped RGW user's permissions

This is used with the S3 API, controlled by the `rgw_s3_auth_use_ldap` configuration option.

## Installing Required Packages

```bash
# On the RGW host, install LDAP libraries
apt-get install libldap2-dev  # Debian/Ubuntu
dnf install openldap-devel    # RHEL/CentOS
```

## Configuring RGW for LDAP

```bash
# Enable LDAP authentication for S3
ceph config set client.rgw rgw_s3_auth_use_ldap true

# Set LDAP server URI
ceph config set client.rgw rgw_ldap_uri "ldap://ldap-host:389"

# Set bind DN (service account for searching)
ceph config set client.rgw rgw_ldap_binddn "cn=ceph-bind,ou=services,dc=example,dc=com"

# Set bind password (store in a file for security)
echo -n "service-account-password" > /etc/openldap/secret
chmod 600 /etc/openldap/secret
ceph config set client.rgw rgw_ldap_secret /etc/openldap/secret

# Set search base DN
ceph config set client.rgw rgw_ldap_searchdn "ou=users,dc=example,dc=com"

# Set search attribute
ceph config set client.rgw rgw_ldap_dnattr "uid"

# Optional: require users to be in a specific LDAP group
ceph config set client.rgw rgw_ldap_searchfilter "(&(uid=@USERNAME@)(memberOf=cn=ceph-users,ou=groups,dc=example,dc=com))"
```

## Generating an LDAP Token

Users generate a base64-encoded token containing their LDAP credentials using `radosgw-token`:

```bash
# Set LDAP credentials as environment variables
export RGW_ACCESS_KEY_ID="alice"
export RGW_SECRET_ACCESS_KEY="alice-ldap-password"

# Generate the token
radosgw-token --encode --ttype=ldap
```

Alternatively, you can manually encode the token:

```bash
echo -n '{"RGW_TOKEN":{"version":1,"type":"ldap","id":"alice","key":"alice-ldap-password"}}' | base64
```

## Using the LDAP Token with S3 Clients

Use the generated token as the S3 access key:

```bash
# Set the LDAP token as the access key
export AWS_ACCESS_KEY_ID="<base64-encoded token from radosgw-token>"
export AWS_SECRET_ACCESS_KEY=""

# Use aws CLI to list buckets
aws --endpoint-url http://rgw-host:80 s3 ls

# Or use s3cmd
s3cmd --access_key="$AWS_ACCESS_KEY_ID" \
  --secret_key="" \
  --host=rgw-host:80 \
  --host-bucket="rgw-host:80/%(bucket)" \
  ls
```

## LDAP over TLS

For production, use LDAPS to avoid transmitting credentials in clear text:

```bash
# Use LDAPS
ceph config set client.rgw rgw_ldap_uri "ldaps://ldap-host:636"
```

Ensure the CA certificate for the LDAP server is installed in the system trust store on the RGW host so that TLS verification succeeds.

## Active Directory Configuration

For Active Directory, adjust the search attributes:

```bash
# AD uses sAMAccountName for user login names
ceph config set client.rgw rgw_ldap_dnattr "sAMAccountName"

# AD search base
ceph config set client.rgw rgw_ldap_searchdn "DC=corp,DC=example,DC=com"

# AD bind DN (use the full DN of the service account)
ceph config set client.rgw rgw_ldap_binddn "CN=service-account,OU=services,DC=corp,DC=example,DC=com"
```

## Verifying LDAP Configuration

Test LDAP connectivity from the RGW host:

```bash
# Test LDAP bind
ldapsearch -H ldap://ldap-host:389 \
  -D "cn=ceph-bind,ou=services,dc=example,dc=com" \
  -w service-account-password \
  -b "ou=users,dc=example,dc=com" \
  "(uid=alice)"

# Check RGW logs for LDAP auth attempts
grep "ldap" /var/log/ceph/ceph-client.rgw.*.log
```

## Summary

Ceph RGW LDAP authentication integrates with existing directory services so users can access S3 object storage with their corporate credentials. Enable it with `rgw_s3_auth_use_ldap`, configure the LDAP server URI, bind credentials, and search base in Ceph config, then users generate tokens with `radosgw-token` and use them as S3 access keys. Use LDAPS in production, and filter access by LDAP group membership for fine-grained control over who can access RGW.
