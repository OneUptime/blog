# Validation Summary: How to Aggregate Security Hub Findings Across Accounts

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Security Hub CSPM
- AWS Organizations
- AWS Security Hub delegated administrator and member accounts
- Security Hub cross-Region finding aggregation
- Security Hub central configuration and configuration policies
- AWS CLI
- Amazon EventBridge
- AWS Lambda with Boto3
- Terraform AWS Provider

## Sources Consulted
- AWS Security Hub User Guide: Integrating Security Hub CSPM with AWS Organizations - https://docs.aws.amazon.com/securityhub/latest/userguide/designate-orgs-admin-account.html
- AWS Security Hub User Guide: Understanding cross-Region aggregation - https://docs.aws.amazon.com/securityhub/latest/userguide/security-hub-region-aggregation.html
- AWS Security Hub User Guide: Enabling central configuration - https://docs.aws.amazon.com/securityhub/latest/userguide/start-central-configuration.html
- AWS Security Hub User Guide: Creating and associating configuration policies - https://docs.aws.amazon.com/securityhub/latest/userguide/create-associate-policy.html
- AWS Security Hub User Guide: CIS AWS Foundations Benchmark ARNs - https://docs.aws.amazon.com/securityhub/latest/userguide/cis-aws-foundations-benchmark.html
- AWS CLI Command Reference: securityhub create-finding-aggregator - https://docs.aws.amazon.com/cli/latest/reference/securityhub/create-finding-aggregator.html
- AWS CLI Command Reference: securityhub update-organization-configuration - https://docs.aws.amazon.com/cli/latest/reference/securityhub/update-organization-configuration.html
- AWS CLI Command Reference: securityhub create-configuration-policy - https://docs.aws.amazon.com/cli/latest/reference/securityhub/create-configuration-policy.html
- AWS CLI Command Reference: securityhub start-configuration-policy-association - https://docs.aws.amazon.com/cli/latest/reference/securityhub/start-configuration-policy-association.html
- AWS CLI Command Reference: securityhub get-findings - https://docs.aws.amazon.com/cli/latest/reference/securityhub/get-findings.html
- AWS CLI Command Reference: securityhub list-members - https://docs.aws.amazon.com/cli/latest/reference/securityhub/list-members.html
- Amazon EventBridge reference: AWS Security Hub CSPM events - https://docs.aws.amazon.com/eventbridge/latest/ref/events-ref-securityhub.html
- Terraform Registry: aws_securityhub_organization_configuration - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/securityhub_organization_configuration
- Terraform Registry: aws_securityhub_configuration_policy - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/securityhub_configuration_policy
- Terraform Registry: aws_securityhub_configuration_policy_association - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/securityhub_configuration_policy_association

## Issues Found
- The central configuration command used `--auto-enable`, but AWS requires `--no-auto-enable` when `ConfigurationType` is `CENTRAL`. Updated the command and explanation.
- The post implied that switching to `CENTRAL` directly auto-enables Security Hub and standards for all accounts. Updated the workflow to create and associate a Security Hub configuration policy, which is the documented way to centrally enable Security Hub and standards for accounts and OUs.
- The standards examples used `batch-enable-standards` as an organization-wide push. Replaced them with `create-configuration-policy` and `start-configuration-policy-association`, which are the correct central-configuration commands.
- The CIS v1.4.0 ARN used the legacy `ruleset` format. Updated it to the regional `standards/cis-aws-foundations-benchmark/v/1.4.0` ARN documented for CIS v1.4.0.
- The Terraform `aws_securityhub_organization_configuration` example used `auto_enable = true` and `auto_enable_standards = "DEFAULT"` with `CENTRAL`, which is invalid. Updated it to `auto_enable = false`, `auto_enable_standards = "NONE"`, and made it depend on the finding aggregator.
- The Terraform example did not include the resources needed to enable standards across centrally managed organization targets. Added `aws_securityhub_configuration_policy` and `aws_securityhub_configuration_policy_association`.
- The post listed AWS Config as a Security Hub findings source. Updated the examples to use Security Hub-supported finding integrations such as Inspector, Macie, and IAM Access Analyzer while keeping AWS Config as a prerequisite for compliance checks.
- Current AWS CLI documentation notes that the product name for control-based Security Hub findings is `Security Hub CSPM`. Updated the relevant `ProductName` filters.

## Review Notes
- The local environment did not have the AWS CLI or Terraform installed, so commands were validated against official AWS CLI and Terraform provider documentation instead of local help output.
- Security Hub central configuration works from the home Region and applies policies in the home Region and linked Regions. The examples use `us-east-1`; readers should replace it with their chosen home Region.
- The configuration policy association example uses a placeholder root ID. Readers need to replace `r-abc123` with their AWS Organizations root ID or use an OU/account target.
