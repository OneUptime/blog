# How to Set Up LDAP Authentication Settings for RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, LDAP, Authentication, Security

Description: Configure LDAP authentication in Ceph RGW to allow users to authenticate with their existing directory credentials for S3 API access.

---

Ceph RGW can authenticate users against an LDAP directory, enabling single sign-on for object storage without creating separate RGW users for each person.

## LDAP Authentication Flow

When LDAP auth is enabled for S3:
1. User generates a base64-encoded LDAP token using `radosgw-token --encode --ttype=ldap`
2. The token (containing LDAP credentials) is used as the S3 access key
3. RGW decodes the token, extracts the credentials, and binds to LDAP to verify them
4. On success, RGW authorizes the S3 operation

## LDAP Configuration Parameters

```bash
# LDAP server URI
ceph config set client.rgw rgw_ldap_uri ldap://ldap.example.com:389

# LDAP bind DN (service account for searching)
ceph config set client.rgw rgw_ldap_binddn "cn=service-account,dc=example,dc=com"

# LDAP bind password (stored in a file)
ceph config set client.rgw rgw_ldap_secret /etc/ceph/ldap.secret

# Base DN to search for users
ceph config set client.rgw rgw_ldap_searchdn "ou=users,dc=example,dc=com"

# DN attribute used to construct the search filter (e.g., uid, cn)
ceph config set client.rgw rgw_ldap_dnattr uid

# Enable LDAP authentication for S3
ceph config set client.rgw rgw_s3_auth_use_ldap true
```

## Creating the LDAP Secret File

```bash
echo "your-ldap-service-password" > /etc/ceph/ldap.secret
chmod 600 /etc/ceph/ldap.secret
chown ceph:ceph /etc/ceph/ldap.secret
```

## Generating an LDAP Token for S3 Access

```bash
# Generate a base64-encoded LDAP token
radosgw-token --encode --ttype=ldap

# Use the token as the S3 access key
export AWS_ACCESS_KEY_ID="<token-output>"
export AWS_SECRET_ACCESS_KEY=""
```

## Applying in Rook via Secret

Store the LDAP password as a Kubernetes Secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: rgw-ldap-secret
  namespace: rook-ceph
stringData:
  ldap.secret: "your-ldap-service-password"
```

Then reference it in the config override:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-config-override
  namespace: rook-ceph
data:
  config: |
    [client.rgw.my-store.a]
    rgw_ldap_uri = ldap://ldap.example.com:389
    rgw_ldap_binddn = cn=service-account,dc=example,dc=com
    rgw_ldap_secret = /etc/ceph/ldap.secret
    rgw_ldap_searchdn = ou=users,dc=example,dc=com
    rgw_ldap_dnattr = uid
    rgw_s3_auth_use_ldap = true
```

## Testing LDAP Authentication

```bash
# Generate an LDAP token (will prompt for LDAP credentials)
TOKEN=$(radosgw-token --encode --ttype=ldap)

# Test S3 access using the LDAP token as the access key
AWS_ACCESS_KEY_ID="$TOKEN" AWS_SECRET_ACCESS_KEY="" \
  aws s3 ls --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc
```

## Summary

Ceph RGW LDAP authentication is configured via `rgw_ldap_uri`, `rgw_ldap_binddn`, `rgw_ldap_secret`, and `rgw_ldap_searchdn`. Enable it by setting `rgw_s3_auth_use_ldap` to `true`. Users authenticate by generating tokens with `radosgw-token` and using them as S3 access keys. Store credentials securely using Kubernetes Secrets and mount them into RGW pods for production Rook deployments.
