# Validation Summary: How to Create Control Tower with Terraform

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Control Tower
- AWS Organizations
- AWS Control Tower Account Factory for Terraform (AFT)
- Terraform AWS Provider
- AWS Service Control Policies
- AWS IAM cross-account roles
- Amazon CloudWatch Logs destinations

## Sources Consulted
- AWS Control Tower API Reference: CreateLandingZone: https://docs.aws.amazon.com/controltower/latest/APIReference/API_CreateLandingZone.html
- Terraform AWS Provider: aws_controltower_landing_zone: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/controltower_landing_zone
- AWS Control Tower Controls Reference: Resource identifiers for APIs and controls: https://docs.aws.amazon.com/controltower/latest/controlreference/control-identifiers.html
- AWS Control Tower Controls Reference: Control API examples: https://docs.aws.amazon.com/controltower/latest/controlreference/control-api-examples-short.html
- AWS Control Tower Controls Reference: Elective controls with preventive behavior: https://docs.aws.amazon.com/controltower/latest/controlreference/elective-preventive-controls.html
- AWS Prescriptive Guidance: Deploy and manage AWS Control Tower controls by using Terraform: https://docs.aws.amazon.com/prescriptive-guidance/latest/patterns/deploy-and-manage-aws-control-tower-controls-by-using-terraform.html
- AWS Control Tower User Guide: Deploy AWS Control Tower Account Factory for Terraform: https://docs.aws.amazon.com/controltower/latest/userguide/aft-getting-started.html
- AWS Control Tower User Guide: Provision a new account with AFT: https://docs.aws.amazon.com/controltower/latest/userguide/aft-provision-account.html
- AWS Control Tower User Guide: The AWSControlTowerExecution role, explained: https://docs.aws.amazon.com/controltower/latest/userguide/awscontroltowerexecution.html
- AWS Organizations User Guide: Accessing member accounts in an organization: https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_accounts_access.html
- Amazon CloudWatch Logs User Guide: Create a destination: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CreateDestination-Account.html
- Terraform AWS Provider: aws_organizations_organization data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/organizations_organization
- Terraform AWS Provider: aws_cloudwatch_log_destination_policy: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_destination_policy

## Issues Found
- The post stated that the initial Control Tower landing zone setup must happen through the AWS console. Updated this to note that teams often use the console, but AWS APIs and the Terraform AWS provider can manage landing zones.
- The Control Tower controls example labeled elective controls as mandatory. Updated the comment to "strongly recommended and elective controls."
- The root MFA example used `AWS-GR_RESTRICT_ROOT_USER`, which restricts root-user actions rather than checking root MFA. Changed it to `AWS-GR_ROOT_ACCOUNT_MFA_ENABLED`.
- The internet access control identifier `AWS-GR_RESTRICT_INTERNET_ACCESS` was incorrect. Changed it to `AWS-GR_DISALLOW_VPC_INTERNET_ACCESS`.
- The encryption control used `AWS-GR_EBS_OPTIMIZED_INSTANCE`, which checks EBS optimization rather than encryption. Changed the encryption example to `AWS-GR_ENCRYPTED_VOLUMES` and kept `AWS-GR_EBS_OPTIMIZED_INSTANCE` as a separate control.
- The tag policies control identifier `AWS-GR_TAG_POLICIES_ENABLED` could not be verified as a Control Tower control. Removed that resource from the example.
- The text said control identifiers vary by region. Updated it to reflect current AWS guidance that regional ARNs are legacy and global Control Catalog ARNs are recommended.
- The AFT deployment example only listed two repositories. Added the global customizations and account provisioning customizations repositories that AFT supports and commonly creates.
- The AFT example pinned Terraform `1.7.0`; current AFT documentation lists `1.6.1` as the default and minimum supported version. Changed the example to `1.6.1`.
- The AFT account request used `ManagedOrganizationalUnit = "Workloads/Production"`, but AFT supports `OUName` or `OUName (OU-ID)` formats rather than slash-separated OU paths. Changed the example to `Production (ou-abcd-12345678)`.
- The cross-account access example created an `OrganizationAccountAccessRole` in the child account, which is not the usual Control Tower access role for vended accounts and was incomplete without permissions. Replaced it with a Terraform provider `assume_role` example using `AWSControlTowerExecution`.
- The CloudWatch Logs destination policy used the organization root ID as an AWS principal. Changed the policy to allow principal `"*"` with an `aws:PrincipalOrgID` condition using the organization ID.
- Added the missing `production_account_id` variable required by the new cross-account provider example.

## Review Notes
The Terraform snippets are illustrative and still omit surrounding provider aliases and referenced resources such as the Kinesis stream and IAM role for CloudWatch Logs. That is acceptable for a blog guide, but a full working module would need those resources and provider configurations included.
