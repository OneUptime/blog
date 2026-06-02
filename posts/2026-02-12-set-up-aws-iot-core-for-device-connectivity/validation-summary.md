# Validation Summary: How to Set Up AWS IoT Core for Device Connectivity

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS IoT Core
- AWS CLI
- MQTT
- X.509 certificates and TLS
- AWS IoT policies
- AWS IoT Device SDK for Python v2
- Device shadows
- Thing registry, thing types, and thing groups
- Bulk thing provisioning
- CloudWatch logging for AWS IoT Core

## Sources Consulted
- AWS IoT Core Developer Guide: Create a thing - https://docs.aws.amazon.com/iot/latest/developerguide/create-thing.html
- AWS CLI Command Reference: create-thing - https://docs.aws.amazon.com/cli/latest/reference/iot/create-thing.html
- AWS CLI Command Reference: create-thing-type - https://docs.aws.amazon.com/cli/latest/reference/iot/create-thing-type.html
- AWS IoT Core Developer Guide: Create AWS IoT client certificates - https://docs.aws.amazon.com/iot/latest/developerguide/device-certs-create.html
- AWS CLI Command Reference: create-keys-and-certificate - https://docs.aws.amazon.com/cli/latest/reference/iot/create-keys-and-certificate.html
- AWS CLI Command Reference: attach-thing-principal - https://docs.aws.amazon.com/cli/latest/reference/iot/attach-thing-principal.html
- AWS CLI Command Reference: attach-policy - https://docs.aws.amazon.com/cli/latest/reference/iot/attach-policy.html
- AWS IoT Core Developer Guide: Thing policy variables - https://docs.aws.amazon.com/iot/latest/developerguide/thing-policy-variables.html
- AWS IoT Core Developer Guide: AWS IoT Device SDK tutorial - https://docs.aws.amazon.com/iot/latest/developerguide/sdk-tutorials.html
- AWS IoT Core Developer Guide: Server authentication - https://docs.aws.amazon.com/iot/latest/developerguide/server-authentication.html
- AWS CLI Command Reference: create-thing-group - https://docs.aws.amazon.com/cli/latest/reference/iot/create-thing-group.html
- AWS IoT Core Developer Guide: Bulk registration - https://docs.aws.amazon.com/iot/latest/developerguide/bulk-provisioning.html
- AWS CLI Command Reference: start-thing-registration-task - https://docs.aws.amazon.com/cli/latest/reference/iot/start-thing-registration-task.html
- AWS CLI Command Reference: register-thing - https://docs.aws.amazon.com/cli/latest/reference/iot/register-thing.html
- Amazon Trust Services Root CA repository - https://www.amazontrust.com/repository/AmazonRootCA1.pem

## Issues Found
- The thing creation command referenced the `TemperatureSensor` thing type before the tutorial created that type. I reordered the text and snippets so the thing type is created first, then the thing is created with `--thing-type-name`.
- The bulk registration section used `aws iot register-thing`, which provisions a single thing from a provisioning template and parameters. I changed the command to `aws iot start-thing-registration-task` with the required provisioning template, S3 input file bucket/key, and IAM role ARN, matching AWS's documented bulk registration workflow.

## Review Notes
- The AWS IoT Device SDK for Python v2 example uses the documented `mqtt_connection_builder.mtls_from_path` API and MQTT publish/subscribe calls.
- The IoT policy variables are valid for MQTT connections when the certificate is attached to the thing and the client ID matches the thing name, as the example does.
- The ATS endpoint guidance is current; AWS documents `iot:Data-ATS` as the supported endpoint type and marks Symantec/Verisign certificates as deprecated and no longer supported.
- The local environment did not have the AWS CLI installed, so CLI validation was performed against the official AWS CLI command reference.
