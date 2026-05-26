# Validation Summary: How to Create AppMesh Service Mesh in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS App Mesh
- AWS Cloud Map
- Amazon ECS, Amazon EKS, and Amazon EC2 service mesh deployment contexts
- Envoy proxy access logging and traffic routing concepts

## Sources Consulted
- AWS App Mesh User Guide: What Is AWS App Mesh? https://docs.aws.amazon.com/app-mesh/latest/userguide/what-is-app-mesh.html
- AWS App Mesh User Guide: Virtual services https://docs.aws.amazon.com/app-mesh/latest/userguide/virtual_services.html
- AWS App Mesh User Guide: Virtual gateways https://docs.aws.amazon.com/app-mesh/latest/userguide/virtual_gateways.html
- Terraform AWS Provider: aws_appmesh_mesh https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appmesh_mesh
- Terraform AWS Provider: aws_appmesh_virtual_node https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appmesh_virtual_node
- Terraform AWS Provider: aws_appmesh_virtual_router https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appmesh_virtual_router
- Terraform AWS Provider: aws_appmesh_route https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appmesh_route
- Terraform AWS Provider: aws_appmesh_virtual_service https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appmesh_virtual_service
- Terraform AWS Provider: aws_appmesh_virtual_gateway https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appmesh_virtual_gateway
- Terraform AWS Provider: aws_appmesh_gateway_route https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appmesh_gateway_route
- Terraform AWS Provider: aws_service_discovery_service https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/service_discovery_service

## Issues Found
- AWS App Mesh now has an official end-of-support date. Added a note that AWS will discontinue support for App Mesh on September 30, 2026, so readers do not treat the service as a good default for new long-term workloads.
- The gateway route targeted a `frontend.mesh.local` virtual service that was not defined in the Terraform examples. Added an `aws_appmesh_virtual_service.frontend` resource backed by the frontend virtual node and updated the gateway route to reference it.
- The Cloud Map service discovery example created only the namespace, while the virtual nodes referenced Cloud Map services for `frontend`, `api`, `api-v2`, and `auth`. Added `aws_service_discovery_service` resources for those service names.
- The virtual node Cloud Map blocks used literal service names, which would not create Terraform dependencies on the Cloud Map services. Updated them to reference the corresponding `aws_service_discovery_service` resources.
- The route priority comment said higher priority routes are evaluated first. Updated it to state that lower priority numbers are evaluated first and that `0` is the highest priority, matching the App Mesh route schema.

## Review Notes
The examples still assume surrounding infrastructure exists, including `aws_vpc.main`, ECS/EKS/EC2 workloads with Envoy configured for App Mesh, and any separately managed database proxy virtual node named `db-proxy-vn`. Terraform was not installed in the review environment, so validation was performed against the official AWS provider resource schemas and AWS documentation rather than by running `terraform validate`.
