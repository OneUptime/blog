# Validation Summary: How to Transfer Data Between S3 Buckets with DataSync

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS DataSync
- Amazon S3
- AWS IAM
- AWS CLI
- Amazon CloudWatch Logs
- Amazon EventBridge scheduling syntax

## Sources Consulted
- AWS CLI Command Reference: `aws datasync create-location-s3` - https://docs.aws.amazon.com/cli/latest/reference/datasync/create-location-s3.html
- AWS DataSync User Guide: Configuring AWS DataSync transfers with Amazon S3 - https://docs.aws.amazon.com/datasync/latest/userguide/create-s3-location.html
- AWS DataSync User Guide: Tutorial for S3-to-S3 transfers across AWS accounts - https://docs.aws.amazon.com/datasync/latest/userguide/tutorial_s3-s3-cross-account-transfer.html
- AWS DataSync User Guide: Transferring specific files, objects, and folders by using filters - https://docs.aws.amazon.com/datasync/latest/userguide/filtering.html
- AWS DataSync User Guide: Scheduling when your AWS DataSync task runs - https://docs.aws.amazon.com/datasync/latest/userguide/task-scheduling.html
- AWS DataSync API Reference: Options - https://docs.aws.amazon.com/datasync/latest/userguide/API_Options.html
- AWS DataSync API Reference: DescribeTaskExecution - https://docs.aws.amazon.com/datasync/latest/userguide/API_DescribeTaskExecution.html
- AWS DataSync FAQ - https://aws.amazon.com/datasync/faqs/
- Amazon S3 Pricing - https://aws.amazon.com/s3/pricing/
- AWS Storage Blog: How to use AWS DataSync to migrate data between Amazon S3 buckets - https://aws.amazon.com/blogs/storage/how-to-use-aws-datasync-to-migrate-data-between-amazon-s3-buckets/

## Issues Found
- The S3 location examples used `--subdirectory` values beginning with `/`. AWS CLI documentation states DataSync cannot transfer objects with a prefix that begins with a slash, so the examples were changed to `data/2025` and `migrated/2025`.
- The cross-account example placed the bucket policy on the source bucket and allowed a role from the destination account. AWS's S3-to-S3 cross-account DataSync tutorial documents creating the DataSync role in the source account and allowing that source-account role in the destination bucket policy, so the section and policy example were corrected.
- The storage class list included `GLACIER_INSTANT_RETRIEVAL`, which is an S3 storage class but is not listed as a valid `create-location-s3 --s3-storage-class` value in the current AWS CLI documentation. It was removed from the DataSync-specific list.
- The scheduling example used an EventBridge rule with the DataSync task ARN as a target. AWS DataSync documentation provides native task scheduling through `--schedule` on `create-task`, `update-task`, or `start-task-execution`, so the example was replaced with `aws datasync update-task --schedule`.
- The cross-region example implied creating the source S3 location in the destination Region. AWS's cross-account/cross-region tutorial describes using the source location in the source bucket Region and creating the task in the destination location's Region, so the example was updated to show separate source and destination location creation commands.

## Review Notes
The AWS CLI was not installed in the local environment, so command validation was performed against current official AWS CLI and AWS DataSync documentation. The post's discussion of filters, task options such as `VerifyMode`, `PreserveDeletedFiles`, `TransferMode`, `ObjectTags`, and `BytesPerSecond`, and DataSync's integrity verification claims matched the consulted documentation.
