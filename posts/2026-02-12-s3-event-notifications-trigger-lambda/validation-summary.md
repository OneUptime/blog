# Validation Summary: How to Set Up S3 Event Notifications to Trigger Lambda Functions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon S3
- AWS Lambda
- AWS IAM
- AWS CLI
- Python
- boto3
- Pillow
- Amazon CloudWatch Logs and metrics
- Lambda dead-letter queues

## Sources Consulted
- Amazon S3 Event Notifications: https://docs.aws.amazon.com/AmazonS3/latest/userguide/EventNotifications.html
- Amazon S3 event notification types and destinations: https://docs.aws.amazon.com/AmazonS3/latest/userguide/notification-how-to-event-types-and-destinations.html
- Amazon S3 object key notification filtering: https://docs.aws.amazon.com/AmazonS3/latest/userguide/notification-how-to-filtering.html
- AWS CLI `put-bucket-notification-configuration` reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-notification-configuration.html
- AWS CLI `lambda create-function` reference: https://docs.aws.amazon.com/cli/latest/reference/lambda/create-function.html
- AWS CLI `lambda add-permission` reference: https://docs.aws.amazon.com/cli/latest/reference/lambda/add-permission.html
- AWS Lambda asynchronous invocation retry behavior: https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-error-handling.html
- AWS Lambda asynchronous destinations and dead-letter queues: https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-retain-records.html
- AWS Lambda with Amazon S3: https://docs.aws.amazon.com/lambda/latest/dg/with-s3.html
- Referenced OneUptime S3 to SQS/SNS guide: https://oneuptime.com/blog/post/2026-02-12-s3-event-notifications-sqs-sns/view

## Issues Found
- The description referred to object "modified" events, but Amazon S3 notification event types are more specific and do not include a generic `ObjectModified` event. Updated the description to mention created, deleted, restored, tagged, and changed objects.
- The initial Lambda example attempted to call `s3.get_object` for every event, which fails for object deletion events because there is no object to download. Added a deletion-event branch that handles `ObjectRemoved` events separately.
- The deployment instructions referenced the Lambda execution role before the IAM role section created it. Added a sequencing note that the `create-function` command should be run after the role exists.
- The available event type list omitted currently supported S3 notification types including restore delete, replication, lifecycle, Intelligent-Tiering, and object ACL events. Added the missing event types.
- The thumbnail generator imported Pillow but did not mention that Pillow must be packaged or provided by a Lambda layer. Added that requirement.
- The thumbnail generator wrote JPEG thumbnails from PNG/GIF inputs without converting modes such as RGBA, which can fail in Pillow. Added an RGB conversion before saving.
- The thumbnail generator writes objects to S3 but the earlier role policy only granted read access. Added a note that `s3:PutObject` permission is required for the thumbnail prefix.
- The testing section used `aws lambda get-function --query "Configuration.LastModified"` as an invocation check, but that only shows configuration update time. Replaced it with a CloudWatch `Invocations` metric query.
- The retry section attributed failed Lambda retries to S3. Updated it to explain that S3 invokes Lambda asynchronously and Lambda performs the retry/discard behavior.
- The dead-letter queue example did not mention the execution role permission required to send to the queue. Added a note about `sqs:SendMessage` for an SQS DLQ.

## Review Notes
- The local environment did not have the AWS CLI installed, so command syntax was checked against the official AWS CLI documentation rather than local `--help` output.
- Python examples were syntax-checked with Python AST parsing. JSON notification examples were parsed successfully.
