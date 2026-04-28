# Validation Summary: How to Set Up Multi-AZ Deployments with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible HCL)
- AWS (RDS Multi-AZ, ElastiCache Redis Replication Groups, EC2/VPC AZ data source)
- Azure (Azure SQL Business Critical, Azure Cache for Redis Premium)
- GCP (Regional Persistent Disks, Compute Engine instances)
- HCL functions: `slice`, `cidrsubnet`, `for_each`, `toset`, `replace`

## Sources Consulted
- AWS Provider docs: `aws_availability_zones` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/availability_zones)
- AWS Provider docs: `aws_db_instance` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance)
- AWS Provider docs: `aws_elasticache_replication_group` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_replication_group)
- AWS RDS Multi-AZ documentation (failover time 60-120s) (https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.html)
- AzureRM Provider docs: `azurerm_mssql_database` (https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mssql_database)
- AzureRM Provider docs: `azurerm_redis_cache` (https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/redis_cache)
- Google Provider docs: `google_compute_region_disk` (https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_region_disk)
- Google Provider docs: `google_compute_instance` (https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance)
- OpenTofu language functions documentation (`cidrsubnet`, `slice`, `for_each`)

## Issues Found
No technical issues found.

## Review Notes
- The summary text mentions "GCP Regional MIGs" but the code in Step 4 demonstrates spreading individual `google_compute_instance` resources across zones using `for_each` rather than a Managed Instance Group (`google_compute_region_instance_group_manager`). This is a minor wording inconsistency in the summary, not a technical error in any code sample.
- For `aws_elasticache_replication_group`, `num_cache_clusters` is a legacy attribute that still works for cluster-mode-disabled deployments. Newer recommended approach uses `num_node_groups` + `replicas_per_node_group` for cluster mode, but the current usage is valid for the Multi-AZ replication group described.
- `google_compute_region_disk.replica_zones` is correctly limited to exactly 2 zones (GCP requirement); the post complies.
- Azure Redis Premium tier with zones `["1", "2", "3"]` requires the region to support all three zones; this is region-dependent but the configuration syntax is correct.
- `BusinessCritical_Gen5_4` is a valid SKU name format for Azure SQL and supports zone redundancy.
