# Validation Summary: How to Use IoT Core Rules Engine to Route Messages to S3

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS IoT Core Rules Engine
- AWS IoT SQL and substitution templates
- Amazon S3
- IAM roles and policies
- AWS CLI
- AWS CloudFormation
- Amazon Athena partition projection
- Amazon Data Firehose

## Sources Consulted
- AWS IoT Core S3 rule action documentation: https://docs.aws.amazon.com/iot/latest/developerguide/s3-rule-action.html
- AWS IoT Core substitution templates documentation: https://docs.aws.amazon.com/iot/latest/developerguide/iot-substitution-templates.html
- AWS IoT Core SQL functions reference: https://docs.aws.amazon.com/iot/latest/developerguide/iot-sql-functions.html
- AWS IoT Core SQL versions documentation: https://docs.aws.amazon.com/iot/latest/developerguide/iot-rule-sql-version.html
- AWS IoT CreateTopicRule API reference: https://docs.aws.amazon.com/iot/latest/apireference/API_CreateTopicRule.html
- AWS IoT S3Action API reference: https://docs.aws.amazon.com/iot/latest/apireference/API_S3Action.html
- AWS CloudFormation AWS::IoT::TopicRule S3Action reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-iot-topicrule-s3action.html
- AWS IoT Core Firehose rule action documentation: https://docs.aws.amazon.com/iot/latest/developerguide/kinesis-firehose-rule-action.html
- Amazon Athena partition projection setup documentation: https://docs.aws.amazon.com/athena/latest/ug/partition-projection-setting-up.html
- Amazon Athena supported partition projection types: https://docs.aws.amazon.com/athena/latest/ug/partition-projection-supported-types.html
- Amazon Athena injected partition projection documentation: https://docs.aws.amazon.com/athena/latest/ug/partition-projection-dynamic-id-partitioning.html
- Amazon S3 PutObject API permissions documentation: https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObject.html
- Amazon S3 Object Ownership documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-ownership-new-bucket.html

## Issues Found
- The IAM policy only granted `s3:PutObject` while the main S3 rule used the `bucket-owner-full-control` canned ACL. Added `s3:PutObjectAcl` to the IAM policy examples because S3 requires that permission when changing an object's ACL during `PutObject`.
- The IoT rule examples used `parse_time()` but did not specify `awsIotSqlVersion`. Added `awsIotSqlVersion: "2016-03-23"` / `AwsIotSqlVersion: '2016-03-23'`, which is the recommended IoT SQL version and supports `parse_time()`.
- Several sample IAM role ARNs used a 9-digit account ID placeholder. Updated them to the valid 12-digit placeholder `123456789012`.
- The S3 key example used a seconds-style timestamp and shortened UUID. Updated it to show a millisecond epoch timestamp and UUID-shaped value, matching `timestamp()` and `newuuid()`.
- The partitioned-path example described partitioning by device type, but the key actually partitions by device ID from `topic(2)`. Updated the wording to device ID / devices.
- The Athena partition projection table used date projections for separate `year`, `month`, and `day` path components, which did not match paths like `year=2026/month=02/day=12`. Changed those projections to integer projections with two-digit month/day formatting.
- The Athena query comment said "today" while querying the fixed date `2026-02-12`. Changed the comment to "a specific day."
- The IoT SQL function table described `topic(n)` as 0-indexed. Corrected it to 1-indexed.
- The Firehose example used `batchMode: true` with `SELECT *`, but AWS IoT Firehose batch mode is intended for SQL results that evaluate to an array. Removed `batchMode` and left Firehose buffering as the batching mechanism.
- Updated service naming from Kinesis Data Firehose to Amazon Data Firehose.

## Review Notes
The S3 bucket name in the examples is a placeholder and must be globally unique before use. For production, readers should also configure bucket encryption, public access settings, and object ownership explicitly to match their organization's S3 security baseline.
