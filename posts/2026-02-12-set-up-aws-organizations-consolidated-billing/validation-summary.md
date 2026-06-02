# Validation Summary: How to Set Up AWS Organizations Consolidated Billing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Organizations
- AWS consolidated billing
- AWS Billing and Cost Management
- AWS Cost Explorer and cost allocation tags
- AWS Cost Anomaly Detection
- AWS Budgets
- AWS CloudTrail
- AWS CLI

## Sources Consulted
- AWS CLI Command Reference: create-organization - https://docs.aws.amazon.com/cli/latest/reference/organizations/create-organization.html
- AWS CLI Command Reference: invite-account-to-organization - https://docs.aws.amazon.com/cli/latest/reference/organizations/invite-account-to-organization.html
- AWS CLI Command Reference: list-handshakes-for-organization - https://docs.aws.amazon.com/cli/latest/reference/organizations/list-handshakes-for-organization.html
- AWS CLI Command Reference: create-account - https://docs.aws.amazon.com/cli/latest/reference/organizations/create-account.html
- AWS CLI Command Reference: move-account - https://docs.aws.amazon.com/cli/latest/reference/organizations/move-account.html
- AWS CLI Command Reference: update-cost-allocation-tags-status - https://docs.aws.amazon.com/cli/latest/reference/ce/update-cost-allocation-tags-status.html
- AWS CLI Command Reference: create-anomaly-monitor - https://docs.aws.amazon.com/cli/latest/reference/ce/create-anomaly-monitor.html
- AWS CLI Command Reference: create-anomaly-subscription - https://docs.aws.amazon.com/cli/latest/reference/ce/create-anomaly-subscription.html
- AWS CLI Command Reference: create-budget - https://docs.aws.amazon.com/cli/latest/reference/budgets/create-budget.html
- AWS CLI Command Reference: create-trail - https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/create-trail.html
- AWS CloudTrail User Guide: create a trail using the AWS CLI - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-create-and-update-a-trail-by-using-the-aws-cli-create-trail.html
- AWS Billing User Guide: Reserved Instances and Savings Plans discount sharing - https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/ri-turn-off.html
- AWS Cost Management User Guide: Controlling access to Cost Explorer - https://docs.aws.amazon.com/cost-management/latest/userguide/ce-access.html
- Amazon S3 Pricing - https://aws.amazon.com/s3/pricing/

## Issues Found
- The S3 pricing example did not specify the storage class or region. Updated it to identify S3 Standard storage in US East (N. Virginia), where the listed tier prices apply.
- The Reserved Instance and Savings Plans sharing section used `aws organizations describe-organization` to check sharing and `aws ce update-preferences --member-account-discount-visibility NONE` to disable it. Those commands do not manage RI/Savings Plans discount sharing. Replaced the command block with the correct Billing and Cost Management console location and clarified that this is not exposed through `describe-organization`.
- The Cross-Account Cost Visibility section described `aws ce update-cost-allocation-tags-status` as enabling Cost Explorer for all member accounts. That command only activates cost allocation tags. Updated the text to explain that Cost Explorer is enabled from the management account root user and member access is controlled in Cost Management Preferences.
- The Cost Anomaly Detection subscription used the deprecated `Threshold` field. Replaced it with `ThresholdExpression` using `ANOMALY_TOTAL_IMPACT_ABSOLUTE` and `GREATER_THAN_OR_EQUAL`.
- The AWS Budgets notifications omitted `ThresholdType`. Added `ThresholdType: PERCENTAGE` to make the examples explicit and match the intended 80% and 100% thresholds.
- The CloudTrail example created an organization trail but did not start logging. Added `aws cloudtrail start-logging --name organization-trail`, which AWS documents as required after creating a trail with the CLI.

## Review Notes
The local environment does not have the AWS CLI installed, so command validation was performed against the official AWS CLI and AWS service documentation rather than local `aws help` output.
