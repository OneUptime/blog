# Validation Summary: How to Set Up AWS GuardDuty with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu / HCL
- AWS GuardDuty
- AWS Organizations
- Amazon EventBridge
- Amazon SNS
- Amazon S3
- AWS CLI

## Sources Consulted
- HashiCorp Terraform Registry: `aws_guardduty_detector` - https://registry.terraform.io/providers/hashicorp/aws/5.82.0/docs/resources/guardduty_detector
- HashiCorp Terraform Registry: `aws_guardduty_detector_feature` - https://registry.terraform.io/providers/-/aws/5.23.0/docs/resources/guardduty_detector_feature
- HashiCorp Terraform Registry: `aws_guardduty_organization_admin_account` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/guardduty_organization_admin_account
- HashiCorp Terraform Registry: `aws_guardduty_organization_configuration_feature` - https://registry.terraform.io/providers/-/aws/6.2.0/docs/resources/guardduty_organization_configuration_feature?lang=typescript
- HashiCorp Terraform Registry: `aws_cloudwatch_event_target` - https://registry.terraform.io/providers/-/aws/6.38.0/docs/resources/cloudwatch_event_target
- Amazon GuardDuty User Guide: Processing GuardDuty findings with Amazon EventBridge - https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_findings_eventbridge.html
- Amazon EventBridge User Guide: Using resource-based policies for Amazon EventBridge - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html
- Amazon EventBridge User Guide: Comparison operators for use in event patterns - https://docs.aws.amazon.com/eventbridge/latest/userguide/content-filtering-with-event-patterns.html
- Amazon GuardDuty User Guide: Enabling S3 Protection for a standalone account - https://docs.aws.amazon.com/guardduty/latest/ug/data-source-configure.html
- Amazon GuardDuty User Guide: Enabling S3 Protection in multiple-account environments - https://docs.aws.amazon.com/guardduty/latest/ug/s3-multiaccount.html
- Amazon GuardDuty User Guide: Setting organization auto-enable preferences - https://docs.aws.amazon.com/guardduty/latest/ug/set-guardduty-auto-enable-preferences.html
- Amazon GuardDuty User Guide: Setting up prerequisites for entity lists and IP address lists - https://docs.aws.amazon.com/guardduty/latest/ug/guardduty-lists-prerequisites.html
- Amazon GuardDuty API Reference: GetFindings - https://docs.aws.amazon.com/guardduty/latest/APIReference/API_GetFindings.html
- AWS CLI Command Reference: `list-findings` - https://docs.aws.amazon.com/cli/latest/reference/guardduty/list-findings.html

## Issues Found
- The detector example used the deprecated `datasources` configuration on `aws_guardduty_detector`. I replaced it with current `aws_guardduty_detector_feature` resources for `S3_DATA_EVENTS`, `EKS_AUDIT_LOGS`, and `EBS_MALWARE_PROTECTION`.
- The trusted IP list example referenced `data.aws_caller_identity.current.account_id` without declaring the data source. I added the missing `aws_caller_identity` data block so the snippet is complete.
- The EventBridge-to-SNS example omitted the SNS topic policy required for `events.amazonaws.com` to publish to the topic. I added an `aws_iam_policy_document`, `aws_sns_topic_policy`, and an explicit dependency from the target.
- The EventBridge input transformer used the top-level `$.account` field. For GuardDuty findings in multi-account setups, the originating account is exposed in the finding payload as `detail.accountId`, so I updated the input path accordingly.
- The EventBridge rule description said it alerted on HIGH severity findings, but the numeric filter `>= 7` matches both HIGH and CRITICAL findings. I corrected the description and comment to match the actual behavior.
- The organization example used datasource-style configuration in `aws_guardduty_organization_configuration`. I replaced that with current `aws_guardduty_organization_configuration_feature` resources and clarified that the delegated admin designation runs in the Organizations management account while organization configuration runs in the delegated GuardDuty administrator account.

## Review Notes
- GuardDuty is regional. Detector configuration and organization auto-enable preferences need to be applied in each AWS Region you want protected.
- The SNS target example now includes the required publish permission. If the SNS topic policy is managed elsewhere, the same allow statement still needs to be present in the topic's effective policy.
