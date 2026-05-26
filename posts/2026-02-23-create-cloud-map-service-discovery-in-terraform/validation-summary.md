# Validation Summary: How to Create Cloud Map Service Discovery in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS Cloud Map
- Amazon Route 53 DNS records and health checks
- Amazon ECS service discovery
- AWS CLI

## Sources Consulted
- Terraform AWS Provider `aws_service_discovery_service` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/service_discovery_service
- Terraform AWS Provider v5 `aws_service_discovery_service` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/v5.100.0/website/docs/r/service_discovery_service.html.markdown
- Terraform AWS Provider `aws_service_discovery_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/service_discovery_instance
- Terraform AWS Provider `aws_ecs_service` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- AWS Cloud Map CreateService API: https://docs.aws.amazon.com/cloud-map/latest/api/API_CreateService.html
- AWS Cloud Map service DNS configuration: https://docs.aws.amazon.com/cloud-map/latest/dg/services-route53.html
- AWS Cloud Map RegisterInstance API: https://docs.aws.amazon.com/cloud-map/latest/api/API_RegisterInstance.html
- AWS Cloud Map HealthCheckConfig API: https://docs.aws.amazon.com/cloud-map/latest/api/API_HealthCheckConfig.html
- AWS Cloud Map HealthCheckCustomConfig API: https://docs.aws.amazon.com/cloud-map/latest/api/API_HealthCheckCustomConfig.html
- Amazon ECS service discovery documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-discovery.html
- AWS CLI `servicediscovery discover-instances` command reference: https://docs.aws.amazon.com/cli/latest/reference/servicediscovery/discover-instances.html
- AWS CLI `servicediscovery list-instances` command reference: https://docs.aws.amazon.com/cli/latest/reference/servicediscovery/list-instances.html

## Issues Found
- The service example used both `A` and `SRV` DNS records in the same Cloud Map service. AWS Cloud Map supports `A`, `AAAA`, `A` plus `AAAA`, `SRV`, or `CNAME`, but not `A` plus `SRV`. Changed the example to use `A` plus `AAAA`.
- The custom health check examples used `failure_threshold = 2` in some places. AWS Cloud Map now documents the custom health check `FailureThreshold` member as deprecated and always set to `1`, so the examples were changed to `1`.
- The best-practices section said `WEIGHTED` routing is better when you want to control traffic distribution. AWS Cloud Map uses equal weights for service instances, so this was corrected to describe that it returns one randomly selected healthy value.

## Review Notes
- The post pins the AWS provider to `~> 5.0`. In provider v5, `health_check_custom_config` is documented for ECS-managed health checks. In the current provider v6 documentation, the Terraform argument is marked deprecated, while the AWS Cloud Map API still documents custom health checks for VPC or third-party health-check scenarios. Future updates should revisit this if the post is migrated to AWS provider v6.
