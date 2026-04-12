# Validation Summary: How to Use Amazon Aurora MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Aurora MySQL
- AWS RDS
- AWS CLI (`aws rds`, `aws application-autoscaling`)
- Aurora Serverless v2
- Aurora Global Database
- Aurora Auto Scaling (Application Auto Scaling)
- Performance Insights
- MySQL client

## Sources Consulted
- AWS Aurora MySQL documentation: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.AuroraMySQL.html
- AWS CLI `create-db-cluster` reference: https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-cluster.html
- AWS CLI `create-db-instance` reference: https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-instance.html
- Aurora Serverless v2 documentation: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.html
- Aurora Auto Scaling documentation: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Integrating.AutoScaling.html
- Aurora Global Database documentation: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database.html

## Issues Found

1. **Aurora Serverless v2 section missing instance creation step**: The original post only showed `create-db-cluster` with `--serverless-v2-scaling-configuration` but omitted the required `create-db-instance` call with `--db-instance-class db.serverless`. Without this step, the cluster has no compute capacity and cannot serve queries. Added the missing `create-db-instance` command with `db.serverless` instance class.

2. **AWS account ID in Global Database ARN was only 9 digits**: The ARN `arn:aws:rds:us-east-1:123456789:cluster:my-aurora-cluster` used a 9-digit placeholder account ID. AWS account IDs are always 12 digits. Changed to the standard AWS documentation placeholder `123456789012`.

## Review Notes
- The "5x throughput" claim is AWS's own marketing benchmark and is stated correctly per AWS documentation.
- The comparison table values (read replica counts, failover times, replication lag) are accurate for current Aurora vs RDS MySQL.
- The ~20% cost premium for Aurora over RDS MySQL is a rough approximation that varies by workload and instance type but is a reasonable general figure.
- The engine version `8.0.mysql_aurora.3.04.0` is a valid Aurora MySQL 3 version. Users should check for the latest available version at time of use.
- The post uses `--master-user-password` directly in the CLI command. For production use, AWS recommends `--manage-master-user-password` to store credentials in Secrets Manager, but the approach shown is still valid.
