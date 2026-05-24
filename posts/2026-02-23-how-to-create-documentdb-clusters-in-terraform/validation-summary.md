# Validation Summary: How to Create DocumentDB Clusters in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon DocumentDB (MongoDB-compatible managed document database)
- Terraform (HashiCorp Configuration Language)
- AWS Provider for Terraform (`hashicorp/aws` ~> 5.0)
- AWS VPC, Subnets, Security Groups
- AWS KMS (for encryption at rest)
- AWS CloudWatch (metric alarms, log exports)
- AWS SNS (alarm notifications)
- MongoDB connection string format

## Sources Consulted
- Terraform AWS Provider docs — `aws_docdb_cluster`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/docdb_cluster
- Terraform AWS Provider docs — `aws_docdb_cluster_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/docdb_cluster_instance
- Terraform AWS Provider docs — `aws_docdb_subnet_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/docdb_subnet_group
- Terraform AWS Provider docs — `aws_docdb_cluster_parameter_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/docdb_cluster_parameter_group
- AWS DocumentDB Developer Guide — Architecture: https://docs.aws.amazon.com/documentdb/latest/developerguide/how-it-works.html
- AWS DocumentDB Developer Guide — Cluster parameter groups: https://docs.aws.amazon.com/documentdb/latest/developerguide/cluster_parameter_group.html
- AWS DocumentDB Developer Guide — Instance classes: https://docs.aws.amazon.com/documentdb/latest/developerguide/db-instance-classes.html
- AWS DocumentDB Developer Guide — CloudWatch metrics (namespace `AWS/DocDB`): https://docs.aws.amazon.com/documentdb/latest/developerguide/cloud_watch.html
- AWS DocumentDB Developer Guide — Connecting with TLS: https://docs.aws.amazon.com/documentdb/latest/developerguide/connect.html

## Issues Found
No technical issues found.

The post is technically accurate throughout:
- The architectural claims (6-way storage replication across 3 AZs, up to 15 read replicas, automatic failover, separation of compute and storage) match the official DocumentDB documentation.
- Port 27017 is the correct MongoDB/DocumentDB port.
- All Terraform resource names (`aws_docdb_cluster`, `aws_docdb_subnet_group`, `aws_docdb_cluster_instance`, `aws_docdb_cluster_parameter_group`) and their argument names match the current AWS provider 5.x schema.
- Engine version `5.0.0` is a valid DocumentDB engine version, and the parameter group family `docdb5.0` is the matching family identifier.
- The parameter names (`audit_logs`, `profiler`, `profiler_threshold_ms`, `ttl_monitor`, `tls`) are all valid DocumentDB cluster-level parameters.
- The `db.r6g.large` instance class is supported by DocumentDB.
- The CloudWatch namespace `AWS/DocDB`, metric name `CPUUtilization`, and dimension `DBClusterIdentifier` are correct.
- The `enabled_cloudwatch_logs_exports` values (`audit`, `profiler`) are the documented log types DocumentDB can export.
- The MongoDB-compatible connection string (`mongodb://...?tls=true&replicaSet=rs0&readPreference=secondaryPreferred`) follows the standard DocumentDB connection format.
- The KMS key `deletion_window_in_days = 30` is within the valid 7–30 day range.

## Review Notes
- The post uses `engine_version = "5.0.0"`. DocumentDB also supports 3.6.0 and 4.0.0; 5.0.0 is the most current major version and a reasonable default.
- AWS DocumentDB now offers a Secrets Manager-managed master password option (via the `manage_master_user_password` argument in newer AWS provider versions). The post uses the traditional `master_password` approach via a Terraform variable, which is still fully supported and commonly used — no change required, but readers may want to evaluate the Secrets Manager-managed option for production.
- The connection string output embeds the master username and a `<password>` placeholder. In practice, applications should retrieve credentials from Secrets Manager or an SSM parameter rather than constructing the string from Terraform outputs — a worthwhile future improvement, but not a technical error.
- The post defines two separate `aws_docdb_cluster` resources (`main` and `main_with_params`) in different sections for illustration. Readers applying the full file together would create two clusters; this is consistent with the post's tutorial-style presentation and is not a technical error.
