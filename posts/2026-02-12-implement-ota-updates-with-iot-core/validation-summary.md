# Validation Summary: How to Implement OTA Updates with IoT Core

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS IoT Core Jobs
- AWS IoT Jobs MQTT API
- Amazon S3
- AWS CLI
- MQTT
- Python
- Firmware OTA update workflows

## Sources Consulted
- AWS IoT Core Developer Guide: Jobs key concepts - https://docs.aws.amazon.com/iot/latest/developerguide/key-concepts-jobs.html
- AWS IoT Core Developer Guide: Managing jobs and presigned URLs - https://docs.aws.amazon.com/iot/latest/developerguide/create-manage-jobs.html
- AWS IoT Core Developer Guide: Create and manage jobs by using the AWS CLI - https://docs.aws.amazon.com/iot/latest/developerguide/manage-job-cli.html
- AWS IoT Core Developer Guide: Jobs device MQTT API operations - https://docs.aws.amazon.com/iot/latest/developerguide/jobs-mqtt-api.html
- AWS CLI Command Reference: aws iot create-job - https://docs.aws.amazon.com/cli/latest/reference/iot/create-job.html
- AWS CLI Command Reference: aws s3 presign - https://docs.aws.amazon.com/cli/latest/reference/s3/presign.html
- AWS CLI Command Reference: aws s3 cp - https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html
- AWS IoT Device SDK for Python v2 documentation - https://aws.github.io/aws-iot-device-sdk-python-v2/

## Issues Found
- The job document example was marked as JSON but included a JavaScript-style comment, which would make `ota-job-document.json` invalid JSON. Removed the comment from inside the code block.
- The `aws iot create-job` example used S3 presigned URL placeholders in the job document but did not include `--presigned-url-config`. Added the required configuration with an example IAM role ARN and `expiresInSec`.
- The post implied the Jobs-generated presigned URL duration was configured but did not show the configuration or its AWS limit. Added a short explanation that IoT Jobs uses the IAM role in `--presigned-url-config` and supports 60 to 3600 seconds for generated S3 presigned URLs.

## Review Notes
The Python agent is a simplified device-side example, not a complete runnable daemon. A production implementation should include MQTT connection setup, topic subscriptions for accepted/rejected responses, HTTP timeout handling, resumable downloads, signature verification, and robust rollback logic.
