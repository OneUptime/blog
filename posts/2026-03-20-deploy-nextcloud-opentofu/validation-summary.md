# Validation Summary: How to Deploy Nextcloud with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / Terraform-style HCL
- AWS ECS Fargate
- AWS RDS for PostgreSQL
- AWS ElastiCache for Redis OSS
- Amazon S3
- AWS IAM
- Nextcloud

## Sources Consulted
- Nextcloud Administration Manual, Primary Object Storage: https://docs.nextcloud.com/server/latest/admin_manual/configuration_files/primary_storage.html
- Nextcloud Docker Official Image docs: https://hub.docker.com/_/nextcloud/
- Nextcloud Docker source repository: https://github.com/nextcloud/docker
- Nextcloud server source (`S3ConnectionTrait.php`): https://github.com/nextcloud/server
- AWS ECS task definitions: https://docs.aws.amazon.com/AmazonECS/latest/userguide/task_definitions.html
- AWS ECS task definition parameters for Fargate: https://docs.aws.amazon.com/AmazonECS/latest/userguide/task_definition_parameters.html
- Amazon RDS for PostgreSQL updates: https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-versions.html
- Amazon RDS for PostgreSQL release calendar: https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-release-calendar.html
- Amazon ElastiCache AUTH documentation: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/auth.html
- Amazon ElastiCache in-transit encryption: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/in-transit-encryption.html
- Terraform AWS provider docs for `aws_db_instance`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/db_instance.html.markdown
- Terraform AWS provider docs for `aws_ecs_task_definition`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/ecs_task_definition.html.markdown
- Terraform AWS provider docs for `aws_elasticache_replication_group`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/elasticache_replication_group.html.markdown
- Terraform AWS provider docs for `aws_s3_bucket_server_side_encryption_configuration`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/s3_bucket_server_side_encryption_configuration.html.markdown
- Terraform AWS provider docs for `aws_iam_role_policy`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/iam_role_policy.html.markdown

## Issues Found
- The ECS example used `nextcloud:28-fpm` and exposed port `9000` as if it were a standalone web container. The official Nextcloud image docs state that the `fpm` variant must be paired with a separate web server, so the example was changed to `nextcloud:33-apache` and port `80`.
- The post pinned RDS PostgreSQL to `15.4`, which AWS now documents as having reached end of standard support. It was changed to major version `15` so new instances use a current supported 15.x release.
- The task definition set `OBJECTSTORE_S3_USEPATH_STYLE` to `true` for AWS S3. Nextcloud’s object storage docs and Docker image docs say path-style access is generally not required for Amazon S3, so it was changed to `false`.
- The description and introduction described EFS as file storage while the post configures S3 as Nextcloud primary object storage. The wording was corrected so EFS is described as persistent application storage and S3 as the primary object storage backend.

## Review Notes
- The S3 credential guidance in the conclusion is technically sound. The Nextcloud Docker image injects S3 config from environment variables, and Nextcloud server code falls back to the AWS SDK default credential provider chain when explicit S3 keys are not supplied, which supports ECS task-role credentials.
- The Redis replication group example remains compatible with password-based Nextcloud Redis configuration because ElastiCache AUTH is still supported for node-based Redis OSS replication groups, even though AWS now recommends RBAC for newer deployments.
