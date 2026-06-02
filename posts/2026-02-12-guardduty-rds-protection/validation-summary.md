# Validation Summary: How to Set Up GuardDuty RDS Protection

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon GuardDuty
- GuardDuty RDS Protection
- Amazon Aurora
- Amazon RDS for PostgreSQL
- Aurora PostgreSQL Limitless Database
- AWS CLI
- Terraform AWS Provider
- AWS CloudFormation
- Amazon EventBridge
- Amazon SNS
- AWS Lambda
- AWS Secrets Manager

## Sources Consulted
- Amazon GuardDuty User Guide: GuardDuty RDS Protection: https://docs.aws.amazon.com/guardduty/latest/ug/rds-protection.html
- Amazon GuardDuty User Guide: Enabling RDS Protection for a standalone account: https://docs.aws.amazon.com/guardduty/latest/ug/configure-rds-pro-standalone.html
- Amazon GuardDuty User Guide: Enabling RDS Protection in multiple-account environments: https://docs.aws.amazon.com/guardduty/latest/ug/configure-rds-pro-multi-account.html
- Amazon GuardDuty User Guide: GuardDuty RDS Protection finding types: https://docs.aws.amazon.com/guardduty/latest/ug/findings-rds-protection.html
- AWS CLI Command Reference: guardduty update-organization-configuration: https://docs.aws.amazon.com/cli/latest/reference/guardduty/update-organization-configuration.html
- AWS CLI Command Reference: guardduty get-usage-statistics: https://docs.aws.amazon.com/cli/latest/reference/guardduty/get-usage-statistics.html
- AWS CloudFormation Template Reference: AWS::GuardDuty::Detector: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-guardduty-detector.html
- Terraform Registry: aws_guardduty_detector_feature: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/guardduty_detector_feature
- Amazon GuardDuty API Reference: RdsDbUserDetails: https://docs.aws.amazon.com/guardduty/latest/APIReference/API_RdsDbUserDetails.html
- Amazon GuardDuty API Reference: RdsLoginAttemptAction: https://docs.aws.amazon.com/guardduty/latest/APIReference/API_RdsLoginAttemptAction.html

## Issues Found
- The post said RDS Protection currently supports only Amazon Aurora. Updated the description and monitoring sections to include Amazon RDS for PostgreSQL and Aurora PostgreSQL Limitless Database on supported engine versions.
- The finding types list omitted the current Tor-based RDS Protection findings. Added the successful login, failed login, and discovery/probing Tor finding types.
- The description for `Discovery:RDS/MaliciousIPCaller` incorrectly framed it as RDS discovery API calls. Updated it to describe database probing with no authentication attempt.
- The Terraform snippet included an empty `datasources` block. Removed it and kept the current `aws_guardduty_detector_feature` approach for `RDS_LOGIN_EVENTS`.
- The `list-findings` example claimed to find all RDS findings but omitted several RDS finding types. Added the missing malicious IP failed-login, discovery, and Tor finding types.
- The organization setup command used `AutoEnable: ALL` but did not include the required organization auto-enable setting. Added `--auto-enable-organization-members ALL` and clarified that `ALL` applies to existing and new accounts.
- The usage statistics command used `SUM_BY_DATA_SOURCE` and `DataSources` for `RDS_LOGIN_EVENTS`. Updated it to `SUM_BY_FEATURES` and `Features`, which is the current AWS CLI shape for this GuardDuty feature.

## Review Notes
The Lambda example is syntactically valid Python and uses current boto3 API names, but it assumes a specific Secrets Manager secret naming convention and focuses on RDS DB instance findings. Real deployments should also account for Aurora Limitless finding resource details and existing Secrets Manager rotation configuration.
