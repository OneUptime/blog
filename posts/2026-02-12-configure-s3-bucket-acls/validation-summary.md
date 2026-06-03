# Validation Summary: How to Configure S3 Bucket ACLs (and Why You Should Avoid Them)

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon S3
- S3 Access Control Lists
- S3 Object Ownership
- AWS CLI
- S3 bucket policies
- S3 server access logging

## Sources Consulted
- Amazon S3 User Guide: Controlling ownership of objects and disabling ACLs for your bucket - https://docs.aws.amazon.com/AmazonS3/latest/userguide/about-object-ownership.html
- Amazon S3 User Guide: Access control list (ACL) overview - https://docs.aws.amazon.com/AmazonS3/latest/userguide/acl-overview.html
- Amazon S3 User Guide: Policies and permissions in Amazon S3 - https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-policy-language-overview.html
- Amazon S3 User Guide: Logging requests with server access logging - https://docs.aws.amazon.com/AmazonS3/latest/userguide/ServerLogs.html
- Amazon S3 User Guide: Enabling Amazon S3 server access logging - https://docs.aws.amazon.com/AmazonS3/latest/userguide/enable-server-access-logging.html
- AWS CLI Command Reference: put-bucket-ownership-controls - https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-ownership-controls.html
- AWS CLI Command Reference: put-bucket-acl - https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-acl.html
- AWS CLI Command Reference: cp - https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html

## Issues Found
- The post said all ACL-related commands would not work when `BucketOwnerEnforced` is enabled. Updated this to clarify that setting or updating ACLs fails, but read ACL requests are still supported.
- The `BucketOwnerPreferred` setup comment said the bucket owner automatically owns new objects. Updated it to state that ownership transfers for new objects uploaded with the `bucket-owner-full-control` canned ACL.
- The custom ACL example claimed to grant full control to another account but only granted that account read access. Updated the command to include both canonical IDs in `--grant-full-control`.
- The object ownership confusion example said the bucket owner could not delete a cross-account-owned object. Updated this to focus on read access, because AWS documentation states the bucket owner can delete objects in the bucket regardless of object owner.
- The S3 access logging section said the target bucket needs the `log-delivery-write` ACL. Updated this to clarify that ACL-based log delivery is a legacy option and that AWS recommends bucket policies.

## Review Notes
The post is technically relevant and current after the corrections. The AWS CLI was not installed in the local environment, so command syntax was validated against the official AWS CLI command reference rather than local `--help` output.
