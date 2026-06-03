# Validation Summary: How to Use AWS Cloud Map for Service Discovery

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Cloud Map
- AWS CLI
- Amazon ECS
- Route 53 DNS
- Terraform AWS Provider
- Kubernetes service discovery

## Sources Consulted
- AWS CLI `servicediscovery create-service` command reference: https://docs.aws.amazon.com/cli/latest/reference/servicediscovery/create-service.html
- AWS CLI `servicediscovery discover-instances` command reference: https://docs.aws.amazon.com/cli/latest/reference/servicediscovery/discover-instances.html
- AWS Cloud Map service health check documentation: https://docs.aws.amazon.com/cloud-map/latest/dg/services-health-checks.html
- AWS Cloud Map `HealthCheckCustomConfig` API reference: https://docs.aws.amazon.com/cloud-map/latest/api/API_HealthCheckCustomConfig.html
- AWS Cloud Map `UpdateInstanceCustomHealthStatus` API reference: https://docs.aws.amazon.com/cloud-map/latest/api/API_UpdateInstanceCustomHealthStatus.html
- AWS Cloud Map registering service instances documentation: https://docs.aws.amazon.com/cloud-map/latest/dg/registering-instances.html
- Amazon ECS service discovery documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-discovery.html
- Amazon ECS service discovery AWS CLI tutorial: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/create-service-discovery.html
- Terraform AWS Provider `aws_service_discovery_service` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/service_discovery_service
- OneUptime Route 53 simple routing post link target: https://oneuptime.com/blog/post/2026-02-12-route-53-simple-routing-policy/view

## Issues Found
- The Cloud Map service examples configured both `A` and `SRV` DNS record types in the same service. AWS documents the valid DNS record type combinations as `A`, `AAAA`, `A` and `AAAA`, `SRV`, or `CNAME`; `A` plus `SRV` is not a valid combination. Updated the AWS CLI and Terraform examples to use `A` records only.
- The DNS discovery section showed `SRV` lookups and SRV targets for a service that also used `A` records. Removed the SRV lookup example so the DNS behavior matches the corrected `A` record service configuration.
- The ECS service registry examples included `containerName` and `containerPort`, which are needed for SRV-style service discovery but are not needed for the corrected `A` record service discovery flow. Removed those fields from the AWS CLI and Terraform ECS examples.
- The custom health check examples set `FailureThreshold` to `1`. AWS documents this member as deprecated and always set to `1`. Removed the deprecated setting and kept the custom health check configuration.
- The health check explanation implied Route 53 health checks were generally available for the private DNS namespace example. Updated it to state that Route 53 health checks can be used with public DNS or HTTP namespaces, but not private DNS namespaces.

## Review Notes
The Terraform AWS Provider currently marks `health_check_custom_config` as deprecated while AWS Cloud Map still documents custom health checks and ECS publishes container health to Cloud Map custom health check operations. The post keeps custom health checks because the surrounding ECS/private DNS workflow depends on that Cloud Map behavior.
