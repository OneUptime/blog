# Validation Summary: How to Use Workspaces for A/B Infrastructure Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI workspaces
- Terraform HCL
- AWS EC2
- AWS RDS for PostgreSQL
- Amazon CloudWatch dashboards and alarms
- k6 load testing
- Bash scripting

## Sources Consulted
- Terraform CLI workspace state documentation: https://docs.hashicorp.com/terraform/language/state/workspaces
- Terraform CLI `workspace new` documentation: https://developer.hashicorp.com/terraform/cli/commands/workspace/new
- Terraform CLI `workspace select` documentation: https://developer.hashicorp.com/terraform/cli/commands/workspace/select
- Terraform CLI `workspace delete` documentation: https://developer.hashicorp.com/terraform/cli/commands/workspace/delete
- Terraform AWS provider `aws_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform AWS provider `aws_db_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider `aws_cloudwatch_metric_alarm` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- Terraform `concat` function documentation: https://developer.hashicorp.com/terraform/language/functions/concat
- AWS EC2 enhanced networking with ENA documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/enhanced-networking-ena.html
- Amazon RDS DB instance storage documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Storage.html
- Amazon RDS for PostgreSQL version documentation: https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-versions.html
- Amazon CloudWatch `PutMetricAlarm` API documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_PutMetricAlarm.html
- Grafana k6 JSON output documentation: https://grafana.com/docs/k6/latest/results-output/real-time/json/

## Issues Found
- The EC2 example described `ebs_optimized` as enhanced networking. `ebs_optimized` controls EBS optimization, while EC2 enhanced networking uses ENA support and compatible AMIs/instance types. Renamed the variable and comments to `enable_ebs_optimization`.
- The RDS example omitted required master credentials for a new DB instance. Added `db_username` and sensitive `db_password` variables and wired them to `username` and `password`.
- The RDS example pinned PostgreSQL `15.4`, which has reached end of standard support on Amazon RDS. Changed it to major version `15` so RDS can select an available current minor version in that major line.
- The RDS `iops` expression did not match RDS storage rules for the shown 100 GiB gp3 PostgreSQL database. Changed it to set explicit IOPS only for provisioned IOPS storage types (`io1`, `io2`).
- The CloudWatch dashboard network metrics used a nested list shape that would encode incorrectly for dashboard metrics. Changed it to concatenate each instance's NetworkIn and NetworkOut metric arrays into a single metrics list.
- The CloudWatch alarm used `statistic = "p99"`. Percentile statistics such as p99 must be configured as an extended statistic in Terraform, so this was changed to `extended_statistic = "p99"`.
- The dashboard comment claimed each workspace dashboard showed both variants side by side, but each workspace creates a separate variant-specific dashboard. Updated the comment to accurately describe a dashboard for the selected variant.

## Review Notes
The article uses illustrative Terraform snippets and references data sources, security groups, subnet groups, outputs, user data templates, and load-test scripts that are not fully defined in the post. That is acceptable for a focused article, but a future expansion could add a note that these supporting resources must exist in the reader's configuration.
