# How to Set Up ECS Capacity Providers with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, ECS, Capacity Provider, Auto Scaling, EC2, Infrastructure as Code

Description: Learn how to configure ECS capacity providers with OpenTofu using managed scaling for EC2 Auto Scaling groups, enabling automatic EC2 instance provisioning based on task placement needs.

## Introduction

ECS Capacity Providers manage the relationship between an ECS cluster and its compute infrastructure. For EC2 launch type, capacity providers with managed scaling automatically scale EC2 Auto Scaling groups when tasks can't be placed due to insufficient capacity. This eliminates manual EC2 scaling configuration and ensures compute matches workload demand.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with ECS, EC2, and Auto Scaling permissions

## Step 1: Create EC2 Auto Scaling Group

```hcl
# Launch template for ECS EC2 instances

resource "aws_launch_template" "ecs" {
  name_prefix   = "${var.project_name}-ecs-"
  image_id      = data.aws_ami.ecs_optimized.id
  instance_type = "c6g.xlarge"  # Graviton for better price/performance

  iam_instance_profile {
    arn = aws_iam_instance_profile.ecs.arn
  }

  user_data = base64encode(<<-EOT
    #!/bin/bash
    echo ECS_CLUSTER=${var.project_name}-cluster >> /etc/ecs/ecs.config
    echo ECS_ENABLE_CONTAINER_METADATA=true >> /etc/ecs/ecs.config
    echo ECS_ENABLE_SPOT_INSTANCE_DRAINING=true >> /etc/ecs/ecs.config
  EOT
  )

  vpc_security_group_ids = [var.ecs_instances_sg_id]

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"  # IMDSv2
    http_put_response_hop_limit = 2           # Allows IMDSv2 access from containerized workloads
  }

  lifecycle {
    create_before_destroy = true
  }
}

data "aws_ami" "ecs_optimized" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-ecs-hvm-*-arm64-ebs"]  # Graviton ECS optimized
  }
}

resource "aws_autoscaling_group" "ecs" {
  name                  = "${var.project_name}-ecs-asg"
  max_size              = 20
  min_size              = 0  # ECS managed scaling handles this
  desired_capacity      = 0  # Start at 0; capacity provider manages this

  vpc_zone_identifier = var.private_subnet_ids

  launch_template {
    id      = aws_launch_template.ecs.id
    version = "$Latest"
  }

  protect_from_scale_in = true  # Required for managed termination protection

  tag {
    key                 = "AmazonECSManaged"
    value               = "true"
    propagate_at_launch = true
  }

  tag {
    key                 = "Name"
    value               = "${var.project_name}-ecs-instance"
    propagate_at_launch = true
  }
}
```

## Step 2: Create ECS Capacity Provider

```hcl
resource "aws_ecs_capacity_provider" "ec2" {
  name = "${var.project_name}-ec2-capacity-provider"

  auto_scaling_group_provider {
    auto_scaling_group_arn = aws_autoscaling_group.ecs.arn

    managed_termination_protection = "ENABLED"  # Prevent ASG from terminating busy instances

    managed_scaling {
      status                    = "ENABLED"
      target_capacity           = 80    # Target 80% utilization
      minimum_scaling_step_size = 1
      maximum_scaling_step_size = 10
      instance_warmup_period    = 300   # 5 minutes for instance warm-up
    }
  }

  tags = {
    Name = "${var.project_name}-ec2-capacity-provider"
  }
}
```

## Step 3: Associate Capacity Provider with Cluster

```hcl
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name = aws_ecs_cluster.main.name

  capacity_providers = [
    aws_ecs_capacity_provider.ec2.name,
    "FARGATE",
    "FARGATE_SPOT"
  ]

  default_capacity_provider_strategy {
    base              = 1
    weight            = 1
    capacity_provider = aws_ecs_capacity_provider.ec2.name
  }
}
```

## Step 4: Service Using EC2 Capacity Provider

```hcl
resource "aws_ecs_service" "app" {
  name            = "${var.project_name}-app"
  cluster         = aws_ecs_cluster.main.id
  task_definition = var.task_definition_arn
  desired_count   = 4
  depends_on      = [aws_ecs_cluster_capacity_providers.main]

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.ec2.name
    base              = 2
    weight            = 3
  }

  network_configuration {
    subnets         = var.private_subnet_ids
    security_groups = [var.ecs_tasks_sg_id]
  }

  lifecycle {
    ignore_changes = [desired_count]
  }
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply

# View capacity provider status
aws ecs describe-capacity-providers \
  --capacity-providers my-project-ec2-capacity-provider
```

## Conclusion

EC2 capacity providers with managed scaling provide the best cost efficiency for workloads that benefit from reserved and savings plan pricing on EC2. Set `target_capacity = 80` to maintain a buffer for fast task placement, and use `managed_termination_protection = ENABLED` to prevent ASG from terminating instances with running ECS tasks. A cluster can include both EC2 and Fargate capacity providers, but each service strategy must use either Auto Scaling group capacity providers or Fargate capacity providers, not both.
