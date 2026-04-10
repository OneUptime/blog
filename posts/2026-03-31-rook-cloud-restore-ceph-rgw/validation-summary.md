# Validation Summary: How to Configure Cloud Restore for Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Rook (Kubernetes Ceph operator)
- AWS S3 API (RestoreObject, HeadObject)
- AWS CLI (s3api, s3)
- Python boto3 SDK
- radosgw-admin CLI

## Sources Consulted
- Ceph official documentation on cloud transition and RGW S3 API compatibility: https://docs.ceph.com/en/latest/radosgw/cloud-transition/
- Ceph radosgw-admin CLI reference: https://docs.ceph.com/en/latest/radosgw/adminops/
- AWS S3 RestoreObject API reference: https://docs.aws.amazon.com/AmazonS3/latest/API/API_RestoreObject.html
- AWS CLI s3api restore-object reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/restore-object.html
- boto3 S3 client restore_object documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/restore_object.html

## Issues Found

### Issue 1: Incorrect command for monitoring restore jobs
- **What was wrong:** The post used `radosgw-admin reshard status` to check restore job status. This command is for bucket index resharding operations and is completely unrelated to cloud transition or restore jobs.
- **What was changed:** Replaced with `radosgw-admin lc list` which shows lifecycle processing activity, and a reference back to the HEAD object approach already covered in the post.
- **Why:** `reshard status` monitors bucket index shard rebalancing, not cloud restore operations. Using it would return irrelevant information and confuse readers.

### Issue 2: Fabricated radosgw-admin subcommand
- **What was wrong:** The post used `radosgw-admin cloud-transition stats --bucket mybucket --key archive/myfile.txt`. The `cloud-transition stats` subcommand does not exist in radosgw-admin.
- **What was changed:** Replaced with `radosgw-admin lc get --bucket=mybucket` which shows the lifecycle configuration for a bucket, and clarified that HEAD object requests are the primary way to monitor individual object restore status.
- **Why:** Running a non-existent subcommand would produce an error, leaving readers unable to monitor their restore operations.

### Issue 3: Misleading restore tier time estimates
- **What was wrong:** The restore tier descriptions (Expedited: "minutes", Standard: "hours", Bulk: "hours") were copied from AWS Glacier semantics. In Ceph RGW cloud-s3 configurations, the remote target is typically a standard S3 endpoint, so these tiers are accepted for API compatibility but don't control restore speed the same way.
- **What was changed:** Replaced specific time estimates with priority-based descriptions (Highest/Default/Lowest priority) and added a clarifying note about the difference from AWS Glacier behavior.
- **Why:** The original descriptions would set incorrect expectations. Readers might choose "Expedited" expecting minutes-fast retrieval, when actual speed depends on the remote S3 endpoint, not the tier parameter.

## Review Notes
- The overall flow and explanation of the RestoreObject workflow (initiate, poll via HEAD, download) is accurate and well-structured.
- The Python boto3 example is correct — `response.get('Restore', '')` properly accesses the restore status string from the HEAD object response.
- The `aws s3api restore-object` CLI syntax and `--restore-request` JSON format are correct.
- The `x-amz-restore` header format examples are accurate for both in-progress and completed states.
- The post correctly notes that after the restore window expires, only the local copy is removed while the cloud copy remains.
