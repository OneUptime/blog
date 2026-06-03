# Validation Summary: How to Enable Amazon GuardDuty for Threat Detection

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon GuardDuty
- AWS CLI
- Amazon EventBridge
- Amazon SNS
- AWS Lambda with Python and Boto3
- Terraform AWS Provider
- Amazon S3
- Amazon EKS
- Amazon EBS Malware Protection
- AWS Lambda network activity monitoring
- Amazon RDS login activity monitoring

## Sources Consulted
- AWS CLI Command Reference: `guardduty create-detector` - https://docs.aws.amazon.com/cli/latest/reference/guardduty/create-detector.html
- AWS CLI Command Reference: `guardduty update-detector` - https://docs.aws.amazon.com/cli/latest/reference/guardduty/update-detector.html
- Boto3 GuardDuty `update_detector` reference - https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/guardduty/client/update_detector.html
- Amazon GuardDuty User Guide: Processing GuardDuty findings with Amazon EventBridge - https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_findings_eventbridge.html
- Amazon GuardDuty User Guide: Severity levels of GuardDuty findings - https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_findings-severity.html
- AWS CLI Command Reference: `guardduty create-threat-intel-set` - https://docs.aws.amazon.com/cli/latest/reference/guardduty/create-threat-intel-set.html
- AWS CLI Command Reference: `guardduty create-ip-set` - https://docs.aws.amazon.com/cli/latest/reference/guardduty/create-ip-set.html
- Amazon GuardDuty User Guide: Customizing threat detection with entity lists and IP address lists - https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_upload-lists.html
- Amazon GuardDuty User Guide: Setting up prerequisites for entity lists and IP address lists - https://docs.aws.amazon.com/guardduty/latest/ug/guardduty-lists-prerequisites.html
- Terraform AWS Provider `aws_guardduty_detector` resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/guardduty_detector
- Terraform AWS Provider `aws_guardduty_detector_feature` resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/guardduty_detector_feature

## Issues Found
- The post said `finding-publishing-frequency` determines how often findings are published to EventBridge. AWS documents that new findings are sent in near real time and this setting controls subsequent occurrences of existing findings. Updated the wording.
- The S3 protection CLI example used the older `--data-sources` shape. Updated it to the current detector feature API with `S3_DATA_EVENTS`.
- The Terraform example used the deprecated nested `datasources` block on `aws_guardduty_detector` and did not include all protection plans shown in the CLI section. Replaced it with current `aws_guardduty_detector_feature` resources for S3 data events, EKS audit logs, EKS runtime monitoring with EKS add-on management, EBS malware protection, Lambda network logs, and RDS login events.
- The severity range was listed as `0` to `10` and Low as `0.1 - 3.9`; AWS documents GuardDuty severity values as `1.0` to `10.0`. Corrected the range and Low severity lower bound.
- The custom threat intelligence section said `create-threat-intel-set` can be used for IP addresses or domains. AWS CLI `create-threat-intel-set` is for threat intelligence IP lists, while domain-based lists are handled by GuardDuty entity lists. Updated the wording.

## Review Notes
- The GuardDuty CLI feature names used in the post are current as of the review date. AWS notes that `EKS_RUNTIME_MONITORING` and broader `RUNTIME_MONITORING` are mutually exclusive; the post only enables `EKS_RUNTIME_MONITORING`, so the example is valid.
- GuardDuty detector and feature availability can vary by AWS Region, so readers may still need to check regional support before applying every feature in every account.
