# Validation Summary: How to Create RDS Subnet Groups in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- Amazon RDS
- RDS DB subnet groups
- Amazon VPC
- VPC subnets and route tables
- Network ACLs
- terraform-aws-modules/vpc/aws

## Sources Consulted
- AWS RDS API Reference, `CreateDBSubnetGroup`: https://docs.aws.amazon.com/AmazonRDS/latest/APIReference/API_CreateDBSubnetGroup.html
- AWS RDS User Guide, Working with a DB instance in a VPC: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_VPC.WorkingWithRDSInstanceinaVPC.html
- AWS RDS User Guide, Creating a Multi-AZ DB cluster: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/create-multi-az-db-cluster.html
- Terraform AWS Provider `aws_db_subnet_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_subnet_group
- Terraform AWS Provider `aws_network_acl` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/network_acl
- terraform-aws-modules/vpc/aws module documentation: https://registry.terraform.io/modules/terraform-aws-modules/vpc/aws/latest

## Issues Found
- The introduction and common mistakes section implied that a normal regional DB subnet group can exist with only one AZ and only becomes a problem when enabling Multi-AZ. AWS requires regional DB subnet groups to cover at least two Availability Zones, with a Local Zone exception. The wording was updated to describe the minimum AZ requirement accurately.
- The post did not distinguish Multi-AZ DB instances from Multi-AZ DB clusters in the AZ-count guidance. The common mistakes section now notes that Multi-AZ DB clusters require at least three AZs.
- The VPC module example pinned `terraform-aws-modules/vpc/aws` to `~> 5.0`. The current module documentation is on the v6 major line, and the example inputs still apply, so the version was updated to `~> 6.0`.
- The Network ACL example labeled an inbound ephemeral-port rule as generic "return traffic." For normal application-to-database connections, the return path from the database is outbound to the client's ephemeral port. The comments were corrected to distinguish inbound return traffic for database-initiated connections from outbound response traffic to application subnets.

## Review Notes
- The `aws_db_subnet_group`, `aws_subnet`, `aws_route_table`, `aws_route_table_association`, `aws_db_instance`, `aws_rds_cluster`, and `aws_network_acl` examples use valid Terraform resource names and arguments according to current provider documentation.
- AWS recommends using private subnets for non-public RDS databases. Publicly accessible DB instances require all subnets in the DB subnet group to be public, so the post's private-subnet guidance is appropriate for the security posture it describes.
