# How to Create ECS with EC2 Launch Type in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, ECS, EC2, Container, Auto Scaling, Infrastructure as Code

Description: Learn how to create an ECS cluster with EC2 launch type using Terraform including auto scaling groups, task definitions, services, and load balancer integration.

---

Amazon ECS with the EC2 launch type gives you full control over the underlying compute instances running your containers. Unlike Fargate, which abstracts away the infrastructure, EC2 launch type lets you choose instance types, manage capacity, and access the host operating system. This is ideal for workloads that need GPU instances, specific instance families, or custom AMIs. In this guide, you will learn how to set up a complete ECS cluster with EC2 launch type using Terraform.

## Why EC2 Launch Type

The EC2 launch type is the right choice when you need control over the underlying infrastructure. This includes scenarios like running GPU-accelerated workloads, using specific instance types for memory or compute-intensive tasks, leveraging spot instances for cost savings, or needing to run daemon tasks on every container instance. You manage the EC2 instances, but ECS handles container scheduling and orchestration.

## Prerequisites

- Terraform 1.0 or later
- AWS credentials configured
- A VPC with public and private subnets
- Basic understanding of ECS concepts

## Network Infrastructure

Start with the VPC and networking components.

```hcl
provider "aws" {
  region = "us-east-1"
}

# Reference existing VPC and subnets
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

data "aws_subnets" "public" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }
  filter {
    name   = "tag:Tier"
    values = ["public"]
  }
}
```

## ECS Cluster

Create the ECS cluster with container insights enabled.

```hcl
# ECS Cluster
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
```

## IAM Roles for EC2 Instances

EC2 instances in an ECS cluster need specific IAM roles to register with the cluster and pull container images.

```hcl
# IAM role for ECS container instances
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

# Attach the ECS container instance policy
resource "aws_iam_role_policy_attachment" "ecs_instance" {
  role       = aws_iam_role.ecs_instance.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role"
}

# Attach SSM policy for instance management
resource "aws_iam_role_policy_attachment" "ecs_instance_ssm" {
  role       = aws_iam_role.ecs_instance.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# Instance profile for EC2 instances
resource "aws_iam_instance_profile" "ecs_instance" {
  name = "ecs-instance-profile"
  role = aws_iam_role.ecs_instance.name
}

# IAM role for ECS task execution
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
```

## Launch Template for ECS Instances

Define the EC2 launch template with ECS-optimized AMI and user data.

```hcl
# Get the latest ECS-optimized AMI
data "aws_ssm_parameter" "ecs_ami" {
  name = "/aws/service/ecs/optimized-ami/amazon-linux-2023/recommended/image_id"
}

# Security group for ECS instances
resource "aws_security_group" "ecs_instances" {
  name_prefix = "ecs-instances-"
  vpc_id      = data.aws_vpc.main.id

  # Allow traffic from the ALB
  ingress {
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
    description     = "Traffic from ALB"
  }

  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "ecs-instances-sg"
  }
}

# Launch template for ECS instances
resource "aws_launch_template" "ecs" {
  name_prefix   = "ecs-instance-"
  image_id      = data.aws_ssm_parameter.ecs_ami.value
  instance_type = "m6i.large"

  iam_instance_profile {
    arn = aws_iam_instance_profile.ecs_instance.arn
  }

  vpc_security_group_ids = [aws_security_group.ecs_instances.id]

  # User data to join the ECS cluster
  user_data = base64encode(<<-EOF
    #!/bin/bash
    echo "ECS_CLUSTER=${aws_ecs_cluster.main.name}" >> /etc/ecs/ecs.config
    echo "ECS_ENABLE_CONTAINER_METADATA=true" >> /etc/ecs/ecs.config
    echo "ECS_ENABLE_SPOT_INSTANCE_DRAINING=true" >> /etc/ecs/ecs.config
  EOF
  )

  # Enable detailed monitoring
  monitoring {
    enabled = true
  }

  # EBS volume configuration
  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = 50
      volume_type           = "gp3"
      encrypted             = true
      delete_on_termination = true
    }
  }

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name        = "ecs-instance"
      Environment = "production"
    }
  }

  tags = {
    Name = "ecs-launch-template"
  }
}
```

## Auto Scaling Group

Create an auto scaling group to manage the EC2 instances.

```hcl
# Auto Scaling Group for ECS instances
resource "aws_autoscaling_group" "ecs" {
  name_prefix = "ecs-asg-"

  launch_template {
    id      = aws_launch_template.ecs.id
    version = "$Latest"
  }

  vpc_zone_identifier = data.aws_subnets.private.ids

  min_size         = 2
  max_size         = 10
  desired_capacity = 2

  # Health check configuration
  health_check_type         = "EC2"
  health_check_grace_period = 300

  # Instance refresh for rolling updates
  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 50
    }
  }

  # Protect instances from scale-in if they have running tasks
  protect_from_scale_in = true

  tag {
    key                 = "AmazonECSManaged"
    value               = "true"
    propagate_at_launch = true
  }

  tag {
    key                 = "Name"
    value               = "ecs-instance"
    propagate_at_launch = true
  }
}

# Auto scaling policy based on ECS cluster CPU reservation
resource "aws_autoscaling_policy" "ecs_scale_out" {
  name                   = "ecs-scale-out"
  autoscaling_group_name = aws_autoscaling_group.ecs.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    customized_metric_specification {
      metric_dimension {
        name  = "ClusterName"
        value = aws_ecs_cluster.main.name
      }
      metric_name = "CPUReservation"
      namespace   = "AWS/ECS"
      statistic   = "Average"
    }
    target_value = 70.0
  }
}
```

## Application Load Balancer

Set up the ALB to distribute traffic to your ECS services.

```hcl
# Security group for the ALB
resource "aws_security_group" "alb" {
  name_prefix = "ecs-alb-"
  vpc_id      = data.aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP access"
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS access"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "ecs-alb-sg"
  }
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "ecs-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = data.aws_subnets.public.ids

  tags = {
    Name = "ecs-alb"
  }
}

# Target group for the ECS service
resource "aws_lb_target_group" "app" {
  name        = "ecs-app-tg"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = data.aws_vpc.main.id
  target_type = "instance"

  health_check {
    enabled             = true
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }
}

# ALB listener
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}
```

## Task Definition and Service

Define the ECS task and service that runs on the EC2 instances.

```hcl
# ECS Task Definition
resource "aws_ecs_task_definition" "app" {
  family                   = "production-app"
  network_mode             = "bridge"  # Bridge mode for EC2 launch type
  requires_compatibilities = ["EC2"]
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  cpu                      = 512
  memory                   = 1024

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
          hostPort      = 0  # Dynamic port mapping for bridge mode
          protocol      = "tcp"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
          "awslogs-region"        = "us-east-1"
          "awslogs-stream-prefix" = "app"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:80/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name = "production-app"
  }
}

# CloudWatch log group
resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/production-app"
  retention_in_days = 30
}

# ECS Service
resource "aws_ecs_service" "app" {
  name            = "production-app"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 3
  launch_type     = "EC2"

  # Rolling deployment configuration
  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  # Load balancer configuration
  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "app"
    container_port   = 80
  }

  # Placement strategy - spread across AZs
  ordered_placement_strategy {
    type  = "spread"
    field = "attribute:ecs.availability-zone"
  }

  ordered_placement_strategy {
    type  = "binpack"
    field = "memory"
  }

  depends_on = [aws_lb_listener.http]

  tags = {
    Name = "production-app-service"
  }
}
```

## Outputs

```hcl
output "cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "alb_dns_name" {
  value = aws_lb.main.dns_name
}

output "service_name" {
  value = aws_ecs_service.app.name
}
```

## Best Practices

When running ECS with EC2 launch type, use ECS-optimized AMIs that are regularly updated. Enable container insights for visibility into cluster performance. Use placement strategies to spread tasks across availability zones. Set up proper auto scaling for both the EC2 instances and the ECS services. Use dynamic port mapping with bridge networking to run multiple tasks per instance.

## Monitoring with OneUptime

Monitor your ECS cluster health, task states, and container performance with [OneUptime](https://oneuptime.com). Track service availability, container restarts, and resource utilization across your entire cluster from a single dashboard.

## Conclusion

ECS with EC2 launch type gives you the control of managing your own instances while letting ECS handle container orchestration. This combination is ideal for workloads that need specific instance types, custom AMIs, or cost optimization through spot instances. By defining the entire setup in Terraform, you get a reproducible, version-controlled infrastructure that can be deployed consistently across environments.

For more ECS topics, check out our guides on [ECS with service discovery](https://oneuptime.com/blog/post/2026-02-23-how-to-create-ecs-with-service-discovery-in-terraform/view) and [ECS with capacity providers](https://oneuptime.com/blog/post/2026-02-23-how-to-create-ecs-with-capacity-providers-in-terraform/view).
