# Validation Summary: How to Configure Bucket ACLs in Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RGW (RADOS Gateway)
- S3 Access Control Lists (ACLs)
- AWS CLI (s3api commands)
- radosgw-admin CLI
- kubectl

## Sources Consulted
- AWS S3 Access Control List Overview: https://docs.aws.amazon.com/AmazonS3/latest/userguide/acl-overview.html
- AWS S3 Canned ACL documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/acl-overview.html#canned-acl
- AWS CLI s3api reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/
- Ceph radosgw-admin documentation: https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- Ceph RGW S3 API compatibility documentation: https://docs.ceph.com/en/latest/radosgw/s3/

## Issues Found

1. **Incorrect comment about `public-read` bucket ACL** (line 32): The comment stated "all objects readable without authentication." In the S3 specification, applying `public-read` to a *bucket* grants the AllUsers group READ permission on the bucket, which means listing objects — not reading object data. Changed to "anyone can list bucket contents without authentication."

2. **Invalid `radosgw-admin bucket stats` jq filter** (line 96): The command piped `bucket stats` output through `jq '.acl'`, but `radosgw-admin bucket stats` does not include an `.acl` field in its JSON output. The output contains fields like `bucket`, `owner`, `usage`, and `bucket_quota`. Changed to show the full `bucket stats` output with an updated comment ("View bucket owner and stats").

3. **Misleading description of `radosgw-admin bucket link`** (line 99): The comment said "Link another user to a bucket (grants access)" which implies simple permission granting. In reality, `bucket link` re-associates/re-links a bucket to a different user, effectively changing the bucket's owner association. Updated the comment to "Re-link bucket to another user (changes bucket association/owner)."

## Review Notes
- The canned ACL table is a simplified subset; S3 defines additional canned ACLs like `aws-exec-read`, `bucket-owner-read`, `bucket-owner-full-control`, and `log-delivery-write`. This is acceptable for a focused tutorial but readers should consult the full S3 documentation for a complete list.
- The `put-public-access-block` API was added in Ceph Pacific (v16.x). Users on older Ceph versions may not have this feature available.
- AWS recommends using bucket policies over ACLs for most use cases, and newer AWS accounts disable ACLs by default (bucket owner enforced). Ceph RGW still fully supports ACLs, so this guidance remains valid in the RGW context.
- The post correctly recommends blocking public access by default for production workloads and using bucket policies for more expressive access control.
