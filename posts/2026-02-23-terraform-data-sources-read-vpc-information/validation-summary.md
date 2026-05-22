# Validation Summary: How to Use Data Sources to Read Existing VPC Information in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS VPC
- AWS subnets
- AWS security groups
- AWS route tables
- AWS NAT gateways
- AWS internet gateways
- AWS VPC endpoints
- AWS Application Load Balancer
- Amazon EC2
- Amazon RDS

## Sources Consulted
- Terraform AWS Provider `aws_vpc` data source: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/d/vpc.html.markdown
- Terraform AWS Provider `aws_subnets` data source: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/d/subnets.html.markdown
- Terraform AWS Provider `aws_security_group` data source: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/d/security_group.html.markdown
- Terraform AWS Provider `aws_route_tables` data source: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/d/route_tables.html.markdown
- Terraform AWS Provider `aws_route_table` data source: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/d/route_table.html.markdown
- Terraform AWS Provider `aws_nat_gateways` data source: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/d/nat_gateways.html.markdown
- Terraform AWS Provider `aws_nat_gateway` data source: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/d/nat_gateway.html.markdown
- Terraform AWS Provider `aws_internet_gateway` data source: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/d/internet_gateway.html.markdown
- Terraform AWS Provider `aws_vpc_endpoint` data source: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/d/vpc_endpoint.html.markdown
- Terraform AWS Provider `aws_db_instance` resource: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/db_instance.html.markdown
- Terraform custom conditions documentation: https://developer.hashicorp.com/terraform/language/expressions/custom-conditions

## Issues Found
- The complete deployment example referenced `aws_security_group.db.id`, but no `aws_security_group` named `db` was defined. Added a database security group that allows PostgreSQL traffic from the application security group.
- The RDS example omitted required master credential handling. Added `manage_master_user_password = true` and `username = "app_admin"` so the example can use Secrets Manager managed credentials without hard-coding a password.
- The RDS example set `skip_final_snapshot = false` without `final_snapshot_identifier`, which is required by the AWS provider when a final snapshot is requested. Added `final_snapshot_identifier`.
- The validation section was titled and introduced as using preconditions, but the code uses `postcondition` blocks. Updated the heading and introductory sentence to say postconditions.

## Review Notes
- Terraform was not installed in the local environment, so I could not run `terraform fmt` or `terraform validate`. The snippets were reviewed manually against current official Terraform and AWS provider documentation.
- Several data sources require filters to match exactly one resource, while plural data sources return ID lists. The post's examples follow that distinction.
