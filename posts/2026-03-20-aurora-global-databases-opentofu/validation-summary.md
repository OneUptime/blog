# Validation Summary: How to Deploy Aurora Global Databases with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS
- Amazon Aurora
- Amazon Aurora Global Database
- AWS CLI
- HashiCorp AWS provider

## Sources Consulted
- AWS Aurora User Guide: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database.html
- AWS Aurora User Guide, disaster recovery: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database-disaster-recovery.html
- AWS Aurora User Guide, supported Regions and engines: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Concepts.Aurora_Fea_Regions_DB-eng.Feature.GlobalDatabase.html
- AWS CLI `failover-global-cluster`: https://docs.aws.amazon.com/cli/latest/reference/rds/failover-global-cluster.html
- AWS CLI `switchover-global-cluster`: https://docs.aws.amazon.com/cli/latest/reference/rds/switchover-global-cluster.html
- AWS provider `aws_rds_global_cluster` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/rds_global_cluster.html.markdown
- AWS provider `aws_rds_cluster` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/rds_cluster.html.markdown
- AWS provider `aws_rds_cluster_instance` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/rds_cluster_instance.html.markdown

## Issues Found
- The introduction and description overstated Aurora Global Database behavior. I updated the post to reflect the current AWS docs: up to 10 secondary Regions, replication latency typically under 1 second, RPO typically measured in seconds for failover, and RTO in the order of minutes.
- The Terraform examples mixed two different AWS provider patterns for creating a global cluster. The original post both attached the primary cluster to a global cluster and created the global cluster from that same primary cluster, which creates a circular dependency. I fixed this by keeping the step order as written: create the primary cluster first, then create the global cluster from the primary cluster ARN, and ignore `global_cluster_identifier` drift on the primary cluster as documented by the provider.
- The `aws_rds_global_cluster` resource did not specify a provider even though the post only defined aliased AWS providers. I set `provider = aws.primary` so the example is valid in a multi-provider configuration.
- The failover example was labeled as a manual promotion, but it used the managed failover API. I corrected the heading and command to use the documented managed failover form, including `--region` for the selected secondary Region and `--allow-data-loss`.
- The failover example used a malformed example ARN account ID and omitted the data-loss flag required for disaster failover semantics. I corrected the ARN to a 12-digit account ID and added `--allow-data-loss`.
- The conclusion used outdated terminology and overstated performance characteristics. I changed "managed planned failovers" to "switchovers" and changed the replication description to storage-level replication with low, rather than zero, impact on the primary cluster.

## Review Notes
- Aurora PostgreSQL 16.1 is currently supported for Aurora Global Database in both `us-east-1` and `eu-west-1`, so the example version is still valid as of 2026-05-01.
- AWS now distinguishes planned zero-data-loss cross-Region role changes as switchovers and disaster-recovery promotions as failovers. Future posts should keep those terms separate.
