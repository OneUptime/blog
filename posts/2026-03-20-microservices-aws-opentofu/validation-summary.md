# Validation Summary: How to Build a Microservices Architecture with OpenTofu on AWS

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Amazon EKS
- Amazon API Gateway HTTP APIs
- API Gateway VPC Link private integrations
- AWS Cloud Map
- IAM Roles for Service Accounts (IRSA)
- Amazon SQS
- Terraform AWS provider and the `terraform-aws-modules/eks/aws` module

## Sources Consulted
- Amazon EKS Kubernetes version lifecycle: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- Assign IAM roles to Kubernetes service accounts: https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html
- Create private integrations for HTTP APIs in API Gateway: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-private.html
- Stages for HTTP APIs in API Gateway: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-stages.html
- Create routes for HTTP APIs in API Gateway: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-routes.html
- Transform API requests and responses for HTTP APIs in API Gateway: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-parameter-mapping.html
- AWS Cloud Map services: https://docs.aws.amazon.com/cloud-map/latest/dg/working-with-services.html
- Registering a resource as an AWS Cloud Map service instance: https://docs.aws.amazon.com/cloud-map/latest/dg/registering-instances.html
- AWS Cloud Map service health check configuration: https://docs.aws.amazon.com/cloud-map/latest/dg/services-health-checks.html
- Using dead-letter queues in Amazon SQS: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html
- Amazon SQS visibility timeout: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html
- `terraform-aws-modules/eks/aws` module registry page: https://registry.terraform.io/modules/terraform-aws-modules/eks/aws/20.33.0

## Issues Found
- The EKS snippet used `cluster_version = "1.29"`. As of April 29, 2026, Amazon EKS lists `1.33`, `1.34`, and `1.35` in standard support and `1.30` through `1.32` in extended support, so `1.29` is no longer supported. I updated the example to `1.35`.
- The IRSA example depended on the EKS OIDC provider but did not state that IRSA was enabled in the cluster module. I added `enable_irsa = true` so the snippet is self-consistent.
- The HTTP API example omitted a stage. API Gateway HTTP APIs must be deployed to a stage to be callable, so I added a `$default` stage with `auto_deploy = true`.
- The HTTP API integration omitted `payload_format_version`. For HTTP APIs, private `HTTP_PROXY` integrations use payload format version `1.0`, so I added `payload_format_version = "1.0"`.
- The routing example only defined `ANY /orders/{proxy+}`. Based on the API Gateway documentation stating that `{proxy+}` matches child resources of a route, I added a separate `ANY /orders` route so the base path is covered too.
- The VPC Link comment implied API Gateway connects directly to Kubernetes Services. For HTTP API private integrations, the backend target is an ALB/NLB listener ARN or a Cloud Map service, so I clarified that the VPC Link reaches a private load balancer fronting EKS services.
- The Cloud Map step said it registered the service, but the Terraform resource only defines the Cloud Map service template. Actual endpoints still need instance registration, so I corrected the wording.
- The IRSA prose implied the IAM role alone delivered least-privilege access. I added the standard `aud` trust-policy condition and clarified that least-privilege still depends on attaching narrow IAM policies to each role.
- The metadata and overview claimed service mesh and distributed tracing coverage, but the post did not configure either. I removed those claims so the post matches the implementation it actually shows.

## Review Notes
- The `module.eks.oidc_provider` output is valid in `terraform-aws-modules/eks/aws` v20 because that output is the issuer URL without the `https://` prefix, which is the form AWS uses in IRSA trust-policy condition keys.
- The post is now technically consistent as an architectural example, but it still intentionally stops short of showing workload registration in Cloud Map and the per-service IAM policy attachments. The updated wording makes those omissions explicit.
