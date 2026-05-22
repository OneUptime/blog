# Validation Summary: How to Use Terraform with Waypoint for App Deployment

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp Waypoint Community Edition
- HCP Waypoint
- AWS ECS and Fargate
- AWS EFS
- AWS ECR
- AWS ALB
- Amazon EKS
- Kubernetes
- AWS CodePipeline and CodeBuild

## Sources Consulted
- HashiCorp Waypoint documentation: https://developer.hashicorp.com/waypoint/docs
- HCP Waypoint documentation: https://developer.hashicorp.com/hcp/docs/waypoint
- HashiCorp Waypoint GitHub repository README: https://github.com/hashicorp/waypoint
- HashiCorp Waypoint AWS ECS plugin source/docs: https://github.com/hashicorp/waypoint/tree/main/builtin/aws/ecs
- HashiCorp Waypoint AWS ECR plugin source/docs: https://github.com/hashicorp/waypoint/tree/main/builtin/aws/ecr
- HashiCorp Waypoint AWS ALB plugin source/docs: https://github.com/hashicorp/waypoint/tree/main/builtin/aws/alb
- HashiCorp Waypoint Kubernetes plugin source/docs: https://github.com/hashicorp/waypoint/tree/main/builtin/k8s
- Terraform AWS provider `aws_ecs_task_definition` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition
- Terraform AWS provider `aws_ecs_service` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- Terraform AWS provider `aws_eks_cluster` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_cluster
- Amazon EKS Kubernetes version lifecycle documentation: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html

## Issues Found
- The post described generic HashiCorp Waypoint behavior without noting that the Community Edition server and `waypoint.hcl` workflow are archived and no longer actively maintained. I clarified that the examples apply to Waypoint Community Edition and noted that current HCP Waypoint uses templates, add-ons, actions, and HCP Terraform instead.
- The Waypoint server task used `hashicorp/waypoint:latest`. I changed it to `hashicorp/waypoint:0.11.4`, the final Community Edition release, to avoid an unpinned moving tag in an archived product.
- The ECS Waypoint configuration used `release { use "aws-alb" { ... } }` after `deploy { use "aws-ecs" { ... } }`. The legacy `aws-alb` release manager expects an ALB target group input and maps EC2/Lambda deployments, while the `aws-ecs` platform configures ALB attachment through its own `alb` block. I moved `listener_arn` into the ECS `alb` block and removed the incompatible release stanza.
- The sample ALB listener ARN used a 9-digit account ID. I changed it to a 12-digit placeholder account ID.
- The ECS logging block included `region`, which is not a documented Waypoint `aws-ecs` logging option. I removed that field.
- The EKS example pinned Kubernetes `1.28`, which is no longer available in current EKS standard or extended support as of May 22, 2026. I updated the example to `1.35`, which AWS lists in standard support.
- The Kubernetes Waypoint example used a nested `resources { requests = ... limits = ... }` block, but the legacy Kubernetes plugin accepts resource maps or `cpu` and `memory` blocks. I changed it to `cpu` and `memory` blocks with `request` and `limit` values.
- The Terraform server excerpt referenced resources that were not shown. I added a short note that IAM roles, load balancers, target groups, EFS mount targets, and security group rules are assumed to be defined elsewhere.

## Review Notes
The post is technically valid after correction, but it covers Waypoint Community Edition rather than the current HCP Waypoint product. Future updates should consider rewriting the guide around HCP Waypoint and HCP Terraform instead of the archived server-based workflow.
