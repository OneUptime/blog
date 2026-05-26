# Validation Summary: How to Configure ECS Auto Scaling in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS Provider for Terraform
- Amazon ECS and Fargate
- AWS Application Auto Scaling
- Amazon CloudWatch alarms and metrics
- Application Load Balancer request-count target tracking

## Sources Consulted
- Terraform AWS provider documentation for `aws_appautoscaling_target`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appautoscaling_target
- Terraform AWS provider documentation for `aws_appautoscaling_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appautoscaling_policy
- Terraform AWS provider documentation for `aws_appautoscaling_scheduled_action`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appautoscaling_scheduled_action
- Terraform AWS provider documentation for `aws_ecs_service`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- Amazon ECS documentation for service auto scaling: https://docs.aws.amazon.com/AmazonECS/latest/userguide/service-auto-scaling.html
- Amazon ECS documentation for target tracking service auto scaling: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-autoscaling-targettracking.html
- Application Auto Scaling documentation for target tracking scaling policies: https://docs.aws.amazon.com/autoscaling/application/userguide/target-tracking-scaling-policy-overview.html
- Application Auto Scaling API reference for predefined metric specifications: https://docs.aws.amazon.com/autoscaling/application/APIReference/API_PredefinedMetricSpecification.html
- Application Auto Scaling API reference for target tracking policy configuration: https://docs.aws.amazon.com/autoscaling/application/APIReference/API_TargetTrackingScalingPolicyConfiguration.html

## Issues Found
- The post said that when CPU and memory target tracking policies are used together, AWS scales to satisfy whichever policy requires more capacity. This was accurate for scale-out but incomplete for scale-in. Updated the sentence to match AWS documentation: Application Auto Scaling scales out if any target tracking policy is ready to scale out, and scales in only when all scale-in-enabled target tracking policies are ready to scale in.

## Review Notes
- The Terraform resource names, ECS scalable target `resource_id` format, `ecs:service:DesiredCount` scalable dimension, predefined ECS CPU/memory metric names, ALB `resource_label` format, step scaling adjustment blocks, scheduled action structure, and `ignore_changes = [desired_count]` guidance match the current official Terraform AWS provider and AWS documentation.
- Terraform CLI is not installed in this environment, so I could not run `terraform fmt` or `terraform validate`. The snippets were reviewed manually against the provider schema documentation.
