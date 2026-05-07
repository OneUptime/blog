# Validation Summary: How to Set Up AWS Inspector with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- HCL
- Amazon Inspector v2
- AWS Organizations
- Amazon EventBridge / CloudWatch Events
- Amazon SNS
- Amazon ECR
- AWS IAM
- AWS CLI
- AWS Security Hub CSPM

## Sources Consulted
- OpenTofu CLI docs: `init` — https://opentofu.org/docs/cli/commands/init/
- OpenTofu CLI docs: `plan` — https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI docs: `apply` — https://opentofu.org/docs/cli/commands/apply/
- Terraform Registry: `aws_inspector2_enabler` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/inspector2_enabler
- Terraform Registry: `aws_inspector2_delegated_admin_account` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/inspector2_delegated_admin_account
- Terraform Registry: `aws_inspector2_organization_configuration` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/inspector2_organization_configuration
- Terraform Registry: `aws_ecr_repository` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_repository
- Terraform Registry: `aws_sns_topic_policy` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic_policy
- Terraform Registry: `aws_iam_policy_document` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document
- Amazon Inspector User Guide: What is Amazon Inspector? — https://docs.aws.amazon.com/inspector/latest/user/what-is-inspector.html
- Amazon Inspector User Guide: Activating a scan type — https://docs.aws.amazon.com/inspector/latest/user/activate-scans.html
- Amazon Inspector User Guide: Scanning Amazon EC2 instances with Amazon Inspector — https://docs.aws.amazon.com/inspector/latest/user/scanning-ec2.html
- Amazon Inspector User Guide: Scanning Amazon ECR container images with Amazon Inspector — https://docs.aws.amazon.com/inspector/latest/user/enable-disable-scanning-ecr.html
- Amazon Inspector User Guide: Designating a delegated administrator account — https://docs.aws.amazon.com/inspector/latest/user/designating-admin.html
- Amazon Inspector User Guide: Amazon Inspector integration with AWS Security Hub CSPM — https://docs.aws.amazon.com/inspector/latest/user/securityhub-integration.html
- Amazon Inspector User Guide: Creating custom responses to Amazon Inspector findings with Amazon EventBridge — https://docs.aws.amazon.com/inspector/latest/user/findings-managing-automating-responses.html
- Amazon Inspector User Guide: Amazon EventBridge event schema for Amazon Inspector events — https://docs.aws.amazon.com/inspector/latest/user/eventbridge-integration.html
- Amazon EventBridge User Guide: Using resource-based policies for Amazon EventBridge — https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html
- AWS CLI Command Reference: `inspector2 list-findings` — https://docs.aws.amazon.com/cli/latest/reference/inspector2/list-findings.html
- AWS Service Authorization Reference: Amazon Inspector2 — https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazoninspector2.html

## Issues Found
1. **The prose overstated what Amazon Inspector scans for each resource type.** The original description and introduction implied that EC2, Lambda, and ECR are all scanned for both vulnerabilities and network reachability. AWS documents network reachability findings for EC2, while Lambda and ECR scanning are for vulnerabilities. I corrected the description and introduction to distinguish those behaviors.

2. **The Security Hub wording was too absolute.** The post said Inspector "sends findings to Security Hub" as if that happens unconditionally. AWS documents that the integration is activated when Security Hub CSPM is enabled. I changed the wording to say findings can be sent to Security Hub when Security Hub is enabled.

3. **The Step 1 Terraform snippet was incomplete and had outdated scan notes.** `aws_inspector2_enabler` referenced `data.aws_caller_identity.current.account_id` without declaring the data source, so the snippet would not compile as written. I added `data "aws_caller_identity" "current" {}` and updated the comments to remove the outdated "beta" wording for `LAMBDA_CODE` and the overly narrow "using SSM Agent" wording for EC2 scanning.

4. **The organization auto-enable comments described the wrong scope.** In `aws_inspector2_organization_configuration`, the `auto_enable` flags apply to new organization member accounts, not directly to new EC2 instances, ECR repositories, or Lambda functions. I corrected those comments and clarified which account should run the delegated-admin step.

5. **The EventBridge-to-SNS example was missing the required SNS resource policy.** AWS documents that EventBridge uses resource-based policies for SNS targets. Without allowing `events.amazonaws.com` to publish, the target is incomplete. I added an `aws_iam_policy_document`, an `aws_sns_topic_policy`, and a dependency from the EventBridge target to that policy.

6. **The ECR and conclusion notes oversimplified current Inspector behavior.** The original text implied that enabling Inspector alone defines continuous ECR scanning behavior and that EC2 scanning is strictly SSM-agent based. AWS now documents registry-level enhanced scanning configuration in ECR and both agent-based and agentless EC2 scan modes. I updated those lines to match the current model.

## Review Notes
- The `aws inspector2 list-findings` command and its `--filter-criteria` structure are valid current AWS CLI syntax.
- The IAM actions shown in the read-only example, including `inspector2:BatchGetFindingDetails`, are valid current Amazon Inspector2 actions.
- `LAMBDA_CODE` requires Lambda standard scanning to be enabled as well; the post already does that by enabling both `LAMBDA` and `LAMBDA_CODE`.
- EventBridge rules for Amazon Inspector are regional. Readers need equivalent rules in each AWS Region where Inspector is enabled.
- `aws_sns_topic_policy` manages the full topic policy document. If the SNS topic already has policy statements, this EventBridge publish statement should be merged with them rather than replacing them.
