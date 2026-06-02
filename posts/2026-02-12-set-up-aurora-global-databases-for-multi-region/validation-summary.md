# Validation Summary: How to Set Up Aurora Global Databases for Multi-Region

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon Aurora
- Aurora Global Database
- Amazon RDS
- AWS CLI
- Amazon CloudWatch
- Terraform AWS provider
- Python
- PyMySQL

## Sources Consulted
- AWS Aurora User Guide: Using Amazon Aurora Global Database - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database.html
- AWS Aurora User Guide: Configuration requirements of an Amazon Aurora global database - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database.configuration.requirements.html
- AWS Aurora User Guide: Supported Regions and DB engines for Aurora global databases - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Concepts.Aurora_Fea_Regions_DB-eng.Feature.GlobalDatabase.html
- AWS Aurora User Guide: Creating an Amazon Aurora global database - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database-creating.html
- AWS Aurora User Guide: Adding an AWS Region to an Amazon Aurora global database - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database-attaching.html
- AWS Aurora User Guide: Connecting to Amazon Aurora Global Database - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database-connecting.html
- AWS Aurora User Guide: Amazon CloudWatch metrics for Amazon Aurora - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.AuroraMonitoring.Metrics.html
- AWS CLI Command Reference: create-global-cluster - https://docs.aws.amazon.com/cli/latest/reference/rds/create-global-cluster.html
- AWS CLI Command Reference: create-db-cluster - https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-cluster.html
- Terraform Registry: aws_rds_global_cluster and aws_rds_cluster resources - https://registry.terraform.io/providers/hashicorp/aws/latest/docs

## Issues Found
- Updated the maximum number of secondary regions from 5 to 10. Current Aurora Global Database documentation supports up to 10 read-only secondary AWS Regions.
- Replaced outdated prerequisite version guidance. The original MySQL 5.6.10a and PostgreSQL 10.11 wording was too broad for current Aurora Global Database support, which depends on specific Aurora engine versions and Regions.
- Corrected the engine prerequisite from including `aurora` to the current `aurora-mysql` and `aurora-postgresql` global database engines.
- Replaced `db.r4.large` or larger as the instance guidance with memory-optimized classes such as `db.r5.large` or higher, matching current AWS recommendations.
- Clarified the Terraform snippet as the core configuration rather than a complete standalone file because it references subnet groups and a password variable defined elsewhere.
- Updated application connection guidance to use the Aurora Global Database writer endpoint for writes, so writes continue to route correctly after managed switchovers or failovers.
- Removed an unused `boto3` import from the Python example.

## Review Notes
The AWS CLI examples use valid RDS operations and parameters for creating a global cluster from an existing Aurora cluster and adding a secondary cluster. For encrypted clusters, AWS requires additional region/KMS handling when adding secondary clusters; that is a useful future enhancement but not required for the unencrypted example shown.
