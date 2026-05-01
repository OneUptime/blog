# Validation Summary: How to Set Up ECS Service Discovery with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS ECS
- AWS Cloud Map
- Amazon Route 53 private DNS
- AWS CLI
- Python `requests`

## Sources Consulted
- AWS ECS service discovery documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-discovery.html
- AWS Cloud Map service DNS configuration: https://docs.aws.amazon.com/cloud-map/latest/dg/services-route53.html
- AWS Cloud Map `HealthCheckCustomConfig` API reference: https://docs.aws.amazon.com/cloud-map/latest/api/API_HealthCheckCustomConfig.html
- AWS CLI `ecs run-task` command reference: https://docs.aws.amazon.com/cli/latest/reference/ecs/run-task.html
- Terraform AWS provider docs for `aws_ecs_service`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ecs_service.html.markdown
- Terraform AWS provider docs for `aws_service_discovery_private_dns_namespace`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/service_discovery_private_dns_namespace.html.markdown
- Terraform AWS provider source for `aws_service_discovery_service`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/internal/service/servicediscovery/service.go

## Issues Found
- The post said `MULTIVALUE` routing "distributes traffic across all healthy task IPs." AWS documents that multivalue answer routing returns up to eight records per DNS response, so I corrected the inline comment and conclusion to match actual Route 53 behavior.
- The example used `health_check_custom_config.failure_threshold = 1`. In the current AWS provider, that argument is deprecated and AWS always treats the value as `1`, so I removed the deprecated setting from the example.
- The Step 5 heading implied an ALB "fallback" relationship with service discovery. AWS documents that service discovery traffic goes directly to the task rather than the load balancer, so I renamed the heading to avoid that implication.
- The Step 6 comment claimed the `aws ecs run-task` command itself tests DNS resolution. The command launches a task; it does not perform the DNS lookup by itself. I updated the wording to describe the command accurately and made `assignPublicIp=DISABLED` explicit in the network configuration.

## Review Notes
- The post assumes the VPC has DNS support and DNS hostnames enabled; AWS ECS service discovery requires the VPC DNS attributes to be configured for successful DNS resolution.
- If readers later want DNS responses filtered by ECS/container health, they should add ECS container health checks and account for the current AWS provider behavior around `HealthCheckCustomConfig` for private DNS namespaces.
