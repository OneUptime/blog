# Validation Summary: How to Create ECS with App Mesh Integration in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (1.0+)
- AWS App Mesh (service mesh)
- AWS ECS (Fargate launch type)
- Envoy proxy (sidecar)
- AWS Cloud Map (service discovery)
- AWS IAM
- AWS CloudWatch Logs
- AWS VPC / Security Groups
- HashiCorp Configuration Language (HCL)

## Sources Consulted
- AWS Terraform provider documentation:
  - `aws_appmesh_mesh` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appmesh_mesh
  - `aws_appmesh_virtual_node` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appmesh_virtual_node
  - `aws_appmesh_virtual_router` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appmesh_virtual_router
  - `aws_appmesh_route` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appmesh_route
  - `aws_appmesh_virtual_service` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appmesh_virtual_service
  - `aws_ecs_task_definition` (proxy_configuration) — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition
  - `aws_service_discovery_private_dns_namespace` / `aws_service_discovery_service`
- AWS App Mesh User Guide — https://docs.aws.amazon.com/app-mesh/latest/userguide/
- AWS App Mesh — Envoy image (regional ECR account IDs) — https://docs.aws.amazon.com/app-mesh/latest/userguide/envoy.html
- AWS ECS proxy configuration documentation — https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
- Envoy admin interface documentation — https://www.envoyproxy.io/docs/envoy/latest/operations/admin

## Issues Found
No technical issues found. Key spot-checks that passed:
- The Envoy image account ID `840364872350` is the correct App Mesh Envoy image account for `us-east-1`.
- `egress_filter.type = "DROP_ALL"` is one of the two valid values (`ALLOW_ALL` / `DROP_ALL`).
- `proxy_configuration.type = "APPMESH"` and the required properties keys (`AppPorts`, `EgressIgnoredIPs`, `IgnoredUID`, `ProxyEgressPort`, `ProxyIngressPort`) are correct. Unquoted port numbers in the `properties` map match the official AWS provider example and Terraform coerces them to strings.
- `EgressIgnoredIPs = "169.254.170.2,169.254.169.254"` correctly covers the ECS Task Metadata endpoint and the EC2 IMDS.
- `IgnoredUID = "1337"` matches the Envoy container `user = "1337"`.
- `ProxyEgressPort = 15001` and `ProxyIngressPort = 15000` are the standard App Mesh Envoy ports.
- `http_retry_events` values (`server-error`, `gateway-error`) are valid.
- `aws_appmesh_route` structure with `http_route`, `match`, `action.weighted_target`, `retry_policy`, and `timeout` blocks is correct.
- Envoy health check (`curl http://localhost:9901/server_info | grep LIVE`) is a standard Envoy admin-interface liveness probe.
- The AWS managed policy `AWSAppMeshEnvoyAccess` exists and is the correct policy for the task role.

## Review Notes
- **AWS App Mesh end of support**: AWS has publicly announced that App Mesh will reach end of support on September 30, 2026. The post does not mention this; it remains accurate for current usage but readers planning long-term deployments should consider alternatives (e.g., Istio on EKS, Linkerd, or a hosted service mesh) before adopting App Mesh for new workloads.
- **Envoy image version**: The post pins `v1.27.0.0-prod`. Newer Envoy images (e.g., v1.29.x.x-prod) are available; the post correctly recommends keeping the image updated for security patches.
- **`health_check_custom_config.failure_threshold`**: This argument on `aws_service_discovery_service` is deprecated in recent AWS provider versions but is still functional. Not a hard error.
- **Backend virtual services referenced but not defined**: The example references `database.production.local` and `cache.production.local` as backends without defining matching virtual services. App Mesh accepts these as opaque names, so the configuration is valid HCL, but readers should know they would need to define those virtual services for those backends to actually receive traffic via the mesh.
