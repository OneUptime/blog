# Validation Summary: How to Enforce Network Security Policies with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / HCL
- AWS provider for OpenTofu / Terraform
- Amazon VPC
- Amazon EC2 security groups
- VPC Flow Logs
- AWS Config managed rules
- AWS Systems Manager Session Manager
- AWS CLI

## Sources Consulted
- OpenTofu, Input Variables: https://opentofu.org/docs/language/values/variables/
- OpenTofu, Custom Conditions: https://opentofu.org/docs/language/expressions/custom-conditions/
- Terraform Registry, `aws_security_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Terraform Registry, `aws_flow_log`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/flow_log
- Terraform Registry, `aws_default_vpc`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/default_vpc
- AWS Config, `restricted-ssh`: https://docs.aws.amazon.com/config/latest/developerguide/restricted-ssh.html
- AWS Config, `restricted-common-ports`: https://docs.aws.amazon.com/config/latest/developerguide/restricted-common-ports.html
- AWS Config, `rds-instance-public-access-check`: https://docs.aws.amazon.com/config/latest/developerguide/rds-instance-public-access-check.html
- AWS Config, `vpc-flow-logs-enabled`: https://docs.aws.amazon.com/config/latest/developerguide/vpc-flow-logs-enabled.html
- Amazon VPC, Work with your default VPC and default subnets: https://docs.aws.amazon.com/vpc/latest/userguide/work-with-default-vpc.html
- Amazon VPC, Delete your VPC: https://docs.aws.amazon.com/vpc/latest/userguide/delete-vpc.html
- AWS CLI, `delete-vpc`: https://docs.aws.amazon.com/cli/latest/reference/ec2/delete-vpc.html
- AWS CLI, `start-session`: https://docs.aws.amazon.com/cli/latest/reference/ssm/start-session.html

## Issues Found
- The variable validation rejected both `0.0.0.0/0` and `::/0`, but the error message only mentioned the IPv4 case. I updated the message so it matches the actual validation logic.
- The `aws_security_group` precondition only checked that `var.vpc_id` was non-empty, but the error message claimed it prevented use of the default VPC. I corrected the wording and added a clarifying comment so the snippet no longer overstates what it enforces.
- The AWS Config RDP rule used `RESTRICTED_INCOMING_TRAFFIC` with `blockedPort1 = "3389"`. AWS documents that rule as having additional default blocked ports, so that configuration would also evaluate ports 20, 21, 3306, and 4333. I changed it to `blockedPorts = "3389"` to make the example genuinely RDP-specific.
- The default VPC section incorrectly implied that `aws_default_vpc` removes default VPCs across regions and paired it with a `local-exec` `aws ec2 delete-vpc` command that would fail unless dependent resources were deleted first. I replaced that with an accurate current-region tagging example and clarified that deletion is a separate per-region workflow after dependency cleanup.

## Review Notes
- The post is technically relevant and remains salvageable after the fixes above.
- The snippets are partial examples and assume surrounding resources already exist, such as `aws_security_group.alb`, `aws_vpc.main`, and `aws_iam_role.flow_logs`.
- `aws_security_group_rule` is still valid, but current AWS provider documentation recommends the newer `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` resources as the preferred pattern for new configurations.
- Local checks: `validation.json` was validated with `jq`. Runtime validation with `tofu` or `terraform` was not possible in this workspace because neither CLI is installed, and the AWS CLI is also not installed for command-level local verification.
