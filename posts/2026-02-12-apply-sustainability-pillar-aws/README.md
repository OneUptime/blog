# How to Apply the Sustainability Pillar on AWS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Well-Architected, Sustainability, Green Computing

Description: How to implement the Sustainability pillar of the AWS Well-Architected Framework to minimize environmental impact of your cloud workloads through efficient resource usage.

---

The Sustainability pillar is the newest addition to the AWS Well-Architected Framework, and it addresses something that matters more each year: the environmental impact of running cloud workloads. AWS data centers consume enormous amounts of energy, and while AWS is investing heavily in renewable energy, how you architect your workloads directly affects your carbon footprint. Efficient workloads use less compute, less storage, and less network bandwidth, which translates to less energy consumed.

The good news is that many sustainability best practices also save money. Right-sizing, efficient code, and minimizing waste are good for your budget and for the planet.

## Design Principles

The Sustainability pillar has six design principles:

1. Understand your impact
2. Establish sustainability goals
3. Maximize utilization
4. Anticipate and adopt new, more efficient hardware and software offerings
5. Use managed services
6. Reduce the downstream impact of your cloud workloads

## Understanding Your Impact

Start by measuring your current carbon footprint using the AWS Customer Carbon Footprint Tool, available in the AWS Billing console. It shows emissions broken down by service and region.

You can also track resource utilization as a proxy for efficiency:

```hcl
# CloudWatch dashboard for resource utilization
resource "aws_cloudwatch_dashboard" "sustainability" {
  dashboard_name = "sustainability-metrics"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title   = "EC2 CPU Utilization (higher is more efficient)"
          metrics = [
            ["AWS/EC2", "CPUUtilization", "AutoScalingGroupName", "app-asg", { stat = "Average" }]
          ]
          period  = 3600
          view    = "timeSeries"
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title   = "Lambda Concurrent Executions vs Provisioned"
          metrics = [
            ["AWS/Lambda", "ConcurrentExecutions", "FunctionName", "api-handler"],
            ["AWS/Lambda", "ProvisionedConcurrentExecutions", "FunctionName", "api-handler"]
          ]
          period  = 3600
          view    = "timeSeries"
        }
      }
    ]
  })
}
```

## Maximize Utilization

Underutilized resources waste energy. A server running at 10% CPU uses almost as much power as one running at 50%.

**Right-size aggressively:**

```hcl
# Use auto-scaling to match capacity to demand
resource "aws_autoscaling_group" "app" {
  name                = "app-asg"
  min_size            = 1
  max_size            = 20
  vpc_zone_identifier = var.private_subnet_ids

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }
}

# Scale based on actual utilization
resource "aws_autoscaling_policy" "target_tracking" {
  name                   = "cpu-utilization"
  autoscaling_group_name = aws_autoscaling_group.app.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = 70.0  # aim for 70% utilization
  }
}
```

Setting the target CPU utilization to 70% (instead of the more common 40-50%) means fewer instances running more efficiently. Combine this with responsive scaling to handle demand spikes.

**Schedule non-production environments:**

```hcl
# Scale down dev environments at night and on weekends
resource "aws_autoscaling_schedule" "scale_down_night" {
  scheduled_action_name  = "scale-down-night"
  autoscaling_group_name = aws_autoscaling_group.dev.name
  min_size               = 0
  max_size               = 0
  desired_capacity       = 0
  recurrence             = "0 19 * * MON-FRI"
  time_zone              = "America/New_York"
}

resource "aws_autoscaling_schedule" "scale_up_morning" {
  scheduled_action_name  = "scale-up-morning"
  autoscaling_group_name = aws_autoscaling_group.dev.name
  min_size               = 1
  max_size               = 3
  desired_capacity       = 1
  recurrence             = "0 7 * * MON-FRI"
  time_zone              = "America/New_York"
}

resource "aws_autoscaling_schedule" "scale_down_weekend" {
  scheduled_action_name  = "scale-down-weekend"
  autoscaling_group_name = aws_autoscaling_group.dev.name
  min_size               = 0
  max_size               = 0
  desired_capacity       = 0
  recurrence             = "0 19 * * FRI"
  time_zone              = "America/New_York"
}
```

## Choose Efficient Hardware

AWS Graviton processors (ARM-based) deliver better performance per watt than x86 processors. They use up to 60% less energy for the same workload.

```hcl
# Use Graviton instances wherever possible
resource "aws_launch_template" "app" {
  name_prefix   = "app-"
  image_id      = var.graviton_ami_id  # ARM-based AMI
  instance_type = "m7g.large"          # Graviton3

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name       = "app-graviton"
      Processor  = "graviton3"
    }
  }
}

# Graviton-based RDS
resource "aws_db_instance" "main" {
  identifier     = "app-db"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r7g.large"  # Graviton3 database instance

  multi_az          = true
  storage_encrypted = true
}

# Graviton-based ElastiCache
resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "app-cache"
  description          = "App cache cluster"
  node_type            = "cache.r7g.medium"  # Graviton3
  num_cache_clusters   = 2
  engine               = "redis"
}

# ARM-based Lambda functions
resource "aws_lambda_function" "api" {
  function_name = "api-handler"
  runtime       = "nodejs20.x"
  handler       = "index.handler"
  architectures = ["arm64"]  # Graviton2
  memory_size   = 512
}
```

Switching from x86 to Graviton often requires zero code changes for interpreted languages (Python, Node.js, Java) and a recompile for compiled languages (Go, Rust).

## Use Managed and Serverless Services

Managed services run on shared infrastructure that AWS optimizes for efficiency. They're more energy-efficient per unit of work than self-managed alternatives.

```hcl
# Fargate instead of self-managed EC2 for containers
resource "aws_ecs_service" "app" {
  name            = "app"
  cluster         = aws_ecs_cluster.main.id
  launch_type     = "FARGATE"
  desired_count   = 2
  task_definition = aws_ecs_task_definition.app.arn

  network_configuration {
    subnets         = var.private_subnet_ids
    security_groups = [aws_security_group.app.id]
  }
}

# DynamoDB on-demand instead of always-on databases for variable workloads
resource "aws_dynamodb_table" "sessions" {
  name         = "user-sessions"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "session_id"

  attribute {
    name = "session_id"
    type = "S"
  }

  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }
}
```

DynamoDB's TTL feature automatically deletes expired items, reducing storage without requiring cleanup jobs.

## Minimize Data Storage and Transfer

Every byte stored and transferred consumes energy:

**Use S3 lifecycle policies to move data to efficient storage tiers:**

```hcl
resource "aws_s3_bucket_lifecycle_configuration" "efficient" {
  bucket = aws_s3_bucket.data.id

  rule {
    id     = "optimize-storage"
    status = "Enabled"

    # Move infrequently accessed data to cheaper, more efficient storage
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER_IR"  # instant retrieval, lower carbon
    }

    transition {
      days          = 180
      storage_class = "DEEP_ARCHIVE"
    }

    # Delete data you no longer need
    expiration {
      days = 730  # 2 years
    }
  }
}
```

**Compress data in transit and at rest:**

```hcl
# Enable CloudFront compression
resource "aws_cloudfront_distribution" "main" {
  enabled = true

  default_cache_behavior {
    compress = true  # enables gzip and brotli compression
    # This reduces bytes transferred by 60-80% for text content

    target_origin_id       = "origin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = data.aws_cloudfront_cache_policy.caching_optimized.id
  }

  origin {
    domain_name = aws_lb.main.dns_name
    origin_id   = "origin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
```

## Choose Efficient Regions

AWS regions differ in their carbon intensity based on the local power grid. Regions powered by more renewable energy have a lower carbon footprint. As of recent data, regions like eu-north-1 (Stockholm), eu-west-1 (Ireland), and ca-central-1 (Canada) tend to have lower carbon intensity.

If your workload doesn't have strict latency requirements, consider deploying in a greener region:

```hcl
provider "aws" {
  region = "eu-north-1"  # Stockholm - powered largely by renewable energy
}
```

## Efficient Application Code

This goes beyond infrastructure, but it matters. Efficient code runs faster, which means less compute time and less energy:

- Use connection pooling for database connections
- Implement caching to avoid redundant computations
- Batch operations instead of making individual API calls
- Use efficient serialization formats (Protocol Buffers over JSON for high-volume services)
- Optimize database queries to minimize full table scans

## Summary

Sustainability on AWS starts with the basics: right-size your resources, use Graviton processors, leverage managed services, and clean up what you don't need. These practices reduce your environmental impact while also reducing costs - a rare win-win in engineering tradeoffs. Measure your utilization rates, track your carbon footprint with the AWS Customer Carbon Footprint Tool, and make sustainability a regular part of your architecture reviews.

For monitoring resource utilization and identifying inefficiencies, check out our post on [AWS infrastructure monitoring](https://oneuptime.com/blog/post/monitor-aws-infrastructure/view).
