# Validation Summary: How to Configure RDS Security Groups for Database Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon RDS
- Amazon VPC security groups
- AWS CLI
- AWS Lambda VPC networking
- VPC peering
- Terraform AWS provider

## Sources Consulted
- AWS VPC security group rules: https://docs.aws.amazon.com/vpc/latest/userguide/security-group-rules.html
- AWS VPC peering security group references: https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-security-groups.html
- AWS CLI `authorize-security-group-ingress`: https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- Amazon RDS security groups: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.RDSSecurityGroups.html
- AWS Lambda VPC configuration: https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html
- Amazon VPC quotas: https://docs.aws.amazon.com/vpc/latest/userguide/amazon-vpc-limits.html
- Terraform AWS provider `aws_security_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Terraform AWS provider `aws_vpc_security_group_ingress_rule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_ingress_rule
- Terraform AWS provider `aws_vpc_security_group_egress_rule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_egress_rule
- OneUptime linked Lambda/RDS post: https://oneuptime.com/blog/post/2026-02-12-connect-rds-instance-from-lambda-function/view
- OneUptime linked Network Access Analyzer post: https://oneuptime.com/blog/post/2026-02-12-use-network-access-analyzer-identify-network-access-issues/view

## Issues Found
- The cross-VPC peering section incorrectly stated that security group references do not work across VPCs by default and that CIDR blocks are required. AWS supports security group references across active same-Region VPC peering connections. Updated the text and added a same-Region peered security group reference example, while preserving the CIDR examples for cross-Region or CIDR-based access.
- Several AWS CLI examples used placeholder source security group values such as `sg-web-tier`, which look like security group IDs but are not valid ID-shaped placeholders. Replaced them with hex-shaped `sg-...` placeholders.
- The Terraform guidance recommended `aws_security_group_rule` resources. Current Terraform AWS provider documentation recommends `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` for security group rules. Updated the note and examples accordingly.
- The first Terraform example had mutual inline security group references, which can create a circular dependency. Removed the inline outbound restriction from the application security group in that example and left the stricter two-way rule example using standalone rule resources.

## Review Notes
The remaining AWS CLI commands and security group behavior claims align with official AWS documentation. The security group quota values match the current Amazon VPC default quotas, though quotas are adjustable and can vary by account if increased.
