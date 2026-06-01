# Validation Summary: How to Set Up X-Ray Sampling Rules

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS X-Ray
- X-Ray sampling rules
- AWS CLI
- AWS CloudFormation
- Python boto3
- Amazon CloudWatch pricing

## Sources Consulted
- AWS X-Ray Developer Guide: Configuring sampling rules - https://docs.aws.amazon.com/xray/latest/devguide/xray-console-sampling.html
- AWS X-Ray Developer Guide: Using sampling rules with the X-Ray API - https://docs.aws.amazon.com/xray/latest/devguide/xray-api-sampling.html
- AWS X-Ray Developer Guide: Configuring sampling, groups, and encryption settings with the X-Ray API - https://docs.aws.amazon.com/xray/latest/devguide/xray-api-configuration.html
- AWS CLI Command Reference: create-sampling-rule - https://docs.aws.amazon.com/cli/v1/reference/xray/create-sampling-rule.html
- AWS CLI Command Reference: update-sampling-rule - https://docs.aws.amazon.com/cli/v1/reference/xray/update-sampling-rule.html
- AWS CloudFormation Template Reference: AWS::XRay::SamplingRule SamplingRule - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-xray-samplingrule-samplingrule.html
- Boto3 documentation: XRay.Client.update_sampling_rule - https://docs.aws.amazon.com/boto3/latest/reference/services/xray/client/update_sampling_rule.html
- Amazon CloudWatch Pricing: X-Ray traces - https://aws.amazon.com/cloudwatch/pricing/
- AWS X-Ray Developer Guide: X-Ray SDK and Daemon Support timeline - https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-daemon-timeline.html

## Issues Found
- The console navigation used the old X-Ray-oriented path. Updated it to the current CloudWatch console path for sampling rules under X-Ray traces.
- The AWS CLI `create-sampling-rule` examples specified both `RuleName` and `RuleARN`. AWS documentation says to specify a rule by either name or ARN, but not both. Removed `RuleARN` from the create examples.
- The reservoir description said it guaranteed a fixed number of traces. AWS documents the reservoir as a target that applies collectively across services using the rule. Updated the reservoir explanation and examples to use target/approximate language.
- The pricing section mentioned retrieval but not scanning. Current CloudWatch pricing bills X-Ray traces recorded and traces retrieved or scanned. Updated the wording and clarified that the simple calculations are before free tier.
- The post did not mention the current X-Ray SDK and daemon maintenance status. Added a short note that as of February 25, 2026, AWS recommends OpenTelemetry-based instrumentation for new work while X-Ray sampling rules still apply to compatible services and SDKs.

## Review Notes
The local environment did not have the AWS CLI installed, so command validation was performed against the official AWS CLI and service documentation rather than local `aws --help` output.
