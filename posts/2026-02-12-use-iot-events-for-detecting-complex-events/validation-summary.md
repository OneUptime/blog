# Validation Summary: How to Use IoT Events for Detecting Complex Events

## Status
not-technically-relevant

## Post Type
Tutorial

## Technologies Covered
- AWS IoT Events
- AWS IoT Core Rules Engine
- AWS CLI
- AWS Lambda
- Amazon SNS
- Amazon CloudWatch
- Amazon DynamoDB
- Amazon SQS

## Sources Consulted
- AWS IoT Events end of support: https://docs.aws.amazon.com/iotevents/latest/developerguide/iotevents-end-of-support.html
- What is AWS IoT Events?: https://docs.aws.amazon.com/iotevents/latest/developerguide/what-is-iotevents.html
- AWS IoT Events pricing: https://aws.amazon.com/iot-events/pricing/
- AWS CLI `iotevents create-input`: https://docs.aws.amazon.com/cli/latest/reference/iotevents/create-input.html
- AWS CLI `iotevents create-detector-model`: https://docs.aws.amazon.com/cli/latest/reference/iotevents/create-detector-model.html
- AWS CLI `iot create-topic-rule`: https://docs.aws.amazon.com/cli/latest/reference/iot/create-topic-rule.html
- AWS CLI `iotevents-data list-detectors`: https://docs.aws.amazon.com/cli/latest/reference/iotevents-data/list-detectors.html
- AWS CLI `iotevents-data describe-detector`: https://docs.aws.amazon.com/cli/latest/reference/iotevents-data/describe-detector.html

## Issues Found
- AWS IoT Events is no longer a usable service as of the validation date. AWS documentation states that the service stopped accepting new customers on May 20, 2025, and that after May 20, 2026 customers can no longer use AWS IoT Events. Because this review was performed on 2026-06-01, the tutorial's core premise and commands are no longer operational.
- The post's examples also contain technical problems that would have needed correction before the service end-of-support date, including JSON snippets with comments in files passed to AWS CLI commands and a detector model that transitions to an `Alarm` state without defining that state. These were not patched because the post is classified as not technically relevant under the review instructions.

## Review Notes
This post should be removed or replaced with a migration-focused article covering supported alternatives such as AWS IoT Core rules with Lambda, Amazon EventBridge, AWS Step Functions, or a custom stream-processing design.
