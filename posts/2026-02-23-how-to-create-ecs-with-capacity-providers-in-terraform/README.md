# How to Create ECS with Capacity Providers in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, ECS, Capacity Providers, Auto Scaling, Spot Instances, Fargate, Infrastructure as Code

Description: Learn how to configure ECS capacity providers with Terraform to manage compute capacity using a mix of Fargate, Fargate Spot, and EC2 Auto Scaling groups.

---

ECS capacity providers give you fine-grained control over how compute capacity is managed for your container workloads. Instead of manually scaling EC2 instances or choosing between Fargate and EC2, capacity providers let you define a strategy that automatically manages capacity across multiple compute options. You can mix Fargate, Fargate Spot, and EC2 Auto Scaling groups to optimize for cost, availability, or both. This guide walks through configuring ECS capacity providers with Terraform.

## What Are Capacity Providers

A capacity provider is a bridge between your ECS cluster and the underlying compute infrastructure. There are three types:

1. **FARGATE** - AWS-managed serverless compute. No instances to manage.
2. **FARGATE_SPOT** - Fargate at up to 70% discount, but tasks can be interrupted with a 30-second warning.
3. **Auto Scaling Group** - Your own EC2 instances managed by an ASG, with ECS managing the scaling.

You assign capacity provider strategies to your ECS services to tell ECS how to distribute tasks across these providers.

## Prerequisites

- Terraform 1.0 or later
- AWS credentials configured
- A VPC with subnets
- Familiarity with ECS concepts

## Fargate Capacity Providers

The simplest setup uses built-in Fargate capacity providers.

```hcl
provider "aws" {
  region = "us-east-1"
}

# ECS Cluster with Fargate capacity providers
resource "aws_ecs_cluster" "main" {
  name = "production-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name        = "production-cluster"
    Environment = "production"
  }
}

# Associate capacity providers with the cluster
resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name = aws_ecs_cluster.main.name

  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  # Default strategy: primarily FARGATE with FARGATE_SPOT as overflow
  default_capacity_provider_strategy {
    base              = 2        # First 2 tasks always on FARGATE
    weight            = 1        # Remaining tasks: 1 part FARGATE
    capacity_provider = "FARGATE"
  }

  default_capacity_provider_strategy {
    weight            = 3        # Remaining tasks: 3 parts FARGATE_SPOT
    capacity_provider = "FARGATE_SPOT"
  }
}
```

In this configuration, the first 2 tasks of any service always run on standard Fargate (guaranteed availability). Additional tasks are distributed with a 1:3 ratio, meaning roughly 75% of overflow tasks go to Fargate Spot for cost savings.

## EC2 Auto Scaling Group Capacity Provider

For EC2 launch type, create a capacity provider backed by an Auto Scaling group.

```hcl
# Get the latest ECS-optimized AMI
data "aws_ssm_parameter" "ecs_ami" {
  name = "/aws/service/ecs/optimized-ami/amazon-linux-2023/recommended/image_id"
}

data "aws_vpc" "main" {
  filter {
    name   = "tag:Name"
    values = ["main-vpc"]
  }
}

data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }
  filter {
    name   = "tag:Tier"
    values = ["private"]
  }
}

# IAM role for ECS instances
resource "aws_iam_role" "ecs_instance" {
  name = "ecs-instance-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_instance" {
  role       = aws_iam_role.ecs_instance.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role"
}

resource "aws_iam_instance_profile" "ecs_instance" {
  name = "ecs-instance-profile"
  role = aws_iam_role.ecs_instance.name
}

# Security group for ECS instances
resource "aws_security_group" "ecs_instances" {
  name_prefix = "ecs-instances-"
  vpc_id      = data.aws_vpc.main.id

  ingress {
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    cidr_blocks = [data.aws_vpc.main.cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Launch template for on-demand instances
resource "aws_launch_template" "ecs_ondemand" {
  name_prefix   = "ecs-ondemand-"
  image_id      = data.aws_ssm_parameter.ecs_ami.value
  instance_type = "m6i.large"

  iam_instance_profile {
    arn = aws_iam_instance_profile.ecs_instance.arn
  }

  vpc_security_group_ids = [aws_security_group.ecs_instances.id]

  user_data = base64encode(<<-EOF
    #!/bin/bash
    echo "ECS_CLUSTER=${aws_ecs_cluster.main.name}" >> /etc/ecs/ecs.config
    echo "ECS_ENABLE_SPOT_INSTANCE_DRAINING=true" >> /etc/ecs/ecs.config
  EOF
  )

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size = 50
      volume_type = "gp3"
      encrypted   = true
    }
  }
}

# Auto Scaling Group for on-demand instances
resource "aws_autoscaling_group" "ecs_ondemand" {
  name_prefix         = "ecs-ondemand-"
  vpc_zone_identifier = data.aws_subnets.private.ids
  min_size            = 0
  max_size            = 10
  desired_capacity    = 0  # Capacity provider manages this

  # Important: protect from scale-in so ECS manages instance lifecycle
  protect_from_scale_in = true

  launch_template {
    id      = aws_launch_template.ecs_ondemand.id
    version = "$Latest"
  }

  tag {
    key                 = "AmazonECSManaged"
    value               = "true"
    propagate_at_launch = true
  }

  tag {
    key                 = "Name"
    value               = "ecs-ondemand"
    propagate_at_launch = true
  }

  lifecycle {
    ignore_changes = [desired_capacity]
  }
}

# Capacity provider backed by on-demand ASG
resource "aws_ecs_capacity_provider" "ondemand" {
  name = "ondemand-provider"

  auto_scaling_group_provider {
    auto_scaling_group_arn = aws_autoscaling_group.ecs_ondemand.arn

    # Managed scaling lets ECS automatically adjust the ASG
    managed_scaling {
      maximum_scaling_step_size = 5
      minimum_scaling_step_size = 1
      status                    = "ENABLED"
      target_capacity           = 80  # Keep 80% utilization
    }

    # Let ECS manage instance termination during scale-in
    managed_termination_protection = "ENABLED"
  }

  tags = {
    Name = "ondemand-capacity-provider"
  }
}
```

## Spot Instance Capacity Provider

Add a spot instance capacity provider for cost savings.

```hcl
# Launch template for spot instances with mixed instance types
resource "aws_launch_template" "ecs_spot" {
  name_prefix = "ecs-spot-"
  image_id    = data.aws_ssm_parameter.ecs_ami.value

  iam_instance_profile {
    arn = aws_iam_instance_profile.ecs_instance.arn
  }

  vpc_security_group_ids = [aws_security_group.ecs_instances.id]

  user_data = base64encode(<<-EOF
    #!/bin/bash
    echo "ECS_CLUSTER=${aws_ecs_cluster.main.name}" >> /etc/ecs/ecs.config
    echo "ECS_ENABLE_SPOT_INSTANCE_DRAINING=true" >> /etc/ecs/ecs.config
  EOF
  )

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size = 50
      volume_type = "gp3"
      encrypted   = true
    }
  }
}

# Auto Scaling Group for spot instances
resource "aws_autoscaling_group" "ecs_spot" {
  name_prefix         = "ecs-spot-"
  vpc_zone_identifier = data.aws_subnets.private.ids
  min_size            = 0
  max_size            = 20
  desired_capacity    = 0

  protect_from_scale_in = true

  # Mixed instances policy for better spot availability
  mixed_instances_policy {
    instances_distribution {
      on_demand_base_capacity                  = 0
      on_demand_percentage_above_base_capacity = 0
      spot_allocation_strategy                 = "capacity-optimized"
    }

    launch_template {
      launch_template_specification {
        launch_template_id = aws_launch_template.ecs_spot.id
        version            = "$Latest"
      }

      # Multiple instance types for better spot availability
      override {
        instance_type = "m6i.large"
      }
      override {
        instance_type = "m5.large"
      }
      override {
        instance_type = "m5a.large"
      }
      override {
        instance_type = "m6a.large"
      }
    }
  }

  tag {
    key                 = "AmazonECSManaged"
    value               = "true"
    propagate_at_launch = true
  }

  tag {
    key                 = "Name"
    value               = "ecs-spot"
    propagate_at_launch = true
  }

  lifecycle {
    ignore_changes = [desired_capacity]
  }
}

# Capacity provider backed by spot ASG
resource "aws_ecs_capacity_provider" "spot" {
  name = "spot-provider"

  auto_scaling_group_provider {
    auto_scaling_group_arn = aws_autoscaling_group.ecs_spot.arn

    managed_scaling {
      maximum_scaling_step_size = 10
      minimum_scaling_step_size = 1
      status                    = "ENABLED"
      target_capacity           = 100  # Higher utilization for spot
    }

    managed_termination_protection = "ENABLED"
  }

  tags = {
    Name = "spot-capacity-provider"
  }
}
```

## Associating All Capacity Providers

```hcl
# Associate all capacity providers with the cluster
resource "aws_ecs_cluster_capacity_providers" "mixed" {
  cluster_name = aws_ecs_cluster.main.name

  capacity_providers = [
    "FARGATE",
    "FARGATE_SPOT",
    aws_ecs_capacity_provider.ondemand.name,
    aws_ecs_capacity_provider.spot.name,
  ]

  # Default strategy for services that do not specify their own
  default_capacity_provider_strategy {
    base              = 1
    weight            = 1
    capacity_provider = aws_ecs_capacity_provider.ondemand.name
  }

  default_capacity_provider_strategy {
    weight            = 3
    capacity_provider = aws_ecs_capacity_provider.spot.name
  }
}
```

## ECS Services Using Capacity Provider Strategies

```hcl
# IAM role for task execution
resource "aws_iam_role" "ecs_task_execution" {
  name = "ecs-task-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Task definition
resource "aws_ecs_task_definition" "app" {
  family                   = "app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["EC2", "FARGATE"]
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([
    {
      name      = "app"
      image     = "nginx:1.25-alpine"
      cpu       = 512
      memory    = 1024
      essential = true
      portMappings = [
        {
          containerPort = 80
          protocol      = "tcp"
        }
      ]
    }
  ])
}

# Critical service: primarily on-demand with spot overflow
resource "aws_ecs_service" "critical_app" {
  name            = "critical-app"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 6

  # Service-specific capacity provider strategy
  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.ondemand.name
    base              = 3      # At least 3 on on-demand
    weight            = 2      # 2 parts on-demand
  }

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.spot.name
    weight            = 1      # 1 part spot
  }

  network_configuration {
    subnets         = data.aws_subnets.private.ids
    security_groups = [aws_security_group.ecs_instances.id]
  }

  tags = {
    Name = "critical-app-service"
  }
}

# Cost-optimized service: heavy spot usage
resource "aws_ecs_service" "batch_processor" {
  name            = "batch-processor"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 10

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.spot.name
    base              = 0
    weight            = 4      # 80% spot
  }

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.ondemand.name
    weight            = 1      # 20% on-demand as fallback
  }

  network_configuration {
    subnets         = data.aws_subnets.private.ids
    security_groups = [aws_security_group.ecs_instances.id]
  }

  tags = {
    Name = "batch-processor-service"
  }
}
```

## Outputs

```hcl
output "cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "capacity_providers" {
  value = [
    aws_ecs_capacity_provider.ondemand.name,
    aws_ecs_capacity_provider.spot.name,
    "FARGATE",
    "FARGATE_SPOT",
  ]
}
```

## Best Practices

When configuring capacity providers, always use `base` to guarantee a minimum number of tasks on reliable compute for critical services. Enable managed scaling so ECS automatically adjusts the ASG capacity. Use multiple instance types in spot ASGs to improve availability. Set `protect_from_scale_in = true` on your ASGs and enable managed termination protection in the capacity provider. Monitor capacity provider utilization to ensure your target capacity percentages are appropriate.

## Monitoring with OneUptime

Capacity provider behavior impacts both cost and availability. Use [OneUptime](https://oneuptime.com) to monitor task placement, spot interruptions, and capacity utilization across your providers to ensure your strategy is working as intended.

## Conclusion

ECS capacity providers give you a sophisticated way to manage compute resources for your container workloads. By combining on-demand instances for reliability, spot instances for cost savings, and Fargate for simplicity, you can create a strategy that fits your specific needs. Terraform makes this configuration declarative and reproducible. The key is matching your capacity provider strategy to the criticality and fault tolerance of each service.

For more ECS content, see our guides on [ECS with EC2 launch type](https://oneuptime.com/blog/post/2026-02-23-how-to-create-ecs-with-ec2-launch-type-in-terraform/view) and [ECS with EFS volumes](https://oneuptime.com/blog/post/2026-02-23-how-to-create-ecs-with-efs-volumes-in-terraform/view).
