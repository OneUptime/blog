# Validation Summary: How to Set Up GuardDuty S3 Protection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon GuardDuty
- GuardDuty S3 Protection
- Amazon S3
- AWS CloudTrail S3 data events
- AWS CLI
- Terraform AWS Provider
- Amazon EventBridge
- Amazon SNS
- AWS Lambda
- Python / boto3

## Sources Consulted
- AWS CLI Command Reference: `guardduty update-detector` - https://docs.aws.amazon.com/cli/latest/reference/guardduty/update-detector.html
- AWS CLI Command Reference: `guardduty create-detector` - https://docs.aws.amazon.com/cli/latest/reference/guardduty/create-detector.html
- Amazon GuardDuty User Guide: Enabling S3 Protection - https://docs.aws.amazon.com/guardduty/latest/ug/data-source-configure.html
- Amazon GuardDuty User Guide: S3 Protection finding types - https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_finding-types-s3.html
- Amazon GuardDuty API Reference: ListFindings - https://docs.aws.amazon.com/guardduty/latest/APIReference/API_ListFindings.html
- Amazon GuardDuty API Reference: OrganizationFeatureConfiguration - https://docs.aws.amazon.com/guardduty/latest/APIReference/API_OrganizationFeatureConfiguration.html
- Amazon GuardDuty User Guide: GuardDuty API changes in March 2023 - https://docs.aws.amazon.com/guardduty/latest/ug/guardduty-feature-object-api-changes-march2023.html
- Terraform Registry: `aws_guardduty_detector_feature` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/guardduty_detector_feature
- Amazon EventBridge User Guide: Event pattern operators - https://docs.aws.amazon.com/eventbridge/latest/userguide/content-filtering-with-event-patterns.html
- Amazon EventBridge User Guide: Resource-based policies - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html
- AWS CLI Command Reference: `guardduty create-threat-intel-set` - https://docs.aws.amazon.com/cli/latest/reference/guardduty/create-threat-intel-set.html
- Amazon GuardDuty API Reference: Resource and S3BucketDetail - https://docs.aws.amazon.com/guardduty/latest/APIReference/API_Resource.html

## Issues Found
- The Terraform example used the deprecated `datasources.s3_logs` configuration on `aws_guardduty_detector`. Updated it to use the current `aws_guardduty_detector_feature` resource with `name = "S3_DATA_EVENTS"` and `status = "ENABLED"`, matching AWS's feature-object model and the Terraform AWS Provider's current resource.
- The EventBridge-to-SNS CLI example added the SNS target but did not grant EventBridge permission to publish to the SNS topic. Added an `aws sns set-topic-attributes` example with a topic policy that allows the `events.amazonaws.com` service principal to call `sns:Publish`.
- The Lambda remediation example claimed to apply a deny-all bucket policy but only denied `s3:GetObject`, and it replaced any existing bucket policy. Updated the code to preserve an existing bucket policy when present, append an emergency deny statement, and deny `s3:*` on both the bucket ARN and object ARN except for the named security role.

## Review Notes
- The AWS CLI and Terraform binaries were not installed in the local environment, so CLI and Terraform examples were verified against official AWS and Terraform documentation rather than local command output.
- The Python Lambda snippet was syntax-checked with Python 3.
