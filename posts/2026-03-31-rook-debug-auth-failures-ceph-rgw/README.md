# How to Debug Authentication Failures in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Debug, Authentication

Description: Learn systematic approaches to diagnosing and resolving S3 authentication failures in Ceph RGW, covering common error codes and log analysis techniques.

---

## Overview

Authentication failures in Ceph RGW typically manifest as HTTP 403 (Forbidden) or 401 (Unauthorized) errors from S3 clients. Root causes range from mismatched credentials and clock skew to misconfigured LDAP/OIDC settings and bucket policy conflicts. This guide provides a systematic debugging workflow.

## Step 1 - Enable Verbose RGW Logging

```bash
# Increase RGW debug level temporarily
ceph config set client.rgw.my-store debug_rgw 20

# For Rook-managed RGW
kubectl -n rook-ceph exec deploy/rook-ceph-mgr-a -- \
  ceph config set client.rgw.my-store debug_rgw 20

# Restart RGW to apply
kubectl -n rook-ceph rollout restart deployment/rook-ceph-rgw-my-store-a

# Tail logs to see detailed auth flow
kubectl -n rook-ceph logs -l app=rook-ceph-rgw -f \
  | grep -E "(auth|sign|401|403|invalid|denied|error)"
```

## Step 2 - Diagnose Common Error Codes

```bash
# Check for specific error patterns in RGW logs
kubectl -n rook-ceph logs -l app=rook-ceph-rgw --tail=500 \
  | grep -E "ERROR|WARN" | sort | uniq -c | sort -rn

# Common errors and meanings:
# "could not get attrs" - user does not exist in RGW
# "user suspended" - account has been suspended
# "signature mismatch" - wrong secret key or signing method
# "request time too skewed" - clock skew > 15 minutes
# "invalid access key" - access key does not exist
# "AuthorizationQueryParametersError" - STS token issue
```

## Step 3 - Check Clock Skew

Clock skew is the most common cause of "RequestTimeTooSkewed" errors:

```bash
# Check time on the client machine
date -u

# Check time on Ceph nodes
kubectl -n rook-ceph exec deploy/rook-ceph-mgr-a -- date -u

# Verify NTP is synchronized
timedatectl status | grep "NTP synchronized"

# Check the request timestamp in RGW logs
kubectl -n rook-ceph logs -l app=rook-ceph-rgw --tail=100 \
  | grep "time_skewed\|RequestTimeTooSkewed"
```

## Step 4 - Validate Credentials

```bash
# Verify the user exists in RGW (lists user UIDs)
radosgw-admin user list | grep -i "expected-user"

# Get user details and check keys
radosgw-admin user info --uid=myuser

# Check if the key is for the right user
radosgw-admin user info --access-key=ABCDEFGHIJ1234567890

# Verify a signature manually
python3 << 'EOF'
import hmac
import hashlib
import base64
from datetime import datetime

access_key = "ABCDEFGHIJ1234567890"
secret_key = "mysecretkey"
method = "GET"
date = datetime.utcnow().strftime("%a, %d %b %Y %H:%M:%S +0000")
resource = "/mybucket/"

string_to_sign = f"{method}\n\n\n{date}\n{resource}"
signature = base64.b64encode(
    hmac.new(secret_key.encode(), string_to_sign.encode(), hashlib.sha1).digest()
).decode()
print(f"Authorization: AWS {access_key}:{signature}")
EOF
```

## Step 5 - Debug STS and OIDC Authentication

```bash
# STS auth is logged under the general debug_rgw subsystem
# Ensure debug_rgw is set to 20 (as in Step 1) to capture STS details
kubectl -n rook-ceph exec deploy/rook-ceph-mgr-a -- \
  ceph config set client.rgw.my-store debug_rgw 20

# Check OIDC provider configuration
aws --endpoint-url http://rgw.example.com:7480 \
  --profile rgw-iam \
  iam list-open-id-connect-providers

# Decode a JWT token to inspect claims
JWT="your.jwt.token"
echo "${JWT}" | cut -d. -f2 | base64 -d 2>/dev/null | python3 -m json.tool

# Common OIDC issues:
# - "aud" claim doesn't match registered client ID
# - Token is expired (check "exp" claim)
# - Issuer URL has a trailing slash mismatch
# - OIDC thumbprint is outdated
```

## Step 6 - Debug Bucket Policy Conflicts

```bash
# Get the bucket policy to check for deny rules
aws --endpoint-url http://rgw.example.com:7480 \
  s3api get-bucket-policy --bucket mybucket 2>/dev/null | python3 -m json.tool

# Get bucket ACL
aws --endpoint-url http://rgw.example.com:7480 \
  s3api get-bucket-acl --bucket mybucket

# Check object ACL for specific access issues
aws --endpoint-url http://rgw.example.com:7480 \
  s3api get-object-acl --bucket mybucket --key myobject.txt

# Test access directly with a specific user's credentials
AWS_ACCESS_KEY_ID=ABCDEFGHIJ1234567890 \
  AWS_SECRET_ACCESS_KEY=mysecretkey \
  aws --endpoint-url http://rgw.example.com:7480 \
  s3api get-object --bucket mybucket --key myobject.txt /dev/null
```

## Summary

Debugging Ceph RGW authentication failures requires enabling verbose logging, checking clock synchronization, validating credentials directly in the RGW user database, and inspecting bucket policies for conflicting deny rules. For OIDC and STS failures, decoding the JWT token and verifying the `aud` claim against the registered OIDC provider resolves the majority of issues. Always reduce debug log levels after investigation to avoid performance impact.
