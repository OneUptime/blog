# Validation Summary: How to Use ECS Service Discovery with Cloud Map

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ECS
- AWS Cloud Map
- Amazon Route 53 private hosted zones and multivalue routing
- AWS CLI
- Terraform AWS provider
- AWS CloudFormation
- Python DNS lookup with `socket`
- Node.js HTTP client usage
- Java DNS cache security properties

## Sources Consulted
- Amazon ECS Developer Guide: Service discovery with DNS names: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-discovery.html
- AWS CLI Command Reference: `servicediscovery create-private-dns-namespace`: https://docs.aws.amazon.com/cli/latest/reference/servicediscovery/create-private-dns-namespace.html
- AWS Cloud Map API Reference: `HealthCheckCustomConfig`: https://docs.aws.amazon.com/cloud-map/latest/api/API_HealthCheckCustomConfig.html
- AWS Cloud Map Developer Guide: namespaces and private DNS hosted zones: https://docs.aws.amazon.com/cloud-map/latest/dg/working-with-namespaces.html
- Amazon Route 53 Developer Guide: private hosted zones: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zones-private.html
- Amazon Route 53 Developer Guide: private hosted zone considerations: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zone-private-considerations.html
- Amazon Route 53 Developer Guide: multivalue answer routing: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-multivalue.html
- AWS CloudFormation Template Reference: `AWS::ECS::Service` `ServiceRegistry`: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-ecs-service-serviceregistry.html
- AWS CloudFormation Template Reference: `AWS::ServiceDiscovery::PrivateDnsNamespace`: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-servicediscovery-privatednsnamespace.html
- AWS CloudFormation Template Reference: `AWS::ServiceDiscovery::Service`: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-servicediscovery-service.html
- Terraform Registry: `aws_ecs_service` service registries: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- Terraform Registry: `aws_service_discovery_service`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/service_discovery_service
- Oracle Java networking properties: https://docs.oracle.com/en/java/javase/19/core/java-networking.html

## Issues Found
- The post said DNS queries return "healthy endpoints" without qualification. Updated this to "available endpoints" because ECS service discovery exposes registered instances and ECS-managed health depends on task state and configured container health checks.
- The `failure_threshold = 1` explanation said a task is deregistered after one failed health check. Updated this because AWS Cloud Map's `FailureThreshold` for custom health checks is deprecated and always treated as `1`, while ECS manages Cloud Map health from task state and container health checks.
- The CloudFormation section described the snippet as a "complete" template for two services, but it only defines two discovery services and one ECS service and omits required referenced resources. Updated the wording to call it a focused example.
- The DNS caching section said the VPC DNS resolver might not respect very low TTLs. Updated this to focus on client-side DNS caches, which is the more accurate operational concern for this example.
- The Java DNS cache section said the JVM caches DNS indefinitely by default. Updated this because Oracle documents `networkaddress.cache.ttl` as implementation-specific when no security manager is installed, while `-1` explicitly means cache forever.
- The troubleshooting section said VPC peering is enough when the namespace is in another VPC. Updated this because Route 53 private hosted zones must be associated with the querying VPC or reached through Resolver forwarding, with network connectivity handled separately.
- The troubleshooting section said only healthy tasks get registered. Updated this to reflect ECS updating Cloud Map health from task state and container health checks.

## Review Notes
The Terraform, AWS CLI, and CloudFormation field names used in the examples are consistent with current official references. The examples are intentionally partial and depend on surrounding VPC, ECS cluster, task definition, subnet, and security group resources.
