# How to Configure Bucket ACLs in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, ACL, S3, Security

Description: Learn how to configure S3 bucket ACLs in Ceph RGW to control public access, grant cross-account permissions, and implement canned ACL policies using AWS CLI and radosgw-admin.

---

## Understanding Bucket ACLs in RGW

Access Control Lists (ACLs) in Ceph RGW follow the S3 specification. They control who can read and write bucket objects and bucket configuration. ACLs operate at two levels:

- **Bucket ACL**: Controls access to the bucket itself (listing objects, deleting bucket)
- **Object ACL**: Controls access to individual objects within the bucket

## Canned ACL Values

S3 canned ACLs are predefined permission sets:

| Canned ACL | Description |
|------------|-------------|
| private | Owner has full control (default) |
| public-read | Anyone can read objects |
| public-read-write | Anyone can read and write |
| authenticated-read | Authenticated S3 users can read |

## Set a Canned ACL with AWS CLI

```bash
# Set bucket as public-read (anyone can list bucket contents without authentication)
aws s3api put-bucket-acl \
  --bucket my-bucket \
  --acl public-read \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc:80

# Verify the ACL
aws s3api get-bucket-acl \
  --bucket my-bucket \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc:80
```

## Set a Custom Bucket ACL

For fine-grained control, use a JSON ACL document:

```bash
cat > bucket-acl.json << 'EOF'
{
  "Owner": {
    "ID": "owner-user-id",
    "DisplayName": "owner-user"
  },
  "Grants": [
    {
      "Grantee": {
        "Type": "CanonicalUser",
        "ID": "owner-user-id"
      },
      "Permission": "FULL_CONTROL"
    },
    {
      "Grantee": {
        "Type": "CanonicalUser",
        "ID": "readonly-user-id"
      },
      "Permission": "READ"
    }
  ]
}
EOF

aws s3api put-bucket-acl \
  --bucket my-bucket \
  --access-control-policy file://bucket-acl.json \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc:80
```

## Get User Canonical ID

Cross-account ACL grants require the canonical user ID:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  # Get canonical ID for a user
  radosgw-admin user info --uid=readonly-user | jq '.user_id, .keys'
"
```

## Set ACL via radosgw-admin

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  # View bucket owner and stats
  radosgw-admin bucket stats --bucket=my-bucket

  # Re-link bucket to another user (changes bucket association/owner)
  radosgw-admin bucket link --bucket=my-bucket --uid=secondary-owner
"
```

## Object-Level ACL

Set ACLs on individual objects:

```bash
# Make a specific object publicly readable
aws s3api put-object-acl \
  --bucket my-bucket \
  --key path/to/object.txt \
  --acl public-read \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc:80

# Verify
aws s3api get-object-acl \
  --bucket my-bucket \
  --key path/to/object.txt \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc:80
```

## Block Public Access

For production workloads, block all public access by default and use bucket policies for controlled access:

```bash
aws s3api put-public-access-block \
  --bucket my-bucket \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc:80
```

## Verify Access

Test that ACL permissions work as expected:

```bash
# Test public read access without credentials
curl -I http://rook-ceph-rgw-my-store.rook-ceph.svc:80/my-bucket/test-object.txt

# Should return 200 for public-read, 403 for private
```

## Summary

Configuring Ceph RGW bucket ACLs uses the standard S3 ACL API through AWS CLI or custom JSON policy documents. Canned ACLs like `private` and `public-read` handle common access patterns, while custom ACL documents with canonical user IDs enable cross-user permission grants. For production environments, use bucket policies (which offer more expressive access control) in addition to ACLs, and block public access by default to prevent accidental data exposure.
