# Validation Summary: How to Use Data Sources to Query Existing Security Groups

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp Terraform AWS Provider
- AWS EC2 Security Groups
- AWS VPC networking
- Terraform data sources

## Sources Consulted
- HashiCorp Terraform AWS Provider documentation: `aws_security_group` data source - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/security_group
- HashiCorp Terraform AWS Provider documentation: `aws_security_groups` data source - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/security_groups
- HashiCorp Terraform AWS Provider documentation: `aws_vpc_security_group_ingress_rule` resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_ingress_rule
- HashiCorp Terraform AWS Provider documentation: `aws_security_group_rule` resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group_rule
- HashiCorp Terraform language documentation: data blocks - https://developer.hashicorp.com/terraform/language/block/data
- HashiCorp Terraform language documentation: `for_each` meta-argument - https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- HashiCorp Terraform AWS Provider documentation: `aws_instance` resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- HashiCorp Terraform AWS Provider documentation: `aws_lb` resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb
- AWS CLI documentation: `describe-security-groups` filters - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-security-groups.html
- AWS EC2 API Reference: `DescribeSecurityGroups` - https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_DescribeSecurityGroups.html

## Issues Found
- The post stated that the `aws_security_group` data source exposes ingress and egress rules. The current AWS provider documentation for the singular data source exports security group metadata such as `id`, `name`, `vpc_id`, `description`, `tags`, and `arn`, but not detailed rule objects. Changed the section to "Reading Security Group Details" and adjusted the wording to describe metadata inspection.
- The example for adding a rule used `aws_security_group_rule`. That resource still exists, but current provider documentation recommends `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` for new rule management. Updated the ingress example to use `aws_vpc_security_group_ingress_rule` with `cidr_ipv4`, `ip_protocol`, `from_port`, and `to_port`.

## Review Notes
The remaining examples are syntactically consistent with Terraform HCL and the current AWS provider data source/resource arguments. Several examples intentionally omit provider configuration and dependent data sources such as `data.aws_vpc.main` or `data.aws_subnet.private`; this is acceptable for focused snippets, but a full runnable configuration would need those definitions.
