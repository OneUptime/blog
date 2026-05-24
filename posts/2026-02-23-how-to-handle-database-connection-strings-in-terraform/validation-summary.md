# Validation Summary: How to Handle Database Connection Strings in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- AWS provider — `aws_db_instance` (RDS), `aws_rds_cluster` (Aurora), `aws_elasticache_replication_group` (Redis), `aws_docdb_cluster` (DocumentDB), `aws_secretsmanager_secret`, `aws_secretsmanager_secret_version`, `aws_ssm_parameter`, `aws_ecs_task_definition`
- PostgreSQL, MySQL, MongoDB, Redis URI / connection string formats
- AWS Secrets Manager and SSM Parameter Store
- ECS Fargate task definition `secrets[].valueFrom` JSON-key extraction
- JDBC URL syntax for PostgreSQL

## Sources Consulted
- Terraform AWS provider — `aws_db_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider — `aws_rds_cluster`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster
- Terraform AWS provider — `aws_elasticache_replication_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_replication_group
- Terraform AWS provider — `aws_docdb_cluster`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/docdb_cluster
- Terraform AWS provider — `aws_ssm_parameter` (valid types: `String`, `StringList`, `SecureString`)
- AWS ECS — Specifying individual JSON keys in Secrets Manager secrets: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/secrets-envvar-secrets-manager.html
- AWS DocumentDB — Functional differences (retryable writes): https://docs.aws.amazon.com/documentdb/latest/developerguide/functional-differences.html
- IANA URI scheme registry — `rediss://` (TLS): https://www.iana.org/assignments/uri-schemes/prov/rediss
- PostgreSQL connection URI documentation (`postgresql://user:password@host:port/database`)

## Issues Found
No technical issues found.

## Review Notes
- All Terraform resource argument names and exported attribute references in the post are correct against AWS provider v5.x. In particular, `aws_db_instance.address`/`port`/`username`/`db_name`, `aws_rds_cluster.endpoint`/`reader_endpoint`/`port`/`master_username`/`database_name`, `aws_elasticache_replication_group.primary_endpoint_address`/`reader_endpoint_address`/`port`, and `aws_docdb_cluster.endpoint`/`reader_endpoint`/`port`/`master_username` are all valid (configured arguments are always readable as attributes on the resource, even when not duplicated in the docs' "Attribute Reference" block).
- `aws_elasticache_replication_group.description` is the current argument name in AWS provider v5.x (the deprecated `replication_group_description` was renamed in v4.0).
- The ECS `secrets[].valueFrom` syntax `<secret-arn>:<json-key>::` (with two trailing colons for empty version-stage and version-id) is the documented format for extracting individual JSON keys.
- DocumentDB connection string correctly disables retryable writes (`retryWrites=false`) — AWS DocumentDB does not support retryable writes.
- `rediss://:password@host:port` (empty userinfo username before the colon) is a valid URI form when only an AUTH password is used (no ACL username).
- `engine_version = "15.4"` for RDS PostgreSQL and Aurora PostgreSQL was a valid release at the time of writing; readers running newer engines may need to bump to a currently-supported minor.
- The JDBC URL `?ssl=true&sslmode=require` is technically redundant — `sslmode=require` alone suffices on modern pgJDBC — but using both is not incorrect and remains supported.
- `num_cache_clusters` is used correctly here (cluster mode disabled). For Redis cluster mode enabled, `num_node_groups` and `replicas_per_node_group` would be used instead.
