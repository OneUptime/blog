# Validation Summary: How to Share CloudWatch Dashboards Across Accounts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon CloudWatch dashboards
- CloudWatch dashboard sharing
- AWS IAM and STS role assumption
- Amazon Cognito
- SAML SSO
- CloudWatch cross-account observability
- AWS CloudFormation StackSets
- AWS Organizations SCPs

## Sources Consulted
- Amazon CloudWatch User Guide: Sharing CloudWatch dashboards - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch-dashboard-sharing.html
- Amazon CloudWatch User Guide: Sharing a CloudWatch dashboard publicly - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/share-cloudwatch-dashboard-public.html
- Amazon CloudWatch User Guide: Sharing a CloudWatch dashboard with specific users - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/share-cloudwatch-dashboard-email-addresses.html
- Amazon CloudWatch User Guide: Setting up SSO for CloudWatch dashboard sharing - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/share-cloudwatch-dashboards-setup-SSO.html
- Amazon CloudWatch User Guide: Using Amazon CloudWatch dashboards - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Dashboards.html
- Amazon CloudWatch User Guide: CloudWatch cross-account observability - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Unified-Cross-Account.html
- AWS CLI Command Reference: cloudwatch - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/
- AWS CLI Command Reference: iam create-role - https://docs.aws.amazon.com/cli/latest/reference/iam/create-role.html
- AWS CLI Command Reference: iam put-role-policy - https://docs.aws.amazon.com/cli/latest/reference/iam/put-role-policy.html
- AWS CLI Command Reference: sts assume-role - https://docs.aws.amazon.com/cli/latest/reference/sts/assume-role.html
- AWS CLI Command Reference: cloudformation create-stack-set - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/create-stack-set.html
- Amazon CloudWatch API Reference: Actions - https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_Operations.html

## Issues Found
- The post described cross-account IAM role assumption as one of CloudWatch's three built-in dashboard sharing options. AWS documents the three built-in sharing modes as specific email addresses with username/password, public link, and all dashboards through a third-party SAML SSO provider. I changed the option list and reframed the IAM role example as ordinary cross-account IAM access rather than built-in dashboard sharing.
- The post claimed CloudWatch dashboard sharing supports IAM Identity Center/AWS SSO with a dashboard-level CLI sharing configuration. AWS documents dashboard sharing SSO as third-party SAML SSO integrated through Amazon Cognito, and the sharing applies to all dashboards in the account. I replaced the non-existent CLI configuration with the documented console/Cognito setup flow.
- The post included non-existent AWS CLI commands: `aws cloudwatch enable-dashboard-sharing` and `aws cloudwatch put-dashboard-sharing-configuration`. These commands are not listed in the current AWS CLI CloudWatch command reference or CloudWatch API actions. I removed those examples and noted that AWS does not provide a CloudWatch API or CLI command to enable dashboard sharing directly.
- The post said CloudWatch creates a CloudFront distribution for public dashboard sharing and showed an API Gateway-style URL. AWS's current CloudWatch documentation states that dashboard sharing creates Amazon Cognito resources in us-east-1 and IAM resources. I removed the unsupported CloudFront/API Gateway implementation detail.
- The post suggested using Cognito `admin-create-user` to add password-protected users to a shared dashboard. AWS documents this as a CloudWatch console sharing flow with up to five email addresses. I replaced the direct Cognito command with the documented CloudWatch sharing flow.
- The security guidance said to rotate public link credentials. Public dashboard links have no authentication credentials. I changed the guidance to treat public links as secrets and stop/recreate sharing if a link is exposed.
- The security guidance implied CloudTrail can identify everyone accessing dashboards, including public-link viewers. I clarified that CloudTrail is useful for dashboard and sharing configuration changes, but should not be relied on to identify individual anonymous public viewers.
- The log-widget warning did not mention that CloudWatch Logs Insights widgets are hidden by default in shared dashboards. I added the documented default behavior and kept the warning for cases where log-widget permissions are explicitly enabled.

## Review Notes
The IAM and STS examples are syntactically valid as generic cross-account role access examples, but they are not a substitute for CloudWatch's built-in dashboard sharing workflows. The cross-account dashboard JSON uses documented `accountId` and `region` fields for metric definitions.
