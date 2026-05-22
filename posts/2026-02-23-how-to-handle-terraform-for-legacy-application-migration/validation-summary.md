# Validation Summary: How to Handle Terraform for Legacy Application Migration

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform
- AWS provider for Terraform
- Amazon EC2
- Amazon RDS for PostgreSQL
- Elastic Load Balancing Application Load Balancers
- AWS Site-to-Site VPN gateway
- AWS Database Migration Service
- Oracle Database
- PostgreSQL
- YAML

## Sources Consulted
- Terraform AWS provider `aws_db_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider `aws_lb_listener_rule` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener_rule
- Terraform AWS provider `aws_dms_endpoint` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dms_endpoint
- Terraform AWS provider `aws_dms_replication_task` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dms_replication_task
- Amazon RDS for PostgreSQL release calendar: https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-release-calendar.html
- Amazon RDS for PostgreSQL updates: https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-versions.html
- AWS Application Load Balancer target group documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html
- AWS DMS table mapping documentation: https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.TableMapping.SelectionTransformation.html
- AWS DMS selection rules documentation: https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.TableMapping.SelectionTransformation.Selections.html
- AWS DMS Schema Conversion documentation: https://docs.aws.amazon.com/dms/latest/userguide/schema-conversion.html
- AWS Prescriptive Guidance for heterogeneous Oracle migrations: https://docs.aws.amazon.com/prescriptive-guidance/latest/migration-oracle-database/heterogeneous-migration.html

## Issues Found
- The RDS PostgreSQL example pinned `engine_version = "15.4"`, which has reached end of standard support in Amazon RDS. Updated it to `15.17`, a currently supported PostgreSQL 15 minor version in the RDS release calendar.
- The `aws_db_instance` example omitted master database credentials for a newly created PostgreSQL DB instance. Added `username = var.postgres_username` and `password = var.postgres_password` so the Terraform example includes the required inputs.
- The DMS section implied that DMS alone handles the Oracle-to-PostgreSQL database migration. Clarified that AWS DMS is used for data migration after converting the Oracle schema to PostgreSQL, matching AWS guidance for heterogeneous migrations.
- The VPN resource comment described `aws_vpn_gateway` as a complete VPN connection. Updated the wording to describe it as a VPN gateway, because a full Site-to-Site VPN connection also requires related resources such as a customer gateway and VPN connection.

## Review Notes
The examples are still illustrative and omit surrounding resources such as provider configuration, AMI data sources, DB subnet groups, security groups, listeners, target group attachments, customer gateway/VPN connection resources, and variable declarations. Terraform will also store clear-text database passwords in state when using direct `password` arguments; a production version should consider managed secrets or another credential-management pattern.
