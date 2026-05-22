# Validation Summary: How to Use Data Sources for Availability Zone Discovery in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS provider
- AWS Availability Zones, Local Zones, and Wavelength Zones
- AWS VPC subnets, route tables, Elastic IPs, and NAT Gateways
- Amazon RDS DB subnet groups and DB instances
- Amazon EKS clusters and managed node groups

## Sources Consulted
- HashiCorp AWS provider documentation for `aws_availability_zones`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/d/availability_zones.html.markdown
- HashiCorp AWS provider documentation for `aws_subnet`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/subnet.html.markdown
- HashiCorp AWS provider documentation for `aws_eip`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/eip.html.markdown
- HashiCorp AWS provider documentation for `aws_db_subnet_group`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/db_subnet_group.html.markdown
- HashiCorp AWS provider documentation for `aws_db_instance`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/db_instance.html.markdown
- HashiCorp AWS provider documentation for `aws_eks_node_group`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/eks_node_group.html.markdown
- AWS EC2 API Reference for `DescribeAvailabilityZones`: https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_DescribeAvailabilityZones.html
- AWS Global Infrastructure documentation for Availability Zone IDs: https://docs.aws.amazon.com/global-infrastructure/latest/regions/az-ids.html

## Issues Found
- The complete VPC pattern used `var.project` without declaring it. Added a `project` variable so the snippet is internally complete for the tag expressions it uses.
- The RDS DB instance example omitted required master user credentials or an alternative password-management configuration. Added `username` and `manage_master_user_password = true`, which matches current AWS provider support for Secrets Manager-managed master passwords.
- The `for_each` explanation overstated the effect of keying subnets by AZ name. Updated the wording to clarify that resource addresses are more stable, but index-derived attributes such as CIDR blocks can still change if the selected AZ set or order changes.

## Review Notes
The `aws_availability_zones` arguments and attributes used in the post are current in the AWS provider documentation. The `opt-in-status = opt-in-not-required` filter is an appropriate way to return standard Availability Zones instead of opted-in Local Zones or Wavelength Zones. The post's VPC pattern is suitable as an illustrative pattern, but a deployable production VPC would also need public route table routes and associations, security groups, IAM roles, and other surrounding resources depending on the workload.
