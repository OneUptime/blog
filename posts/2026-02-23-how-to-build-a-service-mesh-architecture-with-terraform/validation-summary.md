# Validation Summary: How to Build a Service Mesh Architecture with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS App Mesh
- Amazon ECS and Fargate
- AWS Cloud Map
- AWS X-Ray
- Envoy
- Kubernetes / Istio

## Sources Consulted
- AWS App Mesh documentation: Envoy configuration variables: https://docs.aws.amazon.com/app-mesh/latest/userguide/envoy-config.html
- AWS App Mesh documentation: Transport Layer Security: https://docs.aws.amazon.com/app-mesh/latest/userguide/tls.html
- AWS App Mesh documentation: Mutual TLS authentication: https://docs.aws.amazon.com/app-mesh/latest/userguide/mutual-tls.html
- AWS App Mesh documentation: Observability troubleshooting: https://docs.aws.amazon.com/app-mesh/latest/userguide/troubleshooting-observability.html
- AWS X-Ray documentation: Amazon EC2 and AWS App Mesh: https://docs.aws.amazon.com/xray/latest/devguide/xray-services-appmesh.html
- AWS X-Ray documentation: Running the X-Ray daemon on Amazon ECS: https://docs.aws.amazon.com/xray/latest/devguide/xray-daemon-ecs.html
- AWS X-Ray documentation: AWS X-Ray daemon: https://docs.aws.amazon.com/xray/latest/devguide/xray-daemon.html
- HashiCorp AWS provider documentation: aws_appmesh_mesh: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appmesh_mesh
- HashiCorp AWS provider documentation: aws_appmesh_virtual_node: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appmesh_virtual_node
- HashiCorp AWS provider documentation: aws_appmesh_virtual_service: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appmesh_virtual_service
- HashiCorp AWS provider documentation: aws_appmesh_virtual_router: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appmesh_virtual_router
- HashiCorp AWS provider documentation: aws_appmesh_route: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appmesh_route
- HashiCorp AWS provider documentation: aws_ecs_task_definition: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition
- HashiCorp AWS provider documentation: aws_ecs_service: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- HashiCorp AWS provider documentation: aws_service_discovery_service: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/service_discovery_service

## Issues Found
- The post did not mention that AWS has announced App Mesh end of support on September 30, 2026. Added a short caveat near the introduction recommending this pattern for existing App Mesh environments and noting migration options.
- The post described mutual TLS as if the examples fully configured it, but the shown App Mesh listener TLS configuration only configures TLS termination. Updated the wording to distinguish TLS from mutual TLS when client certificates are configured.
- The ECS task enabled `ENABLE_ENVOY_XRAY_TRACING` but did not include the required X-Ray daemon container in the same task. Added an `xray-daemon` sidecar using the official public ECR image and a CloudWatch log group reference.
- The observability section used `aws_xray_sampling_rule` for App Mesh Envoy sampling. App Mesh Envoy does not support dynamic X-Ray sampling rules, so replaced that example with Envoy-side sampling via `XRAY_SAMPLING_RATE` and added a log group for the daemon.
- The X-Ray explanation omitted the need for task role permissions to upload trace data. Added a sentence noting that the ECS task role needs permission to send trace data to X-Ray.

## Review Notes
The Terraform snippets reference surrounding resources that are not included in the post, such as VPC, IAM roles, certificates, log groups, the canary virtual node, and the user virtual service. That is acceptable for a focused blog example, but a complete repository example would need those resources. Terraform is not installed in the workspace, so local `terraform fmt` and `terraform validate` could not be run; schema checks were performed against the official HashiCorp AWS provider documentation instead.
