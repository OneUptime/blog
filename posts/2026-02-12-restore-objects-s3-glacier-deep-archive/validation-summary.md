# Validation Summary: How to Restore Objects from S3 Glacier and Glacier Deep Archive

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon S3
- S3 Glacier Flexible Retrieval
- S3 Glacier Deep Archive
- AWS CLI
- boto3 / AWS SDK for Python
- S3 Event Notifications
- AWS Lambda
- Amazon SNS

## Sources Consulted
- Amazon S3 User Guide: Understanding archive retrieval options - https://docs.aws.amazon.com/AmazonS3/latest/userguide/restoring-objects-retrieval-options.html
- Amazon S3 API Reference: RestoreObject - https://docs.aws.amazon.com/AmazonS3/latest/API/API_RestoreObject.html
- AWS CLI Command Reference: restore-object - https://docs.aws.amazon.com/cli/latest/reference/s3api/restore-object.html
- Amazon S3 User Guide: Event notification types and destinations - https://docs.aws.amazon.com/AmazonS3/latest/userguide/notification-how-to-event-types-and-destinations.html
- Amazon S3 User Guide: Amazon S3 Event Notifications - https://docs.aws.amazon.com/AmazonS3/latest/userguide/EventNotifications.html
- Amazon S3 Pricing - https://aws.amazon.com/s3/pricing/
- AWS Price List API for Amazon S3, US East (N. Virginia) - https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonS3/current/us-east-1/index.json
- boto3 S3 client documentation - https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/index.html
- botocore error handling documentation - https://boto3.amazonaws.com/v1/documentation/api/latest/guide/error-handling.html

## Issues Found
- Glacier Flexible Retrieval Bulk retrieval pricing was listed as `$0.0025` per GB. AWS documentation and the current AWS price list state that S3 Glacier Flexible Retrieval Bulk data retrievals and requests are free. Changed the table entry to `Free`.
- The batch restore Python example caught `s3.exceptions.ClientError`, which is not the standard boto3/botocore exception type for generic client errors. Imported `ClientError` from `botocore.exceptions` and changed the handler to `except ClientError as e`.
- The S3 event notification Lambda example used the object key directly from the event. S3 event notification object keys are URL encoded, so keys containing spaces or special characters could be copied or reported incorrectly. Added `unquote_plus` decoding before using the key.
- The bucket notification setup omitted the prerequisite that S3 must have permission to invoke the Lambda destination. Added a short note before the configuration command.

## Review Notes
Pricing varies by AWS Region and can change over time. The post's pricing examples align with common US East (N. Virginia) public pricing after the Glacier Flexible Retrieval Bulk correction, but future reviews should re-check the AWS pricing page or Price List API.
