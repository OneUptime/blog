# Validation Summary: How to Create Database Subnet Groups in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- Amazon VPC and subnets
- Amazon RDS and Aurora
- Amazon ElastiCache
- Amazon DocumentDB
- Amazon Neptune
- Amazon DynamoDB Accelerator (DAX)
- AWS security groups

## Sources Consulted
- Terraform AWS Provider documentation: aws_db_subnet_group - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_subnet_group
- Terraform AWS Provider documentation: aws_db_instance - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS Provider documentation: aws_rds_cluster - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster
- Terraform AWS Provider documentation: aws_elasticache_subnet_group - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_subnet_group
- Terraform AWS Provider documentation: aws_elasticache_replication_group - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_replication_group
- Terraform AWS Provider documentation: aws_docdb_subnet_group - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/docdb_subnet_group
- Terraform AWS Provider documentation: aws_docdb_cluster - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/docdb_cluster
- Terraform AWS Provider documentation: aws_neptune_subnet_group - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/neptune_subnet_group
- Terraform AWS Provider documentation: aws_neptune_cluster - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/neptune_cluster
- Terraform AWS Provider documentation: aws_dax_subnet_group - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dax_subnet_group
- AWS RDS User Guide: Working with a DB instance in a VPC - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_VPC.WorkingWithRDSInstanceinaVPC.html
- AWS ElastiCache User Guide: Subnets and subnet groups - https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/SubnetGroups.html
- AWS DocumentDB Developer Guide: Amazon DocumentDB subnet groups - https://docs.aws.amazon.com/documentdb/latest/developerguide/db-subnet-groups.html
- AWS Neptune User Guide: Creating a DB subnet group - https://docs.aws.amazon.com/neptune/latest/userguide/manage-console-subnet-group.html
- AWS DAX Developer Guide: Subnet groups - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.concepts.cluster.html

## Issues Found
- The introduction said subnet groups are required for every AWS managed database service. This was too broad because services such as DynamoDB itself do not use database subnet groups, while DAX does. Changed the statement to "many AWS managed database services that run inside a VPC."
- The introduction said a subnet group must span at least two availability zones to enable high availability features including read replicas. This was too broad across the services covered. Updated it to state that RDS DB subnet groups generally require at least two availability zones, and that multiple AZs enable high availability features like Multi-AZ deployments.
- The introduction said the guide covers all major AWS database services. The post does not cover every AWS database-adjacent subnet group type, such as Redshift. Changed this to "several major AWS database services."

## Review Notes
The Terraform resource types and key arguments used in the examples match the current AWS provider documentation. The snippets reference security groups and variables defined outside some examples, which is acceptable for a focused subnet group tutorial. The Aurora example shows subnet group attachment at the cluster level but does not include `aws_rds_cluster_instance` resources, which would be needed for a complete provisioned Aurora deployment.
