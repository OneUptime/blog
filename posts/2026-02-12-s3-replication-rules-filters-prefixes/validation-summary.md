# Validation Summary: How to Use S3 Replication Rules with Filters and Prefixes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon S3 Replication
- AWS CLI
- S3 replication rule filters
- S3 object tags
- S3 delete marker replication

## Sources Consulted
- Amazon S3 API Reference: ReplicationRuleFilter - https://docs.aws.amazon.com/AmazonS3/latest/API/API_ReplicationRuleFilter.html
- Amazon S3 API Reference: ReplicationRule - https://docs.aws.amazon.com/AmazonS3/latest/API/API_ReplicationRule.html
- Amazon S3 User Guide: Replication configuration file elements - https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-add-config.html
- Amazon S3 User Guide: Replicating delete markers between buckets - https://docs.aws.amazon.com/AmazonS3/latest/userguide/delete-marker-replication.html
- Amazon S3 User Guide: Replicating objects within and across Regions - https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication.html
- AWS CLI Command Reference: aws s3 cp - https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html
- AWS CLI Command Reference: aws s3api put-object - https://docs.aws.amazon.com/cli/latest/reference/s3api/put-object.html
- AWS CLI Command Reference: aws s3api head-object - https://docs.aws.amazon.com/cli/latest/reference/s3api/head-object.html

## Issues Found
- Tag-based replication examples had `DeleteMarkerReplication` set to `Enabled`. AWS does not support delete marker replication for tag-based replication rules, so those examples now use `Disabled`.
- The tag upload example used `aws s3 cp --tagging`, but the high-level `aws s3 cp` command does not include a `--tagging` option. It now uses `aws s3api put-object --tagging`.
- The post described S3 replication object-size filters using `ObjectSizeGreaterThan` and `ObjectSizeLessThan`. Those fields are lifecycle rule filters, not replication rule filters. The section now explains that replication does not support object-size filters and shows a tag-based workaround.
- The rule priority section said the lowest number wins and implied a single winning rule for all overlapping rules. The AWS API documentation states that S3 attempts all matching rules, and priority resolves conflicts for matching rules with the same destination bucket, with the higher priority value taking precedence. The section was corrected.
- The failed-replication listing command piped JSON output directly into `while read`. It now uses `--output text` and converts tab-separated keys to newline-separated input before checking each object.

## Review Notes
The examples assume that source and destination buckets have versioning enabled and that the replication IAM role has the required permissions. Those prerequisites are referenced elsewhere in the linked setup guides and were not expanded here to avoid restructuring the post.
