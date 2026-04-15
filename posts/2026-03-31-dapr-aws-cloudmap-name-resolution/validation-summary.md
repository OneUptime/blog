# Validation Summary: How to Configure AWS CloudMap Name Resolution in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (name resolution components)
- AWS Cloud Map (Service Discovery)
- Amazon EKS (Elastic Kubernetes Service)
- Amazon ECS (Elastic Container Service)
- CoreDNS
- AWS IAM
- AWS CLI

## Sources Consulted
- Dapr Supported Name Resolution Providers: https://docs.dapr.io/reference/components-reference/supported-name-resolution/
- Dapr AWS CloudMap Name Resolution Component: https://docs.dapr.io/reference/components-reference/supported-name-resolution/nr-awscloudmap/
- Dapr Kubernetes DNS Name Resolution: https://docs.dapr.io/reference/components-reference/supported-name-resolution/nr-kubernetes/
- Dapr Configuration Overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr Configuration Schema Spec: https://docs.dapr.io/reference/resource-specs/configuration-schema/
- AWS CLI servicediscovery create-private-dns-namespace: https://docs.aws.amazon.com/cli/latest/reference/servicediscovery/create-private-dns-namespace.html
- AWS CLI servicediscovery create-service: https://docs.aws.amazon.com/cli/latest/reference/servicediscovery/create-service.html
- AWS CLI servicediscovery register-instance: https://docs.aws.amazon.com/cli/latest/reference/servicediscovery/register-instance.html
- AWS CLI servicediscovery discover-instances: https://docs.aws.amazon.com/cli/latest/reference/servicediscovery/discover-instances.html
- AWS Cloud Map IAM Actions Reference: https://docs.aws.amazon.com/service-authorization/latest/reference/list_awscloudmap.html
- Amazon VPC DNS Concepts (Route 53 Resolver): https://docs.aws.amazon.com/vpc/latest/userguide/AmazonDNS-concepts.html
- ECS ServiceRegistry API Reference: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ServiceRegistry.html
- ECS Service Definition Parameters: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service_definition_parameters.html
- Kubernetes NodeLocal DNSCache: https://kubernetes.io/docs/tasks/administer-cluster/nodelocaldns/

## Issues Found

1. **Incorrect reference to `nameresolution.aws.snssqs`**: The post claimed a `nameresolution.aws.snssqs` component exists. This is entirely wrong — SNS/SQS is a pub/sub system and has no relation to name resolution. Removed this reference.

2. **Claimed Cloud Map requires Consul proxy or custom component**: The post stated that AWS Cloud Map integration requires configuring `nameresolution.consul` as a proxy or building a custom component. This is incorrect — Dapr has a built-in `aws.cloudmap` name resolution component. Rewrote the introduction to mention the built-in component.

3. **Wrong Dapr configuration YAML structure**: The post used `kind: Component` with `type: nameresolution.kubernetes` and a `metadata` list format. Dapr name resolution is configured via `kind: Configuration` with `spec.nameResolution.component` and `spec.nameResolution.configuration` fields. Fixed to use the correct Configuration YAML structure.

4. **Incorrect CoreDNS forwarding IP**: The post forwarded `dapr.local` queries to `169.254.20.10:53`, which is the Kubernetes NodeLocal DNS Cache address. This would create a circular dependency, not resolve Cloud Map names. Changed to `169.254.169.253`, which is the link-local address for the Amazon VPC DNS resolver (Route 53 Resolver) that can resolve Cloud Map private DNS namespaces.

5. **`serviceRegistries` incorrectly placed in task definition**: The post stated `serviceRegistries` belongs in the ECS task definition. It actually belongs in the ECS **service** definition (`CreateService` API). Fixed the text.

## Review Notes
- The IAM policy shown is functional but minimal. For production use, additional permissions like `servicediscovery:GetNamespace`, `servicediscovery:ListServices`, and `servicediscovery:GetInstancesHealthStatus` may be needed. However, the minimal set shown is sufficient for the basic use case described.
- The `FailureThreshold` parameter in `--health-check-custom-config` is deprecated and always defaults to 1. Specifying it is redundant but harmless.
- The post focuses on the DNS-based approach (CoreDNS + kubernetes name resolution component) rather than the native `aws.cloudmap` Dapr component. Both approaches are valid, but readers should be aware that the built-in `aws.cloudmap` component is the more direct integration path.
- All AWS CLI commands use correct syntax and valid parameter formats.
