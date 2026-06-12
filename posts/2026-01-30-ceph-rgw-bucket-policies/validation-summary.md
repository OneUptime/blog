# Validation Summary: How to Create Ceph RGW Bucket Policies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ceph RADOS Gateway
- Amazon S3-compatible bucket policies
- AWS CLI S3 API commands
- JSON policy documents
- RGW users and tenants

## Sources Consulted
- Ceph Documentation: Bucket Policies, https://docs.ceph.com/en/latest/radosgw/bucketpolicy/
- Ceph Documentation: Bucket Policies for Squid, https://docs.ceph.com/en/squid/radosgw/bucketpolicy/
- Ceph Documentation: Admin Guide, https://docs.ceph.com/en/latest/radosgw/admin/
- Ceph radosgw-admin man page, https://docs.ceph.com/en/reef/man/8/radosgw-admin/
- AWS CLI Command Reference: put-bucket-policy, https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-policy.html
- AWS CLI Command Reference: get-bucket-policy, https://docs.aws.amazon.com/cli/latest/reference/s3api/get-bucket-policy.html
- Amazon S3 User Guide: Bucket policy examples and condition keys, https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-bucket-policies.html
- Amazon S3 API Reference: PutBucketPolicy, https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutBucketPolicy.html

## Issues Found
- The post stated that Ceph RGW has full support for bucket policies and that the syntax is the same as AWS S3. Ceph documents support for a subset of the Amazon S3 policy language, actions, and condition keys, so the introduction was corrected to describe this as subset support.
- The policy structure section said every bucket policy contains all shown fields. Fields such as `Id`, `Sid`, and `Condition` are not required in every policy, so the wording was changed to say these elements are commonly used.
- The prerequisites created an admin user with RGW admin caps for policy management. Ceph documents bucket policies as managed through standard S3 operations, so this was changed to create or identify the bucket owner user whose S3 credentials are used for policy management.
- The restricted-users example said it denied everyone else. The policy only grants access to named users and does not include an explicit deny for every other principal, so the wording was corrected.
- The "Resource Configuration" label was missing its Markdown heading marker, which could make the section render incorrectly.
- The time-based access example described recurring business hours and used an already-expired 2024 date range. It was corrected to describe a date-range policy and updated to a 2026 range.
- The object-size restriction example used `s3:content-length-range`, which is a POST policy condition and is not listed by Ceph as a supported bucket-policy condition key for `PutObject`. The example was replaced with a supported `s3:RequestObjectTag/<tag-key>` condition for uploaded objects.

## Review Notes
Ceph bucket-policy support is release-specific. The post now avoids claiming full AWS S3 policy parity, but future updates could add a short version caveat if the article targets a specific Ceph release.
