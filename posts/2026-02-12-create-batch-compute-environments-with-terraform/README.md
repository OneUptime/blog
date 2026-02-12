# How to Create Batch Compute Environments with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, AWS Batch, Compute, HPC

Description: Learn how to set up AWS Batch compute environments, job queues, and job definitions using Terraform for scalable batch processing workloads.

---

AWS Batch takes the heavy lifting out of running batch computing jobs. Instead of managing your own cluster of EC2 instances or containers, you define what compute you need and AWS Batch handles provisioning, scaling, and scheduling. With Terraform, you can set up the entire pipeline - compute environments, job queues, and job definitions - as code.

This guide covers everything from basic Fargate-based compute environments to advanced EC2 setups with spot instances and GPU support.

## Architecture Overview

AWS Batch has three main components:

- **Compute Environment**: The pool of compute resources (EC2 instances or Fargate tasks)
- **Job Queue**: Where submitted jobs wait for compute capacity
- **Job Definition**: A template for your batch jobs (like a Docker Compose for batch)

```mermaid
graph LR
    A[Submit Job] --> B[Job Queue]
    B --> C[Scheduler]
    C --> D[Compute Environment]
    D --> E[EC2 / Fargate]
    E --> F[Job Execution]
```

## IAM Roles

AWS Batch needs several IAM roles. The service role lets Batch manage resources, and the execution role lets containers access AWS services:

```hcl
# Batch service role
resource "aws_iam_role" "batch_service" {
  name = "batch-service-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "batch.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "batch_service" {
  role       = aws_iam_role.batch_service.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBatchServiceRole"
}

# ECS task execution role (for Fargate and EC2 container jobs)
resource "aws_iam_role" "batch_execution" {
  name = "batch-execution-role"

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

resource "aws_iam_role_policy_attachment" "batch_execution" {
  role       = aws_iam_role.batch_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Job role - what your actual job code can access
resource "aws_iam_role" "batch_job" {
  name = "batch-job-role"

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

# Give jobs access to S3 for reading input and writing output
resource "aws_iam_role_policy" "batch_job_s3" {
  name = "batch-job-s3"
  role = aws_iam_role.batch_job.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket",
        ]
        Resource = [
          "arn:aws:s3:::${var.data_bucket}",
          "arn:aws:s3:::${var.data_bucket}/*",
        ]
      }
    ]
  })
}
```

## Fargate Compute Environment

Fargate is the simplest option - no EC2 instances to manage. Good for jobs that don't need GPUs or specific instance types:

```hcl
# Security group for Batch compute
resource "aws_security_group" "batch" {
  name_prefix = "batch-compute-"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "batch-compute-sg"
  }
}

# Fargate compute environment
resource "aws_batch_compute_environment" "fargate" {
  compute_environment_name = "fargate-compute"
  type                     = "MANAGED"
  state                    = "ENABLED"
  service_role             = aws_iam_role.batch_service.arn

  compute_resources {
    type      = "FARGATE"
    max_vcpus = 256

    security_group_ids = [aws_security_group.batch.id]
    subnets            = var.private_subnet_ids
  }

  tags = {
    Environment = var.environment
  }
}
```

With Fargate, you set `max_vcpus` and Batch scales automatically within that limit. You don't specify instance types because Fargate handles that.

## EC2 Compute Environment

For more control, use EC2. This lets you choose instance types, use spot instances, and attach GPUs:

```hcl
# Launch template for EC2 instances
resource "aws_launch_template" "batch" {
  name_prefix = "batch-"

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size = 100
      volume_type = "gp3"
      encrypted   = true
    }
  }

  user_data = base64encode(<<-EOF
    MIME-Version: 1.0
    Content-Type: multipart/mixed; boundary="==BOUNDARY=="

    --==BOUNDARY==
    Content-Type: text/x-shellscript; charset="us-ascii"

    #!/bin/bash
    # Increase Docker storage
    echo '{"storage-driver": "overlay2"}' > /etc/docker/daemon.json
    systemctl restart docker

    --==BOUNDARY==--
    EOF
  )
}

# EC2 compute environment with spot instances
resource "aws_batch_compute_environment" "ec2_spot" {
  compute_environment_name = "ec2-spot-compute"
  type                     = "MANAGED"
  state                    = "ENABLED"
  service_role             = aws_iam_role.batch_service.arn

  compute_resources {
    type                = "SPOT"
    allocation_strategy = "SPOT_PRICE_CAPACITY_OPTIMIZED"
    bid_percentage      = 60  # max 60% of on-demand price

    min_vcpus = 0
    max_vcpus = 512
    desired_vcpus = 0

    instance_type = [
      "c6i.xlarge",
      "c6i.2xlarge",
      "c5.xlarge",
      "c5.2xlarge",
      "m6i.xlarge",
      "m6i.2xlarge",
    ]

    security_group_ids = [aws_security_group.batch.id]
    subnets            = var.private_subnet_ids

    launch_template {
      launch_template_id = aws_launch_template.batch.id
      version            = "$Latest"
    }

    spot_iam_fleet_role = aws_iam_role.spot_fleet.arn

    ec2_configuration {
      image_type = "ECS_AL2023"
    }

    tags = {
      Name = "batch-compute-instance"
    }
  }

  tags = {
    Environment = var.environment
  }
}
```

Listing multiple instance types with `SPOT_PRICE_CAPACITY_OPTIMIZED` gives Batch the flexibility to choose the cheapest available capacity. Setting `min_vcpus = 0` means Batch scales to zero when there are no jobs, which saves money.

## GPU Compute Environment

For machine learning or rendering jobs that need GPUs:

```hcl
# GPU compute environment
resource "aws_batch_compute_environment" "gpu" {
  compute_environment_name = "gpu-compute"
  type                     = "MANAGED"
  state                    = "ENABLED"
  service_role             = aws_iam_role.batch_service.arn

  compute_resources {
    type                = "EC2"
    allocation_strategy = "BEST_FIT_PROGRESSIVE"

    min_vcpus     = 0
    max_vcpus     = 128
    desired_vcpus = 0

    instance_type = [
      "g5.xlarge",
      "g5.2xlarge",
      "p3.2xlarge",
    ]

    security_group_ids = [aws_security_group.batch.id]
    subnets            = var.private_subnet_ids

    ec2_configuration {
      image_type = "ECS_AL2_NVIDIA"
    }
  }
}
```

The `ECS_AL2_NVIDIA` image type includes NVIDIA drivers pre-installed.

## Job Queue

Job queues connect to compute environments and have a priority:

```hcl
# High priority queue - uses on-demand EC2
resource "aws_batch_job_queue" "high_priority" {
  name     = "high-priority-queue"
  state    = "ENABLED"
  priority = 10

  compute_environment_order {
    order               = 1
    compute_environment = aws_batch_compute_environment.fargate.arn
  }
}

# Low priority queue - uses spot instances
resource "aws_batch_job_queue" "low_priority" {
  name     = "low-priority-queue"
  state    = "ENABLED"
  priority = 1

  compute_environment_order {
    order               = 1
    compute_environment = aws_batch_compute_environment.ec2_spot.arn
  }
}
```

When multiple queues share a compute environment, jobs from higher priority queues run first.

## Job Definition

The job definition is a template for your actual batch jobs:

```hcl
# Fargate job definition
resource "aws_batch_job_definition" "data_processing" {
  name = "data-processing"
  type = "container"

  platform_capabilities = ["FARGATE"]

  container_properties = jsonencode({
    image   = "${var.ecr_repo_url}:latest"
    command = ["python", "process.py", "Ref::input_path"]

    fargatePlatformConfiguration = {
      platformVersion = "LATEST"
    }

    resourceRequirements = [
      { type = "VCPU", value = "4" },
      { type = "MEMORY", value = "8192" },
    ]

    executionRoleArn = aws_iam_role.batch_execution.arn
    jobRoleArn       = aws_iam_role.batch_job.arn

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.batch.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "data-processing"
      }
    }

    environment = [
      { name = "OUTPUT_BUCKET", value = var.data_bucket },
    ]
  })

  retry_strategy {
    attempts = 3

    evaluate_on_exit {
      action       = "RETRY"
      on_reason    = "Host EC2*"
      on_exit_code = "*"
    }

    evaluate_on_exit {
      action       = "EXIT"
      on_exit_code = "0"
    }
  }

  timeout {
    attempt_duration_seconds = 3600  # 1 hour max
  }

  tags = {
    Environment = var.environment
  }
}
```

The retry strategy is important - it automatically retries jobs that fail due to host issues (like spot termination) while letting jobs that succeed exit cleanly.

## Logging

```hcl
resource "aws_cloudwatch_log_group" "batch" {
  name              = "/aws/batch/jobs"
  retention_in_days = 14
}
```

## Summary

With this setup, you have a flexible batch processing infrastructure that can handle everything from lightweight data processing on Fargate to GPU-intensive ML training on EC2. The spot compute environment keeps costs down for non-urgent jobs, while the Fargate environment gives you simplicity for lighter workloads. Package your code in Docker images, push to ECR, and submit jobs to the queue.

For monitoring job success rates and processing times, see our guide on [observability for AWS workloads](https://oneuptime.com/blog/post/monitor-aws-infrastructure/view).
