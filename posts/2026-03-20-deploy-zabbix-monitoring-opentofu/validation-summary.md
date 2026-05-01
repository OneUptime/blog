# Validation Summary: How to Deploy Zabbix Monitoring with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / HCL
- AWS RDS for MySQL
- Amazon ECS
- AWS Fargate
- AWS Cloud Map
- Zabbix
- AWS Secrets Manager

## Sources Consulted
- Zabbix 6.4 database creation docs: https://www.zabbix.com/documentation/6.4/en/manual/appendix/install/db_scripts
- Zabbix container installation docs: https://www.zabbix.com/documentation/current/en/manual/installation/containers
- Official Zabbix Docker 6.4 server entrypoint: https://raw.githubusercontent.com/zabbix/zabbix-docker/archive/6.4/Dockerfiles/server-mysql/ubuntu/docker-entrypoint.sh
- Official Zabbix Docker 6.4 web entrypoint: https://raw.githubusercontent.com/zabbix/zabbix-docker/archive/6.4/Dockerfiles/web-nginx-mysql/ubuntu/docker-entrypoint.sh
- Official Zabbix Docker 6.4 web Dockerfile: https://raw.githubusercontent.com/zabbix/zabbix-docker/archive/6.4/Dockerfiles/web-nginx-mysql/ubuntu/Dockerfile
- Amazon ECS service discovery overview: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-discovery.html
- Creating an Amazon ECS service that uses service discovery: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/create-service-discovery.html
- Amazon ECS Fargate task definition differences: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-tasks-services.html
- Amazon ECS `ServiceRegistry` API reference: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ServiceRegistry.html
- AWS Cloud Map `CreateService` API reference: https://docs.aws.amazon.com/cloud-map/latest/api/API_CreateService.html
- AWS Cloud Map service health checks: https://docs.aws.amazon.com/cloud-map/latest/dg/services-health-checks.html
- RDS DB parameter formulas: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ParamValuesRef.html
- RDS for MySQL binary logging: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_LogAccess.MySQL.BinaryFormat.html
- Amazon RDS troubleshooting for MySQL triggers and `log_bin_trust_function_creators`: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Troubleshooting.html
- RDS parameter groups overview: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/parameter-groups-overview.html
- AWS provider `aws_db_instance` docs source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/db_instance.html.markdown
- AWS provider `aws_db_parameter_group` docs source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/db_parameter_group.html.markdown
- AWS provider `aws_ecs_task_definition` docs source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ecs_task_definition.html.markdown
- AWS provider `aws_ecs_service` docs source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ecs_service.html.markdown
- AWS provider `aws_service_discovery_service` docs source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/service_discovery_service.html.markdown

## Issues Found
- The description said the post deployed Zabbix with an ALB, but the post did not include any ALB configuration or explanation. I corrected the description to match the technologies the post actually covers: RDS, ECS Fargate, and Cloud Map service discovery.
- The DB parameter group name was hard-coded as `zabbix-mysql8`, while the rest of the stack was environment-scoped. I changed it to `zabbix-mysql8-${var.environment}` to avoid cross-environment name collisions.
- The RDS parameter group was missing `log_bin_trust_function_creators`. Zabbix 6.4 on MySQL requires this when binary logging is enabled and there are no superuser privileges; Amazon RDS enables binary logging when `backup_retention_period` is greater than zero. I added `log_bin_trust_function_creators = 1` with `apply_method = "pending-reboot"`.
- The `character_set_server` and `collation_server` parameter blocks did not specify `apply_method`. RDS applies static parameters with `pending-reboot`, and AWS recommends setting character set and collation parameters before creating the DB instance. I marked both as `pending-reboot`.
- The Zabbix server task definition passed `MYSQL_ROOT_PASSWORD`. In the official Zabbix 6.4 server entrypoint, setting that variable causes the container to use the root account by default. In this post, the RDS master username is `zabbix`, not `root`, so the example would fail against RDS. I removed `MYSQL_ROOT_PASSWORD` from the ECS task definition.
- The web frontend health check used `curl` against `/`. The official Zabbix web Nginx image defines its health check against `http://localhost:8080/ping`. I updated the ECS container health check to use `/ping`.
- The Cloud Map section created the namespace and service, but it never showed the ECS service registration required to populate DNS records. Without `service_registries`, `zabbix-server.${var.environment}.local` would not resolve. I added an `aws_ecs_service` example that registers the Zabbix server service with Cloud Map.
- The conclusion referred to “monitoring agents (Zabbix proxies),” which conflates different Zabbix components. I corrected the wording to refer to Zabbix proxies.

## Review Notes
- `health_check_custom_config` is still the correct Cloud Map health-check mode for ECS-backed private DNS service discovery because Route 53 health checks are not supported for private DNS namespaces. The AWS provider docs currently mark the Terraform argument as deprecated, so this area is worth re-checking when upgrading provider versions.
- The post still assumes surrounding resources exist, such as IAM roles, security groups, ECS cluster resources, subnets, and Secrets Manager secret values. The corrected snippets are technically accurate for the components shown, but they are still partial infrastructure examples rather than a complete deployable stack.
- `tofu` and `terraform` were not installed in the review environment, so validation was documentation- and source-based rather than CLI schema-based.
