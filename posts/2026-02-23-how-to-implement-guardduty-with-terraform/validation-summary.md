# Validation Summary: How to Implement GuardDuty with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS Provider for Terraform
- Amazon GuardDuty
- AWS Organizations
- Amazon EventBridge / CloudWatch Events
- Amazon SNS
- AWS Lambda
- Amazon S3
- AWS KMS
- Amazon VPC security groups

## Sources Consulted
- Terraform AWS Provider `aws_guardduty_detector`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/guardduty_detector
- Terraform AWS Provider `aws_guardduty_detector_feature`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/guardduty_detector_feature
- Terraform AWS Provider `aws_guardduty_organization_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/guardduty_organization_configuration
- Terraform AWS Provider `aws_guardduty_organization_configuration_feature`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/guardduty_organization_configuration_feature
- Terraform AWS Provider `aws_guardduty_member`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/guardduty_member
- Terraform AWS Provider `aws_guardduty_filter`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/guardduty_filter
- Terraform AWS Provider `aws_guardduty_ipset`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/guardduty_ipset
- Terraform AWS Provider `aws_guardduty_threatintelset`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/guardduty_threatintelset
- Terraform AWS Provider `aws_guardduty_publishing_destination`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/guardduty_publishing_destination
- Terraform AWS Provider `aws_cloudwatch_event_rule` and `aws_cloudwatch_event_target`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_rule and https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_target
- Amazon GuardDuty severity levels: https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_findings-severity.html
- Amazon GuardDuty EventBridge integration: https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_findings_eventbridge.html
- Amazon EventBridge event pattern operators: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-pattern-operators.html
- Amazon GuardDuty IP and threat list guidance: https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_upload-lists.html
- Amazon GuardDuty findings export to S3: https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_exportfindings.html

## Issues Found
- The basic detector example used the deprecated `datasources` block on `aws_guardduty_detector`. Replaced it with current `aws_guardduty_detector_feature` resources for `S3_DATA_EVENTS`, `EKS_AUDIT_LOGS`, and `EBS_MALWARE_PROTECTION`.
- The organization configuration example used the deprecated `datasources` block, and the Kubernetes organization example used `auto_enable` where the deprecated nested block expected `enable`. Replaced the feature enrollment with current `aws_guardduty_organization_configuration_feature` resources using `auto_enable = "ALL"`.
- The GuardDuty IP set and threat intelligence set examples used `s3://` locations. Updated them to the HTTPS S3 object URI format shown in the Terraform AWS provider examples for these resources.
- Updated the summary wording from "all data sources" to "the right features" to align with the current GuardDuty feature-based Terraform resources.

## Review Notes
The EventBridge severity filters use numeric matching, which is supported by EventBridge and aligns with GuardDuty severity ranges. The Lambda remediation section is intentionally illustrative and still requires the omitted Lambda package and IAM role definitions in a complete deployment.
