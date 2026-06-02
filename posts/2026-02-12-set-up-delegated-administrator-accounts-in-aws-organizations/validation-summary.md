# Validation Summary: How to Set Up Delegated Administrator Accounts in AWS Organizations

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- AWS Organizations
- AWS delegated administrator accounts
- AWS CLI
- AWS Security Hub CSPM
- Amazon GuardDuty
- AWS Config
- AWS CloudFormation StackSets
- AWS Backup
- AWS CloudFormation
- AWS Lambda custom resources

## Sources Consulted
- AWS Organizations delegated administrator documentation: https://docs.aws.amazon.com/organizations/latest/userguide/orgs_integrate_delegated_admin.html
- AWS Config delegated administrator documentation: https://docs.aws.amazon.com/config/latest/developerguide/aggregated-register-delegated-administrator.html
- AWS CloudFormation StackSets delegated administrator documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/stacksets-orgs-delegated-admin.html
- AWS CloudFormation StackSets trusted access documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/stacksets-orgs-activate-trusted-access.html
- AWS CLI `cloudformation create-stack-set` reference: https://docs.aws.amazon.com/cli/latest/reference/cloudformation/create-stack-set.html
- AWS CLI `securityhub enable-organization-admin-account` reference: https://docs.aws.amazon.com/cli/latest/reference/securityhub/enable-organization-admin-account.html
- AWS CLI `securityhub update-organization-configuration` reference: https://docs.aws.amazon.com/cli/latest/reference/securityhub/update-organization-configuration.html
- AWS Organizations GuardDuty integration documentation: https://docs.aws.amazon.com/organizations/latest/userguide/services-that-can-integrate-guardduty.html
- AWS CLI `guardduty update-organization-configuration` reference: https://docs.aws.amazon.com/cli/latest/reference/guardduty/update-organization-configuration.html
- AWS Backup cross-account management documentation: https://docs.aws.amazon.com/aws-backup/latest/devguide/manage-cross-account.html
- AWS CLI `backup update-global-settings` reference: https://docs.aws.amazon.com/cli/latest/reference/backup/update-global-settings.html
- AWS CloudFormation `AWS::SecurityHub::DelegatedAdmin` reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-securityhub-delegatedadmin.html
- AWS CloudFormation GuardDuty resource type reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/AWS_GuardDuty.html

## Issues Found
- The prerequisites said the target service must be enabled in the organization. Updated this to distinguish trusted access requirements from enabling services in target Regions.
- The general Organizations API example registered a delegated administrator without first enabling trusted access. Added `aws organizations enable-aws-service-access` before registration.
- The GuardDuty setup omitted the required trusted access step for CLI/API setup. Added `aws organizations enable-aws-service-access --service-principal guardduty.amazonaws.com`.
- The AWS Config setup omitted the trusted access step required for organization rules and conformance packs. Added `aws organizations enable-aws-service-access --service-principal config-multiaccountsetup.amazonaws.com`.
- The StackSets trusted access command used `organizations enable-aws-service-access` with the StackSets member service principal. Replaced it with the current `aws cloudformation activate-organizations-access` command.
- The AWS Backup example used `update-region-settings` to enable cross-account management. Replaced it with `update-global-settings`, which is the correct API for cross-account backup and delegated administrator settings.
- The CloudFormation template used the wrong property name for `AWS::SecurityHub::DelegatedAdmin`. Changed `DelegatedAdminAccountId` to `AdminAccountId`.
- The CloudFormation template represented GuardDuty delegated administration with `AWS::GuardDuty::Detector`, which only creates a detector and does not designate an organization administrator. Replaced it with a custom resource that calls GuardDuty's `EnableOrganizationAdminAccount` and `DisableOrganizationAdminAccount` APIs.
- The Lambda custom resource did not enable trusted service access before direct Organizations delegated-admin registration. Updated the custom resource to call `EnableAWSServiceAccess` before `RegisterDelegatedAdministrator` and added the required IAM permissions.

## Review Notes
Local `aws` CLI help was not available in the review environment, so command validation was performed against the current official AWS CLI command reference and service documentation. The CloudFormation automation sample is still intentionally high-level; in production, make custom resources idempotent across repeated updates and add service-specific handling for every delegated administrator service you include.
