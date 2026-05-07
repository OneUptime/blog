# Validation Summary: How to Set Up AWS Firewall Manager with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS Firewall Manager
- AWS Organizations
- AWS WAF
- AWS Shield Advanced
- Amazon VPC security groups
- AWS CLI

## Sources Consulted
- AWS provider `aws_fms_admin_account` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/fms_admin_account.html.markdown
- AWS provider `aws_fms_policy` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/fms_policy.html.markdown
- AWS Firewall Manager API `SecurityServicePolicyData`: https://docs.aws.amazon.com/fms/2018-01-01/APIReference/API_SecurityServicePolicyData.html
- AWS Firewall Manager API `Policy`: https://docs.aws.amazon.com/fms/2018-01-01/APIReference/API_Policy.html
- AWS Firewall Manager developer guide, policy types: https://docs.aws.amazon.com/waf/latest/developerguide/working-with-policies.html
- AWS Firewall Manager developer guide, create policy: https://docs.aws.amazon.com/waf/latest/developerguide/create-policy.html
- AWS Firewall Manager developer guide, security group policies: https://docs.aws.amazon.com/waf/latest/developerguide/security-group-policies.html
- AWS Firewall Manager developer guide, content audit security group policies: https://docs.aws.amazon.com/waf/latest/developerguide/security-group-policies-audit.html
- AWS Firewall Manager developer guide, common security group policies: https://docs.aws.amazon.com/waf/latest/developerguide/security-group-policies-common.html
- AWS Firewall Manager developer guide, Shield Advanced policies: https://docs.aws.amazon.com/waf/latest/developerguide/shield-policies.html
- AWS CLI `fms list-compliance-status`: https://docs.aws.amazon.com/cli/latest/reference/fms/list-compliance-status.html

## Issues Found
- The introduction implied that a single Firewall Manager policy can enforce multiple protection types at once. AWS documents policies as type-specific, so I corrected the wording to refer to Firewall Manager policies collectively instead of one policy doing everything.
- The admin-account example omitted the provider-region requirement. The AWS provider documents `aws_fms_admin_account` as a `us-east-1` operation, so I added a `us-east-1` provider alias and attached the resource to it.
- The prerequisites blurred together the AWS Organizations management account and the Firewall Manager administrator account. I clarified the credentials requirement to match the documented workflow.
- The WAF example implied one ALB policy covered the whole organization regardless of Region and said you could “leave empty” `include_map` to target all accounts. AWS documents regional policy scope for regional resources, and the provider docs say omitting `include_map` applies the policy broadly, so I corrected both points.
- The security group example was technically wrong. It used `SECURITY_GROUPS_USAGE_AUDIT`, which audits unused and redundant security groups, while the prose claimed it blocked public SSH. I replaced it with a documented `SECURITY_GROUPS_CONTENT_AUDIT` example that uses an audit security group template and starts with remediation disabled.
- The security group and Shield examples omitted the required `exclude_resource_tags` argument from `aws_fms_policy`. I added it.
- The Shield Advanced example omitted `managed_service_data`. I added a documented `SHIELD_ADVANCED` JSON payload for the CloudFront policy.

## Review Notes
- AWS documents Firewall Manager policies for regional resources such as ALBs as Region-specific; separate policies are required per Region. CloudFront remains a global resource type in the Firewall Manager workflow.
- The AWS CLI `fms list-compliance-status` command is current and valid as of May 7, 2026.
