# Validation Summary: How to Import AWS Security Groups into OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS Provider for Terraform/OpenTofu
- AWS EC2 Security Groups
- AWS CLI
- HCL

## Sources Consulted
- OpenTofu import language docs: https://opentofu.org/docs/language/import/
- AWS provider `aws_security_group` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/security_group.html.markdown
- AWS provider `aws_security_group_rule` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/security_group_rule.html.markdown
- AWS provider `aws_vpc_security_group_ingress_rule` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/vpc_security_group_ingress_rule.html.markdown
- AWS provider `aws_vpc_security_group_egress_rule` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/vpc_security_group_egress_rule.html.markdown
- AWS CLI `describe-security-groups` reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-security-groups.html
- AWS CLI `describe-security-group-rules` reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-security-group-rules.html
- AWS EC2 security group rules user guide: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/security-group-rules.html

## Issues Found
- The post presented `aws_security_group_rule` as the main separate-rule approach. Current AWS provider documentation now recommends `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` as best practice, and explicitly advises avoiding `aws_security_group_rule` when possible. I updated the separate-rule examples and surrounding explanation to use the dedicated ingress/egress rule resources.
- The AWS CLI and `jq` example in the inline-rules section only extracted ingress permissions even though the section discusses importing a security group with inline ingress and egress rules. I updated the example to extract both `IpPermissions` and `IpPermissionsEgress`, and quoted the shell variable in the CLI call.
- The source-security-group example used an invalid sample security group ID (`sg-alb...`) and an outdated import pattern for the newer dedicated rule resources. I replaced it with valid-looking AWS IDs, changed the configuration to use `referenced_security_group_id`, and updated the import example to use `sgr-...` rule IDs.
- The separate-rule import section previously described the older composite import ID format for `aws_security_group_rule`. After updating the post to the newer dedicated rule resources, I corrected the import guidance to use AWS security group rule IDs and added the appropriate AWS CLI lookup command.

## Review Notes
- Inline rules on `aws_security_group` are still supported, so Approach 1 remains technically valid, but current AWS provider guidance recommends dedicated ingress/egress rule resources for new configurations.
- The post correctly uses OpenTofu `import` blocks with `id`, which matches current OpenTofu import documentation. I did not switch the examples to Terraform's newer `identity` syntax because this post is specifically about OpenTofu.
