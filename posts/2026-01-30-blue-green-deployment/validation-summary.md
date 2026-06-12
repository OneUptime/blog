# Validation Summary: How to Create Blue-Green Deployment

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Blue-green deployment
- AWS Application Load Balancer
- AWS Elastic Load Balancing v2 target groups and listeners
- Amazon ECS deployments
- AWS CLI
- Terraform AWS provider
- boto3 / Amazon CloudWatch
- GitHub Actions
- PostgreSQL migrations

## Sources Consulted
- AWS CLI `elbv2 modify-listener` command reference: https://docs.aws.amazon.com/cli/latest/reference/elbv2/modify-listener.html
- AWS CLI `elbv2 describe-target-health` command reference: https://docs.aws.amazon.com/cli/latest/reference/elbv2/describe-target-health.html
- AWS CLI `ecs update-service` command reference: https://docs.aws.amazon.com/cli/latest/reference/ecs/update-service.html
- AWS CLI `ecs wait services-stable` command reference: https://docs.aws.amazon.com/cli/latest/reference/ecs/wait/services-stable.html
- Amazon ECS `UpdateService` API reference: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_UpdateService.html
- Boto3 CloudWatch client reference: https://docs.aws.amazon.com/boto3/latest/reference/services/cloudwatch.html
- Amazon CloudWatch `GetMetricStatistics` API reference: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_GetMetricStatistics.html
- AWS Application Load Balancer CloudWatch metrics reference: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html
- Terraform AWS provider `aws_lb_listener` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener
- Terraform AWS provider `aws_lb_target_group` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- PostgreSQL `ALTER TABLE` documentation: https://www.postgresql.org/docs/current/sql-altertable.html
- PostgreSQL `CREATE INDEX` documentation: https://www.postgresql.org/docs/current/sql-createindex.html
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions

## Issues Found
- The Bash deployment script captured log output and AWS `update-service` JSON in `target=$(deploy_to_inactive "$active")`, so the target environment value could be polluted. Changed deployment log messages to stderr and suppressed the `update-service` JSON output so stdout returns only `blue` or `green`.
- The Bash health check used `grep -qv "healthy"`, which can treat `unhealthy` as healthy because it contains the substring `healthy`. Changed the check to require exact `healthy` states and to keep waiting when the target-health output is empty.
- The Bash script used `((attempt++))` under `set -euo pipefail`, which can exit on the first increment because the arithmetic expression initially evaluates to zero. Changed it to `((attempt += 1))`.
- The ECS workflow pushed only the immutable Git SHA tag, while the deployment script used `aws ecs update-service --force-new-deployment`. ECS only repulls the current image/tag combination from the service task definition in that flow. Updated the example to also push `latest`, pass `IMAGE_TAG: latest`, and note that immutable tags require registering a new task definition revision first.
- The Python rollback monitor passed epoch floats to CloudWatch `StartTime` and `EndTime`. Updated it to use timezone-aware `datetime` values.
- The Python rollback monitor used only the final ARN segment as the `TargetGroup` CloudWatch dimension. ALB target metrics require the published target group and load balancer dimension values. Added helpers to derive the correct `TargetGroup` and `LoadBalancer` dimensions from ELBv2 ARNs.
- The Python rollback monitor printed "No traffic yet" for a real 0% error rate because `0.0` is falsy. Changed the condition to distinguish `None` from `0.0`.
- The Python rollback configuration included a latency threshold field that was never used, while the script only monitored error rate. Removed the unused field to keep the example accurate.

## Review Notes
- The Terraform snippets match the current AWS provider listener and target group shape for weighted ALB forwarding, but they are partial examples and depend on surrounding resources such as `aws_lb.main`, VPC configuration, certificates, and registered blue/green compute capacity.
- The database migration example is PostgreSQL-oriented because it uses `CREATE INDEX CONCURRENTLY IF NOT EXISTS`. The expand-contract guidance is technically sound, but production migrations should still be run through the application's migration framework and transaction model.
- Local syntax checks were run for the extracted Bash and Python snippets: `bash -n` and `python3 -m py_compile`.
