# Validation Summary: How to Use IoT Core Device Defender for Security Audits

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS IoT Core
- AWS IoT Device Defender Audit
- AWS IoT Device Defender Detect
- AWS CLI
- IAM roles and policies
- Amazon SNS
- AWS Lambda
- AWS IoT mitigation actions

## Sources Consulted
- AWS IoT Device Defender documentation: https://aws.amazon.com/documentation-overview/iot-device-defender/
- AWS IoT Device Defender audit checks: https://docs.aws.amazon.com/iot-device-defender/latest/devguide/device-defender-audit-checks.html
- AWS IoT Device Defender audit guide: https://docs.aws.amazon.com/iot-device-defender/latest/devguide/audit-tutorial.html
- AWS CLI `update-account-audit-configuration`: https://docs.aws.amazon.com/cli/latest/reference/iot/update-account-audit-configuration.html
- AWS IoT Device Defender Detect: https://docs.aws.amazon.com/iot-device-defender/latest/devguide/device-defender-detect.html
- AWS IoT Device Defender Detect behaviors: https://docs.aws.amazon.com/iot-device-defender/latest/devguide/detect-behaviors.html
- AWS IoT Device Defender cloud-side metrics: https://docs.aws.amazon.com/iot-device-defender/latest/devguide/detect-cloud-side-metrics.html
- AWS CLI `create-security-profile`: https://docs.aws.amazon.com/cli/latest/reference/iot/create-security-profile.html
- AWS CLI `attach-security-profile`: https://docs.aws.amazon.com/cli/latest/reference/iot/attach-security-profile.html
- AWS IoT Device Defender Detect permissions for SNS: https://docs.aws.amazon.com/iot-device-defender/latest/devguide/device-defender-detect-permissions.html
- AWS IoT Device Defender mitigation actions: https://docs.aws.amazon.com/iot-device-defender/latest/devguide/dd-mitigation-actions.html
- AWS CLI `start-audit-mitigation-actions-task`: https://docs.aws.amazon.com/cli/latest/reference/iot/start-audit-mitigation-actions-task.html
- Amazon EventBridge AWS IoT events reference: https://docs.aws.amazon.com/eventbridge/latest/ref/events-ref-iot.html
- Amazon SNS Lambda subscription prerequisites: https://docs.aws.amazon.com/sns/latest/dg/sns-lambda.html

## Issues Found
- The Detect overview implied that all Detect profiles establish baselines automatically. Updated it to distinguish rule-based profiles, which use thresholds you define, from ML-based profiles, which learn normal behavior.
- The IAM role example used the AWSIoTDeviceDefenderAudit managed policy but then reused that role for SNS notifications. Added a minimal inline `sns:Publish` policy for the notification topic because AWS requires the notification role to be able to publish to SNS.
- Example ARNs used a 9-digit placeholder account ID. Updated them to a 12-digit placeholder account ID (`123456789012`) to match AWS ARN account ID format.
- The security profile target ARN used `all/things`, which is not the documented target for all registered things. Updated it to `all/registered-things`.
- The EventBridge examples used unsupported custom detail types for Device Defender audit findings and detect violations. Replaced that section with SNS subscription examples, which matches the configured Device Defender notification targets.
- The Lambda notification example needed SNS invoke permission on the Lambda function. Added the corresponding `aws lambda add-permission` command before subscribing the Lambda endpoint.

## Review Notes
The AWS CLI was not installed in the local environment, so command validation was performed against the official AWS CLI reference and AWS IoT Device Defender documentation instead of local `aws --help` output.
