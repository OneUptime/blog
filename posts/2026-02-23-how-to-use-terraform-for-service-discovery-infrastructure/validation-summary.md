# Validation Summary: How to Use Terraform for Service Discovery Infrastructure

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS Cloud Map
- Amazon ECS
- Amazon Route 53
- Elastic Load Balancing target groups
- Amazon CloudWatch and Container Insights
- HashiCorp Consul

## Sources Consulted
- Terraform AWS Provider: `aws_service_discovery_private_dns_namespace` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/service_discovery_private_dns_namespace
- Terraform AWS Provider: `aws_service_discovery_service` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/service_discovery_service
- Terraform AWS Provider: `aws_ecs_service` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- Terraform AWS Provider: `aws_route53_record` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- Terraform AWS Provider: `aws_route53_health_check` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_health_check
- Terraform AWS Provider: `aws_lb_target_group` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- AWS Cloud Map DNS configuration - https://docs.aws.amazon.com/cloud-map/latest/dg/services-route53.html
- AWS Cloud Map health check configuration - https://docs.aws.amazon.com/cloud-map/latest/dg/services-health-checks.html
- AWS Cloud Map API / AWS CLI service discovery reference - https://docs.aws.amazon.com/cli/latest/reference/servicediscovery/
- Route 53 private hosted zone failover guidance - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-private-hosted-zones.html
- Route 53 alias target health for load balancers - https://docs.aws.amazon.com/Route53/latest/APIReference/API_AliasTarget.html
- Amazon ECS Container Insights metrics - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Container-Insights-metrics-ECS.html
- Consul ports reference - https://developer.hashicorp.com/consul/docs/reference/architecture/ports

## Issues Found
- The DNS-based service discovery section used direct Route 53 endpoint health checks against ALB DNS names inside a private hosted zone example. Route 53 health checkers are outside the VPC, and ALB alias records with `evaluate_target_health = true` use load balancer target group health. Replaced the `aws_route53_health_check` example with an `aws_lb_target_group` health check example.
- The Consul security group allowed TCP on port 8301 for LAN Serf gossip but omitted UDP. Consul documents LAN Serf as TCP and UDP on port 8301. Added the UDP ingress rule.
- The monitoring example used an `AWS/ServiceDiscovery` `HealthyInstanceCount` CloudWatch metric with `ServiceId` and `NamespaceId` dimensions. AWS Cloud Map health is exposed through APIs and Route 53/custom health behavior, not through that CloudWatch metric. Replaced the example with `ECS/ContainerInsights` `RunningTaskCount` for ECS services registered in Cloud Map.
- The best-practices section implied a fixed short TTL could apply broadly to all DNS service discovery records. Route 53 alias records do not allow setting a custom TTL. Added a caveat that alias records use the target's TTL and should rely on target health for failover.
- The health-check guidance did not mention that AWS Cloud Map custom health checks require an external checker to report status. Added the `UpdateInstanceCustomHealthStatus` caveat and private endpoint guidance.

## Review Notes
- The snippets are still partial infrastructure examples and assume supporting variables, security groups, IAM instance profiles, AMIs, ECS task definitions, ALB listeners, and target attachments exist elsewhere.
- `RunningTaskCount` in the monitoring example requires ECS Container Insights. Without Container Insights, teams should monitor ECS service metrics, ALB target group health, Cloud Map API health status, or Route 53 health checks depending on the chosen discovery pattern.
