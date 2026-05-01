# Validation Summary: How to Deploy n8n Workflow Automation with OpenTofu

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- n8n
- OpenTofu / Terraform-style HCL
- AWS ECS Fargate
- Amazon RDS for PostgreSQL
- Amazon EFS
- Amazon S3
- AWS Secrets Manager
- AWS IAM
- Application Load Balancer concepts

## Sources Consulted
- n8n database environment variables: https://docs.n8n.io/hosting/configuration/environment-variables/database/
- n8n deployment environment variables: https://docs.n8n.io/hosting/configuration/environment-variables/deployment/
- n8n binary data environment variables: https://docs.n8n.io/hosting/configuration/environment-variables/binary-data/
- n8n external data storage environment variables: https://docs.n8n.io/hosting/configuration/environment-variables/external-data-storage/
- n8n user management environment variables: https://docs.n8n.io/hosting/configuration/environment-variables/user-management-smtp-2fa/
- n8n monitoring and health endpoints: https://docs.n8n.io/hosting/logging-monitoring/monitoring/
- n8n reverse proxy webhook configuration: https://docs.n8n.io/hosting/configuration/configuration-examples/webhook-url/
- n8n external storage for binary data: https://docs.n8n.io/hosting/scaling/external-storage/
- n8n queue mode: https://docs.n8n.io/hosting/scaling/queue-mode/
- n8n v1.0 migration guide (`EXECUTIONS_PROCESS` deprecation): https://docs.n8n.io/1-0-migration-checklist/
- Official n8n Docker image README: https://github.com/n8n-io/n8n/blob/master/docker/images/n8n/README.md
- Official n8n Docker image Dockerfile: https://github.com/n8n-io/n8n/blob/master/docker/images/n8n/Dockerfile
- Official n8n base image Dockerfile: https://github.com/n8n-io/n8n/blob/master/docker/images/n8n-base/Dockerfile
- Amazon RDS for PostgreSQL versions: https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-versions.html
- Amazon ECS task definition parameters: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
- Amazon ECS health checks: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/healthcheck.html
- Amazon ECS task definition differences for Fargate: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-tasks-services.html
- AWS SDK container credential provider: https://docs.aws.amazon.com/sdkref/latest/guide/feature-container-credentials.html
- Terraform AWS provider `aws_db_instance` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/db_instance.html.markdown
- Terraform AWS provider `aws_ecs_task_definition` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ecs_task_definition.html.markdown
- Terraform AWS provider `aws_s3_bucket_server_side_encryption_configuration` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/s3_bucket_server_side_encryption_configuration.html.markdown
- Terraform AWS provider `aws_s3_bucket_lifecycle_configuration` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/s3_bucket_lifecycle_configuration.html.markdown
- Terraform AWS provider `aws_iam_role_policy` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/iam_role_policy.html.markdown

## Issues Found
- The post pinned RDS PostgreSQL to `15.4`, which AWS now lists as having reached end of standard support. I changed it to major version `15` so new deployments use a current supported 15.x release.
- The introduction described EFS as handling files, but the mounted `/home/node/.n8n` path is the n8n user-data directory that stores important instance data such as the encryption key. I corrected the wording to match the official n8n Docker docs.
- The ECS task definition used `n8nio/n8n:latest`. I updated it to the current official image registry path `docker.n8n.io/n8nio/n8n:latest`.
- The task definition omitted `N8N_PROXY_HOPS`, even though the post describes n8n behind an ALB/reverse proxy. I added `N8N_PROXY_HOPS=1` and normalized `WEBHOOK_URL` to the documented reverse-proxy form.
- The post used outdated S3 binary data environment variables (`N8N_BINARY_DATA_STORAGE`, `N8N_BINARY_DATA_S3_BUCKET`, and `N8N_BINARY_DATA_S3_REGION`). I replaced them with the current n8n external-storage variables and the required `N8N_AVAILABLE_BINARY_DATA_MODES` / `N8N_DEFAULT_BINARY_DATA_MODE` settings.
- The guide used `EXECUTIONS_PROCESS=main`, which n8n deprecated in v1.0. I replaced it with the current `EXECUTIONS_MODE=regular` setting.
- The task definition referenced Secrets Manager resources for the database password and JWT secret that were never defined in the post. I added matching `aws_secretsmanager_secret` and `aws_secretsmanager_secret_version` resources so the references are consistent.
- The S3 section did not mention that n8n external S3 storage is an Enterprise-only feature. I added the licensing caveat in the introduction, storage section, and conclusion.
- The S3 section omitted bucket lifecycle configuration, but n8n’s external storage docs state that pruning of S3-backed binary data is delegated to S3 lifecycle rules. I added an `aws_s3_bucket_lifecycle_configuration` example.
- The S3 IAM example granted a narrow custom action list that may not cover the full set of calls used by n8n’s documented setup. I aligned it with the n8n docs’ `s3:*` example policy for the bucket and its objects.
- The container health check relied on `wget`, but the current official n8n image build does not explicitly install `curl` or `wget` in the final image. I replaced it with a Node-based readiness probe that uses tooling the image definitely includes.
- The conclusion claimed S3 avoids “EFS performance limitations.” n8n’s own documentation frames the benefit as avoiding reliance on the filesystem for large amounts of binary data, so I corrected that explanation and kept the enterprise-license caveat.

## Review Notes
- The post now reflects that S3 binary storage uses n8n external storage and therefore requires an Enterprise license. Readers on the free Community edition would need to use filesystem or database-backed binary data instead.
- The example lifecycle rule expires binary data after 30 days as a reasonable default for the snippet. Teams should adjust that retention window to match their operational and compliance requirements.
- The `aws_db_instance.password` argument is technically valid, but the AWS provider documentation notes that database passwords are stored in Terraform/OpenTofu state when set this way. Remote state protection still matters for a production deployment.
- The surrounding IAM for `aws_iam_role.ecs_execution` is not shown in the excerpt. In a real deployment, that execution role still needs permission to read the referenced Secrets Manager secrets and publish logs to CloudWatch.
