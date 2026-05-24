# Validation Summary: How to Create RDS Proxy with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- AWS RDS Proxy
- AWS RDS (PostgreSQL)
- AWS VPC, Subnets, Security Groups
- AWS Secrets Manager
- AWS IAM (roles, policies, IAM database authentication)
- AWS CloudWatch (metric alarms)
- AWS KMS

## Sources Consulted
- Terraform AWS Provider docs: `aws_db_proxy` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_proxy)
- Terraform AWS Provider docs: `aws_db_proxy_default_target_group` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_proxy_default_target_group)
- Terraform AWS Provider docs: `aws_db_proxy_target` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_proxy_target)
- Terraform AWS Provider docs: `aws_db_proxy_endpoint` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_proxy_endpoint)
- Terraform AWS Provider docs: `aws_db_instance`, `aws_iam_role`, `aws_iam_role_policy`, `aws_secretsmanager_secret`, `aws_cloudwatch_metric_alarm`
- AWS RDS User Guide — RDS Proxy endpoints: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-endpoints.html
- AWS RDS User Guide — RDS Proxy monitoring/CloudWatch dimensions and metrics: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.monitoring.html
- AWS RDS User Guide — RDS Proxy connection pooling and session pinning

## Issues Found
1. **`session_pinning_filters = ["EXCLUDE_VARIABLE_SETS"]` used with a PostgreSQL proxy.** This pinning filter is documented as applying only to the MySQL engine family; the example proxy uses `engine_family = "POSTGRESQL"`. The line was commented out and a note added clarifying the filter is MySQL-only, so the example remains accurate for both engines.
2. **`READ_ONLY` proxy endpoint shown on a proxy targeting a single `aws_db_instance`.** Per AWS docs, RDS Proxy reader endpoints (`target_role = "READ_ONLY"`) are only supported for proxies that target an RDS Multi-AZ DB cluster — they do not work for single DB instances or for Aurora clusters (Aurora has its own native reader endpoint). Added a clarifying note above the snippet and updated the inline comment so readers don't apply the snippet to an unsupported setup.

## Review Notes
- `iam_auth` values used (`DISABLED`, `REQUIRED`) are both valid. The post correctly avoids using a non-existent `ENABLED` value.
- `auth_scheme = "SECRETS"` is the only valid value; correct as used.
- `engine_family = "POSTGRESQL"` is a valid value (alongside `MYSQL` and `SQLSERVER`).
- The CloudWatch alarm uses namespace `AWS/RDS`, metric `DatabaseConnections`, and dimension `ProxyName` — all valid for RDS Proxy per-proxy metrics.
- `aws_db_proxy_target` correctly uses `db_instance_identifier`; for cluster-based proxies, `db_cluster_identifier` is the alternative (mentioning this in a future revision could be helpful but isn't required for correctness).
- The post relies on the `random` Terraform provider (`random_password`) but does not explicitly declare it in a `required_providers` block. This is fine for a tutorial snippet but worth noting if users copy-paste into a strict module.
- `engine_version = "15"` is accepted by the AWS provider and will resolve to a current minor version; pinning to a specific minor (e.g., `"15.6"`) is preferable for reproducibility.
- The IAM trust policy uses `Service = "rds.amazonaws.com"`, which is the correct service principal for RDS Proxy roles per AWS documentation.
