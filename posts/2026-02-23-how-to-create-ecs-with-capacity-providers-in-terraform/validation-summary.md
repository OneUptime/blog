# Validation Summary: How to Create ECS with Capacity Providers in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (1.0+)
- AWS ECS (Cluster, Service, Task Definition, Capacity Providers)
- AWS Fargate / Fargate Spot
- AWS EC2 Auto Scaling Groups
- AWS EC2 Launch Templates (with mixed instances policy / spot allocation)
- AWS IAM (instance profile + task execution role)
- AWS VPC / Security Groups
- AWS SSM Parameter Store (for ECS-optimized AMI lookup)
- Amazon Linux 2023 ECS-optimized AMI

## Sources Consulted
- AWS ECS Capacity Providers docs: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/cluster-capacity-providers.html
- AWS ECS Fargate Capacity Providers: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-capacity-providers.html
- AWS Fargate Spot user guide (interruption handling): https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-capacity-providers.html#fargate-capacity-providers-termination
- AWS Auto Scaling group capacity providers: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/asg-capacity-providers.html
- Terraform AWS provider docs:
  - `aws_ecs_capacity_provider`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_capacity_provider
  - `aws_ecs_cluster_capacity_providers`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_cluster_capacity_providers
  - `aws_autoscaling_group` (mixed_instances_policy, protect_from_scale_in): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
  - `aws_launch_template`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
  - `aws_ecs_task_definition` / `aws_ecs_service`
- AWS retrieving Amazon Linux 2023 ECS-optimized AMI via SSM: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/retrieve-ecs-optimized_AMI.html
- ECS container agent config (`ECS_ENABLE_SPOT_INSTANCE_DRAINING`): https://github.com/aws/amazon-ecs-agent/blob/master/README.md

## Issues Found
- **Fargate Spot interruption warning duration was incorrect.** The post stated tasks receive a "30-second warning" before interruption. Per AWS documentation, Fargate Spot tasks receive a **two-minute warning** (a task state change event plus SIGTERM, with SIGKILL ~120 seconds later). Updated the bullet under "What Are Capacity Providers" to say "2-minute warning."

## Review Notes
- The SSM parameter path `/aws/service/ecs/optimized-ami/amazon-linux-2023/recommended/image_id` is correct and returns the AMI ID as a plain string (so `data.aws_ssm_parameter.ecs_ami.value` resolves to the AMI ID directly — no JSON decoding needed).
- `managed_termination_protection = "ENABLED"` correctly pairs with `protect_from_scale_in = true` on the ASG; the AWS API rejects the capacity provider otherwise.
- The `AmazonECSManaged` ASG tag is required for ECS managed scaling to function — correctly included on both ASGs.
- Task definition uses `network_mode = "awsvpc"` with `requires_compatibilities = ["EC2", "FARGATE"]`; CPU 512 / memory 1024 are valid Fargate task sizes, so the same definition can run on either provider.
- The Fargate Spot up-to-70% discount figure matches AWS's marketing language at time of review; actual savings vary by region/instance.
- `spot_allocation_strategy = "capacity-optimized"` is a sensible default; `price-capacity-optimized` is now also available and is generally AWS's recommended strategy for new workloads — worth noting as a future improvement but not incorrect as-is.
- `$Latest` for launch template version pins to the always-latest version; in production, some teams prefer pinning to a specific version for change control. Not an error.
