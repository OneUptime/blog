# Validation Summary: How to Set Up AWS Cloud Map Service Discovery with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- AWS Cloud Map
- Amazon ECS
- AWS provider for OpenTofu/Terraform
- HCL

## Sources Consulted
- AWS Cloud Map Developer Guide: https://docs.aws.amazon.com/cloud-map/latest/dg/what-is-cloud-map.html
- AWS Cloud Map namespace creation docs: https://docs.aws.amazon.com/cloud-map/latest/dg/creating-namespaces.html
- AWS Cloud Map service DNS configuration: https://docs.aws.amazon.com/cloud-map/latest/dg/services-route53.html
- AWS Cloud Map CreateService API reference: https://docs.aws.amazon.com/cloud-map/latest/api/API_CreateService.html
- AWS Cloud Map instance registration docs: https://docs.aws.amazon.com/cloud-map/latest/dg/registering-instances.html
- AWS Cloud Map health check docs: https://docs.aws.amazon.com/cloud-map/latest/dg/services-health-checks.html
- Amazon ECS service discovery docs: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-discovery.html
- Amazon ECS ServiceRegistry API reference: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ServiceRegistry.html
- AWS provider docs for `aws_service_discovery_private_dns_namespace`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/service_discovery_private_dns_namespace.html.markdown
- AWS provider docs for `aws_service_discovery_public_dns_namespace`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/service_discovery_public_dns_namespace.html.markdown
- AWS provider docs for `aws_service_discovery_service`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/service_discovery_service.html.markdown
- AWS provider docs for `aws_service_discovery_instance`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/service_discovery_instance.html.markdown
- AWS provider docs for `aws_ecs_service`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ecs_service.html.markdown
- OpenTofu CLI docs for `init`: https://opentofu.org/docs/v1.11/cli/commands/init/
- OpenTofu CLI docs for `plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI docs for `apply`: https://opentofu.org/docs/v1.11/cli/commands/apply/

## Issues Found
- The introduction said Cloud Map services register locations such as "ARN", which is misleading for service instance registration. I changed this to IP addresses, ports, and custom metadata to match AWS Cloud Map instance registration behavior.
- The public DNS namespace comment implied any public namespace example was internet-ready as written. I clarified that public DNS namespaces require a registered public domain.
- The routing policy comment described `WEIGHTED` as round-robin. AWS documents `WEIGHTED` as returning one randomly selected instance, while `MULTIVALUE` returns up to eight healthy instances. I corrected the comment.
- The service example used `health_check_custom_config`, which is marked deprecated in the current AWS provider docs. I removed that block so the example uses current provider syntax without introducing private-DNS health-check confusion.

## Review Notes
- The remaining HCL snippets and OpenTofu commands are valid.
- For private DNS namespaces, Route 53 health checks are not supported. If the post is later expanded to cover health-aware ECS discovery, that section should be checked carefully against the current AWS provider behavior for Cloud Map custom health configuration.
